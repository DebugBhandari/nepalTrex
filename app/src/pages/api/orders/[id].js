import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth-options';
import { query } from '../../../lib/db';

const ALLOWED_STATUSES = new Set(['accepted', 'completed']);

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Authentication required' });
  if (!['admin', 'superUser'].includes(session.user.role)) return res.status(403).json({ error: 'Forbidden' });

  const { id } = req.query;
  const { status } = req.body || {};

  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Invalid order id' });
  if (!ALLOWED_STATUSES.has(status)) return res.status(400).json({ error: 'status must be accepted or completed' });

  const isSuper = session.user.role === 'superUser';

  // For admins, verify the order belongs to a stay they own
  const ownerCheck = isSuper
    ? await query(`SELECT o.id, o.status FROM orders o WHERE o.id = $1 LIMIT 1`, [id])
    : await query(
        `SELECT o.id, o.status FROM orders o JOIN stays s ON s.id = o.stay_id WHERE o.id = $1 AND s.owner_user_id = $2 LIMIT 1`,
        [id, session.user.id]
      );

  if (ownerCheck.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
  if (ownerCheck.rows[0].status === 'completed') return res.status(400).json({ error: 'Completed orders cannot be changed' });

  const result = await query(
    `UPDATE orders SET status = $1 WHERE id = $2 RETURNING id, status`,
    [status, id]
  );

  return res.status(200).json({ order: result.rows[0] });
}
