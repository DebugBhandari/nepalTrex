import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth-options';
import { query } from '../../../lib/db';

const ADMIN_ALLOWED_STATUSES = new Set(['accepted', 'completed', 'declined']);
const USER_ALLOWED_STATUSES = new Set(['cancelled']);

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Authentication required' });

  const { id } = req.query;
  const { status } = req.body || {};
  const role = session.user.role || 'user';
  const isAdminLike = ['admin', 'superUser'].includes(role);

  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Invalid order id' });

  if (isAdminLike) {
    if (!ADMIN_ALLOWED_STATUSES.has(status)) {
      return res.status(400).json({ error: 'status must be accepted, completed or declined' });
    }
  } else {
    if (!USER_ALLOWED_STATUSES.has(status)) {
      return res.status(403).json({ error: 'Users can only cancel orders' });
    }
  }

  const isSuper = role === 'superUser';
  const ownerCheck = isAdminLike
    ? isSuper
      ? await query(
          `
            SELECT o.id, o.order_group_id, o.status
            FROM orders o
            WHERE o.id::text = $1 OR o.order_group_id::text = $1
            ORDER BY o.created_at ASC
            LIMIT 1
          `,
          [id]
        )
      : await query(
          `
            SELECT o.id, o.order_group_id, o.status
            FROM orders o
            JOIN stays s ON s.id = o.stay_id
            WHERE (o.id::text = $1 OR o.order_group_id::text = $1)
              AND s.owner_user_id = $2
            ORDER BY o.created_at ASC
            LIMIT 1
          `,
          [id, session.user.id]
        )
    : await query(
        `
          SELECT o.id, o.order_group_id, o.status
          FROM orders o
          WHERE (o.id::text = $1 OR o.order_group_id::text = $1)
            AND LOWER(COALESCE(o.customer_email, '')) = LOWER($2)
          ORDER BY o.created_at ASC
          LIMIT 1
        `,
        [id, (session.user.email || '').toString().trim()]
      );

  if (ownerCheck.rows.length === 0) return res.status(404).json({ error: 'Order not found' });

  const targetGroupId = ownerCheck.rows[0].order_group_id || ownerCheck.rows[0].id;

  const groupedStatus = await query(
    `
      SELECT
        COUNT(*)::int AS item_count,
        BOOL_OR(status = 'completed') AS has_completed,
        SUM(total_price)::numeric AS group_total
      FROM orders
      WHERE COALESCE(order_group_id::text, id::text) = $1
    `,
    [String(targetGroupId)]
  );

  if (groupedStatus.rows[0]?.has_completed) {
    return res.status(400).json({ error: 'Completed orders cannot be changed' });
  }

  const updateResult = await query(
    `
      UPDATE orders
      SET status = $1
      WHERE COALESCE(order_group_id::text, id::text) = $2
      RETURNING id
    `,
    [status, String(targetGroupId)]
  );

  return res.status(200).json({
    order: {
      id: String(targetGroupId),
      status,
      itemCount: updateResult.rowCount,
      totalPrice: groupedStatus.rows[0]?.group_total || 0,
    },
  });
}
