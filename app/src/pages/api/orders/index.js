import { randomUUID } from 'crypto';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth-options';
import { pool, query } from '../../../lib/db';

const ALLOWED_MENU_CATEGORIES = new Set(['room', 'food']);

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) return res.status(401).json({ error: 'Authentication required' });
    if (!['admin', 'superUser'].includes(session.user.role)) return res.status(403).json({ error: 'Forbidden' });

    const isSuper = session.user.role === 'superUser';
    const result = isSuper
      ? await query(
          `SELECT o.id, o.order_group_id, o.menu_item_name, o.menu_item_category, o.unit_price, o.quantity, o.total_price, o.customer_name, o.customer_email, o.customer_phone, o.notes, o.status, o.created_at, s.name AS stay_name, s.id AS stay_id
           FROM orders o JOIN stays s ON s.id = o.stay_id ORDER BY o.created_at DESC`
        )
      : await query(
          `SELECT o.id, o.order_group_id, o.menu_item_name, o.menu_item_category, o.unit_price, o.quantity, o.total_price, o.customer_name, o.customer_email, o.customer_phone, o.notes, o.status, o.created_at, s.name AS stay_name, s.id AS stay_id
           FROM orders o JOIN stays s ON s.id = o.stay_id WHERE s.owner_user_id = $1 ORDER BY o.created_at DESC`,
          [session.user.id]
        );

    return res.status(200).json({
      orders: result.rows.map((r) => ({
        id: r.id,
        orderGroupId: r.order_group_id || null,
        stayId: r.stay_id,
        stayName: r.stay_name,
        menuItemName: r.menu_item_name,
        menuItemCategory: r.menu_item_category,
        unitPrice: r.unit_price,
        quantity: r.quantity,
        totalPrice: r.total_price,
        customerName: r.customer_name,
        customerEmail: r.customer_email || '',
        customerPhone: r.customer_phone || '',
        notes: r.notes || '',
        status: r.status,
        createdAt: r.created_at,
      })),
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    stayId,
    items,
    menuItemName,
    menuItemCategory,
    unitPrice,
    quantity,
    customerName,
    customerEmail,
    customerPhone,
    notes,
  } = req.body || {};

  if (!stayId || !customerName) {
    return res.status(400).json({ error: 'Missing required booking fields' });
  }

  const normalizedItems = Array.isArray(items) && items.length > 0
    ? items
        .map((item) => ({
          menuItemName: (item?.menuItemName || '').toString().trim(),
          menuItemCategory: (item?.menuItemCategory || '').toString().trim().toLowerCase(),
          unitPrice: Number(item?.unitPrice),
          quantity: Number(item?.quantity),
        }))
        .filter((item) => item.menuItemName)
    : [
        {
          menuItemName: (menuItemName || '').toString().trim(),
          menuItemCategory: (menuItemCategory || '').toString().trim().toLowerCase(),
          unitPrice: Number(unitPrice),
          quantity: Number(quantity),
        },
      ];

  if (normalizedItems.length === 0) {
    return res.status(400).json({ error: 'At least one valid order item is required' });
  }

  for (const item of normalizedItems) {
    if (!ALLOWED_MENU_CATEGORIES.has(item.menuItemCategory)) {
      return res.status(400).json({ error: 'menuItemCategory must be room or food' });
    }

    if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
      return res.status(400).json({ error: 'Invalid item price' });
    }

    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be a positive integer' });
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

      const createdOrders = [];

      for (const item of normalizedItems) {
        const result = await client.query(
          `
            INSERT INTO orders (
              order_group_id,
              stay_id,
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
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, status, created_at
          `,
          [
            orderGroupId,
            stayId,
            item.menuItemName,
            item.menuItemCategory,
            item.unitPrice,
            item.quantity,
            item.unitPrice * item.quantity,
            customerName.toString().trim(),
            customerEmail?.toString().trim() || null,
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
    return res.status(500).json({ error: error.message || 'Failed to place booking' });
  }
}
