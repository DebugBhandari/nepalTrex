import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth-options';
import { query } from '../../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { id } = req.query;

  // Parse the id parameter - it could be userId, email, or handle
  let userEmail = null;
  let userId = null;

  // If the id looks like a UUID, search by user id; otherwise treat as email or handle
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(String(id).toLowerCase());

  if (isUuid) {
    userId = id;
  } else {
    // Try fetching user by email first, then by handle
    const result = await query(
      `SELECT id, email FROM users WHERE email = $1 OR username = $1 OR "handle" = $1 LIMIT 1`,
      [id]
    );

    if (result.rows.length > 0) {
      userEmail = result.rows[0].email;
      userId = result.rows[0].id;
    }
  }

  if (!userId && !userEmail) {
    return res.status(404).json({ error: 'User not found' });
  }

  try {
    // Get all orders where the customer email matches the user's email
    const result = await query(
      `SELECT o.id, o.order_group_id, o.menu_item_name, o.menu_item_category, o.unit_price, o.quantity, o.total_price, o.customer_name, o.customer_email, o.customer_phone, o.notes, o.status, o.created_at, s.name AS stay_name, s.id AS stay_id
       FROM orders o JOIN stays s ON s.id = o.stay_id
       WHERE o.customer_email = $1
       ORDER BY o.created_at DESC`,
      [userEmail || '']
    );

    // Group orders by order_group_id
    const groupedOrders = new Map();

    for (const row of result.rows) {
      const groupId = row.order_group_id || row.id;
      const groupKey = String(groupId);

      if (!groupedOrders.has(groupKey)) {
        groupedOrders.set(groupKey, {
          id: groupKey,
          orderGroupId: row.order_group_id || null,
          stayId: row.stay_id,
          stayName: row.stay_name,
          customerName: row.customer_name,
          customerEmail: row.customer_email || '',
          customerPhone: row.customer_phone || '',
          notes: row.notes || '',
          createdAt: row.created_at,
          status: row.status,
          totalPrice: 0,
          quantity: 0,
          items: [],
        });
      }

      const group = groupedOrders.get(groupKey);
      group.items.push({
        id: row.id,
        menuItemName: row.menu_item_name,
        menuItemCategory: row.menu_item_category,
        unitPrice: Number(row.unit_price),
        quantity: Number(row.quantity),
        totalPrice: Number(row.total_price),
        status: row.status,
      });
      group.totalPrice += Number(row.total_price);
      group.quantity += Number(row.quantity);

      if (row.status === 'completed') {
        group.status = 'completed';
      } else if (row.status === 'accepted' && group.status === 'pending') {
        group.status = 'accepted';
      }
    }

    return res.status(200).json({
      orders: Array.from(groupedOrders.values()),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to fetch user orders' });
  }
}
