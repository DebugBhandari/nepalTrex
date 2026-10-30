import { randomUUID } from 'crypto';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth-options';
import { pool, query } from '../../../lib/db';

const MAX_ORDER_ITEM_QUANTITY = 20;

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) return res.status(401).json({ error: 'Authentication required' });
    if (!['admin', 'superUser'].includes(session.user.role)) return res.status(403).json({ error: 'Forbidden' });

    const isSuper = session.user.role === 'superUser';
    const result = isSuper
      ? await query(
          `SELECT o.id, o.order_group_id, o.menu_item_name, o.menu_item_category, o.unit_price, o.quantity, o.total_price, o.customer_name, o.customer_email, o.customer_phone, o.notes, o.status, o.created_at, s.name AS stay_name, s.id AS stay_id,
                  owner.email AS owner_email, owner.display_name AS owner_display_name, owner.username AS owner_username
           FROM orders o
           JOIN stays s ON s.id = o.stay_id
           JOIN users owner ON owner.id = s.owner_user_id
           ORDER BY o.created_at DESC`
        )
      : await query(
          `SELECT o.id, o.order_group_id, o.menu_item_name, o.menu_item_category, o.unit_price, o.quantity, o.total_price, o.customer_name, o.customer_email, o.customer_phone, o.notes, o.status, o.created_at, s.name AS stay_name, s.id AS stay_id,
                  owner.email AS owner_email, owner.display_name AS owner_display_name, owner.username AS owner_username
           FROM orders o
           JOIN stays s ON s.id = o.stay_id
           JOIN users owner ON owner.id = s.owner_user_id
           WHERE s.owner_user_id = $1
           ORDER BY o.created_at DESC`,
          [session.user.id]
        );

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
          createdBy: row.customer_name || row.customer_email || 'Unknown',
          assignedTo: row.owner_display_name || row.owner_username || row.owner_email || 'Unassigned',
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
      } else if (row.status === 'declined' && !['completed'].includes(group.status)) {
        group.status = 'declined';
      } else if (row.status === 'cancelled' && !['completed', 'declined'].includes(group.status)) {
        group.status = 'cancelled';
      } else if (row.status === 'accepted' && group.status === 'pending') {
        group.status = 'accepted';
      }
    }

    return res.status(200).json({
      orders: Array.from(groupedOrders.values()),
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    stayId,
    items,
    customerName,
    customerEmail,
    customerPhone,
    notes,
  } = req.body || {};

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  let resolvedCustomerName = customerName;
  let resolvedCustomerEmail = customerEmail;

  const userResult = await query(
    `
      SELECT display_name, username, email
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [session.user.id]
  );

  if (userResult.rows.length > 0) {
    const row = userResult.rows[0];
    resolvedCustomerName = row.display_name || row.username || session.user.name || customerName;
    resolvedCustomerEmail = row.email || session.user.email || customerEmail;
  }

  if (!stayId || !resolvedCustomerName) {
    return res.status(400).json({ error: 'Missing required booking fields' });
  }

  const normalizedItems = Array.isArray(items) && items.length > 0
    ? items
        .map((item) => ({
          menuItemId: (item?.menuItemId || '').toString().trim(),
          quantity: Number(item?.quantity),
        }))
        .filter((item) => item.menuItemId)
    : [];

  if (normalizedItems.length === 0) {
    return res.status(400).json({ error: 'At least one valid order item is required' });
  }

  for (const item of normalizedItems) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0 || item.quantity > MAX_ORDER_ITEM_QUANTITY) {
      return res.status(400).json({ error: `Item quantity must be between 1 and ${MAX_ORDER_ITEM_QUANTITY}` });
    }
  }

  try {
    const stayExists = await query(
      `
        SELECT id
        FROM stays
        WHERE id = $1
        LIMIT 1
      `,
      [stayId]
    );

    if (stayExists.rows.length === 0) {
      return res.status(404).json({ error: 'Stay not found' });
    }

    const orderGroupId = randomUUID();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const requestedItemsById = new Map();
      for (const item of normalizedItems) {
        const totalQuantity = (requestedItemsById.get(item.menuItemId) || 0) + item.quantity;
        if (totalQuantity > MAX_ORDER_ITEM_QUANTITY) {
          const error = new Error(`Item quantity must be between 1 and ${MAX_ORDER_ITEM_QUANTITY}`);
          error.statusCode = 400;
          throw error;
        }
        requestedItemsById.set(item.menuItemId, totalQuantity);
      }

      const menuItemIds = Array.from(requestedItemsById.keys());
      const menuItemsResult = await client.query(
        `
          SELECT id, name, category, price, available
          FROM menu_items
          WHERE stay_id = $1 AND id = ANY($2::uuid[])
          FOR UPDATE
        `,
        [stayId, menuItemIds]
      );

      if (menuItemsResult.rows.length !== menuItemIds.length) {
        const error = new Error('One or more selected items are no longer offered by this stay');
        error.statusCode = 409;
        throw error;
      }

      const unavailableItem = menuItemsResult.rows.find((item) => !item.available);
      if (unavailableItem) {
        const error = new Error(`${unavailableItem.name} is currently unavailable`);
        error.statusCode = 409;
        throw error;
      }

      const createdOrders = [];

      for (const item of menuItemsResult.rows) {
        const itemQuantity = requestedItemsById.get(item.id);
        const result = await client.query(
          `
            INSERT INTO orders (
              order_group_id,
              stay_id,
              customer_user_id,
              menu_item_id,
              menu_item_name,
              menu_item_category,
              unit_price,
              quantity,
              total_price,
              customer_name,
              customer_email,
              customer_phone,
              notes
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id, status, created_at
          `,
          [
            orderGroupId,
            stayId,
            session.user.id,
            item.id,
            item.name,
            item.category,
            item.price,
            itemQuantity,
            Number(item.price) * itemQuantity,
            resolvedCustomerName.toString().trim(),
            (session.user.email || resolvedCustomerEmail || '').toString().trim() || null,
            customerPhone?.toString().trim() || null,
            notes?.toString().trim() || null,
          ]
        );

        createdOrders.push(result.rows[0]);
      }

      await client.query('COMMIT');

      return res.status(201).json({
        orderGroupId,
        orders: createdOrders,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to place booking' });
  }
}
