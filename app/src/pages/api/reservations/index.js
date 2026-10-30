import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth-options';
import { pool, query } from '../../../lib/db';
import { MAX_RESERVATION_UNITS, parseReservationDates, serializeReservation } from '../../../lib/reservations';

const HOLD_INTERVAL = '24 hours';

async function getCustomerDetails(userId, fallbackName, fallbackEmail) {
  const result = await query(
    `SELECT display_name, username, email FROM users WHERE id = $1 LIMIT 1`,
    [userId]
  );
  const user = result.rows[0];
  return {
    name: user?.display_name || user?.username || fallbackName || '',
    email: user?.email || fallbackEmail || '',
  };
}

async function listReservationsForHost(userId, isSuperUser) {
  const result = await query(
    `
      SELECT r.*, s.name AS stay_name, s.slug AS stay_slug, s.location AS stay_location,
        COALESCE(
          json_agg(json_build_object('roomId', ri.room_id, 'roomName', ri.room_name, 'nightlyPrice', ri.nightly_price, 'units', ri.units))
          FILTER (WHERE ri.id IS NOT NULL),
          '[]'::json
        ) AS items,
        COALESCE(
          (
            SELECT json_agg(json_build_object(
              'id', re.id, 'eventType', re.event_type, 'previousStatus', re.previous_status,
              'nextStatus', re.next_status, 'note', re.note, 'createdAt', re.created_at,
              'actorName', COALESCE(re.actor_name, NULLIF(u.display_name, ''), NULLIF(u.username, ''), split_part(u.email, '@', 1), 'System'),
              'actorRole', COALESCE(re.actor_role, u.role, '')
            ) ORDER BY re.created_at ASC)
            FROM reservation_events re
            LEFT JOIN users u ON u.id = re.actor_user_id
            WHERE re.reservation_id = r.id
          ),
          '[]'::json
        ) AS events
      FROM reservations r
      JOIN stays s ON s.id = r.stay_id
      LEFT JOIN reservation_items ri ON ri.reservation_id = r.id
      ${isSuperUser ? '' : 'WHERE s.owner_user_id = $1'}
      GROUP BY r.id, s.id
      ORDER BY r.created_at DESC
    `,
    isSuperUser ? [] : [userId]
  );
  return result.rows.map(serializeReservation);
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Authentication required' });

  if (req.method === 'GET') {
    if (!['admin', 'superUser'].includes(session.user.role || '')) {
      return res.status(403).json({ error: 'Only stay partners can view reservation requests' });
    }

    try {
      const reservations = await listReservationsForHost(session.user.id, session.user.role === 'superUser');
      return res.status(200).json({ reservations });
    } catch (error) {
      return res.status(500).json({ error: error.message || 'Failed to fetch reservations' });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    stayId,
    roomId,
    checkInDate,
    checkOutDate,
    guestCount,
    units = 1,
    customerName,
    customerEmail,
    customerPhone,
    guestNotes,
  } = req.body || {};

  const dates = parseReservationDates(checkInDate, checkOutDate);
  const normalizedGuestCount = Number(guestCount);
  const normalizedUnits = Number(units);
  const normalizedPhone = String(customerPhone || '').trim();

  if (!stayId || !roomId || !dates) {
    return res.status(400).json({ error: `A stay, room, and date range of 1 to 30 nights are required` });
  }
  if (!Number.isInteger(normalizedGuestCount) || normalizedGuestCount < 1 || normalizedGuestCount > 30) {
    return res.status(400).json({ error: 'guestCount must be between 1 and 30' });
  }
  if (!Number.isInteger(normalizedUnits) || normalizedUnits < 1 || normalizedUnits > MAX_RESERVATION_UNITS) {
    return res.status(400).json({ error: `units must be between 1 and ${MAX_RESERVATION_UNITS}` });
  }
  if (!normalizedPhone || normalizedPhone.length > 64) {
    return res.status(400).json({ error: 'A valid phone number is required' });
  }

  try {
    const customer = await getCustomerDetails(session.user.id, String(customerName || '').trim(), String(customerEmail || '').trim());
    if (!customer.name) return res.status(400).json({ error: 'A customer name is required' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const roomResult = await client.query(
        `
          SELECT id, stay_id, name, price_per_night, capacity, total_units
          FROM rooms
          WHERE id = $1 AND stay_id = $2 AND is_active = true
          FOR UPDATE
        `,
        [roomId, stayId]
      );
      const room = roomResult.rows[0];
      if (!room) {
        const error = new Error('This room is no longer available at the selected stay');
        error.statusCode = 409;
        throw error;
      }
      if (normalizedGuestCount > Number(room.capacity) * normalizedUnits) {
        const error = new Error(`This room can host up to ${Number(room.capacity) * normalizedUnits} guests for the selected quantity`);
        error.statusCode = 400;
        throw error;
      }

      await client.query(
        `
          UPDATE reservations
          SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
          WHERE status = 'pending' AND hold_expires_at <= NOW()
            AND id IN (SELECT reservation_id FROM reservation_items WHERE room_id = $1)
        `,
        [room.id]
      );

      const occupancyResult = await client.query(
        `
          SELECT COALESCE(SUM(ri.units), 0)::int AS reserved_units
          FROM reservations r
          JOIN reservation_items ri ON ri.reservation_id = r.id
          WHERE ri.room_id = $1
            AND r.check_in_date < $3::date
            AND r.check_out_date > $2::date
            AND (
              r.status = 'confirmed'
              OR (r.status = 'pending' AND r.hold_expires_at > NOW())
            )
        `,
        [room.id, dates.checkInDate, dates.checkOutDate]
      );
      const occupiedUnits = Number(occupancyResult.rows[0]?.reserved_units || 0);
      if (occupiedUnits + normalizedUnits > Number(room.total_units)) {
        const error = new Error('This room is no longer available for the selected dates');
        error.statusCode = 409;
        throw error;
      }

      const totalPrice = Number(room.price_per_night) * dates.nights * normalizedUnits;
      const reservationResult = await client.query(
        `
          INSERT INTO reservations (
            stay_id, customer_user_id, check_in_date, check_out_date, guest_count,
            customer_name, customer_email, customer_phone, guest_notes, hold_expires_at, total_price
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW() + $10::interval, $11)
          RETURNING *
        `,
        [stayId, session.user.id, dates.checkInDate, dates.checkOutDate, normalizedGuestCount, customer.name, customer.email || null, normalizedPhone, String(guestNotes || '').trim() || null, HOLD_INTERVAL, totalPrice]
      );
      const reservation = reservationResult.rows[0];

      await client.query(
        `INSERT INTO reservation_items (reservation_id, room_id, room_name, nightly_price, units) VALUES ($1, $2, $3, $4, $5)`,
        [reservation.id, room.id, room.name, room.price_per_night, normalizedUnits]
      );
      await client.query(
        `
          INSERT INTO reservation_events (
            reservation_id, actor_user_id, actor_name, actor_role, event_type, next_status
          )
          SELECT $1, u.id, COALESCE(NULLIF(u.display_name, ''), NULLIF(u.username, ''), split_part(u.email, '@', 1)), u.role, 'requested', 'pending'
          FROM users u
          WHERE u.id = $2
        `,
        [reservation.id, session.user.id]
      );

      await client.query('COMMIT');
      return res.status(201).json({
        reservation: serializeReservation({
          ...reservation,
          stay_name: null,
          stay_slug: null,
          stay_location: null,
          items: [{ roomId: room.id, roomName: room.name, nightlyPrice: room.price_per_night, units: normalizedUnits }],
        }),
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to request reservation' });
  }
}