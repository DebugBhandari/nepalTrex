import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth-options';
import { query } from '../../../lib/db';
import { serializeReservation } from '../../../lib/reservations';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Authentication required' });

  try {
    const result = await query(
      `
        SELECT r.*, s.name AS stay_name, s.slug AS stay_slug, s.location AS stay_location,
          COALESCE(
            json_agg(json_build_object('roomId', ri.room_id, 'roomName', ri.room_name, 'nightlyPrice', ri.nightly_price, 'units', ri.units))
            FILTER (WHERE ri.id IS NOT NULL),
            '[]'::json
          ) AS items
        FROM reservations r
        JOIN stays s ON s.id = r.stay_id
        LEFT JOIN reservation_items ri ON ri.reservation_id = r.id
        WHERE r.customer_user_id = $1
        GROUP BY r.id, s.id
        ORDER BY r.created_at DESC
      `,
      [session.user.id]
    );

    return res.status(200).json({ reservations: result.rows.map(serializeReservation) });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to fetch reservations' });
  }
}