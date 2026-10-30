import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth-options';
import { pool } from '../../../lib/db';
import { CUSTOMER_RESERVATION_STATUSES, HOST_RESERVATION_STATUSES } from '../../../lib/reservations';

function requestError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export default async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Authentication required' });

  const { id } = req.query;
  const { status, hostNote } = req.body || {};
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Invalid reservation id' });

  const isHost = ['admin', 'superUser'].includes(session.user.role || '');
  const permittedStatuses = isHost ? HOST_RESERVATION_STATUSES : CUSTOMER_RESERVATION_STATUSES;
  if (!permittedStatuses.has(status)) return res.status(403).json({ error: 'This reservation status change is not permitted' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `
        SELECT r.*, s.owner_user_id
        FROM reservations r
        JOIN stays s ON s.id = r.stay_id
        WHERE r.id = $1
        FOR UPDATE
      `,
      [id]
    );
    const reservation = result.rows[0];
    if (!reservation) throw requestError('Reservation not found', 404);

    const isSuperUser = session.user.role === 'superUser';
    if (isHost ? !isSuperUser && reservation.owner_user_id !== session.user.id : reservation.customer_user_id !== session.user.id) {
      throw requestError('Reservation not found', 404);
    }
    if (['declined', 'cancelled', 'completed'].includes(reservation.status)) {
      throw requestError('This reservation can no longer be changed', 400);
    }
    if (reservation.status === 'pending' && new Date(reservation.hold_expires_at) <= new Date()) {
      throw requestError('This reservation request has expired', 400);
    }
    if (status === 'completed' && reservation.status !== 'confirmed') {
      throw requestError('Only confirmed reservations can be completed', 400);
    }
    if (isHost && ['confirmed', 'declined'].includes(status) && reservation.status !== 'pending') {
      throw requestError('Only pending reservation requests can be confirmed or declined', 400);
    }

    const updateResult = await client.query(
      `
        UPDATE reservations
        SET status = $1,
            host_note = CASE WHEN $2::text IS NULL THEN host_note ELSE $2 END,
            accepted_at = CASE WHEN $1 = 'confirmed' THEN NOW() ELSE accepted_at END,
            declined_at = CASE WHEN $1 = 'declined' THEN NOW() ELSE declined_at END,
            cancelled_at = CASE WHEN $1 = 'cancelled' THEN NOW() ELSE cancelled_at END,
            completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE completed_at END,
            updated_at = NOW()
        WHERE id = $3
        RETURNING id, status, updated_at
      `,
      [status, isHost && typeof hostNote === 'string' ? hostNote.trim() || null : null, id]
    );
    await client.query(
      `INSERT INTO reservation_events (reservation_id, actor_user_id, event_type, previous_status, next_status, note) VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, session.user.id, isHost ? 'host_status_updated' : 'customer_cancelled', reservation.status, status, isHost && typeof hostNote === 'string' ? hostNote.trim() || null : null]
    );
    await client.query('COMMIT');

    return res.status(200).json({ reservation: updateResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to update reservation' });
  } finally {
    client.release();
  }
}