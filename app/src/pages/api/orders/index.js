import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth-options';
import { query } from '../../../lib/db';

const ALLOWED_MENU_CATEGORIES = new Set(['room', 'food']);

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) return res.status(401).json({ error: 'Authentication required' });
    if (!['admin', 'superUser'].includes(session.user.role)) return res.status(403).json({ error: 'Forbidden' });

    const isSuper = session.user.role === 'superUser';
    const result = isSuper
      ? await query(
          `SELECT o.id, o.menu_item_name, o.menu_item_category, o.unit_price, o.quantity, o.total_price, o.customer_name, o.customer_email, o.customer_phone, o.notes, o.status, o.created_at, s.name AS stay_name, s.id AS stay_id
           FROM orders o JOIN stays s ON s.id = o.stay_id ORDER BY o.created_at DESC`
        )
      : await query(
          `SELECT o.id, o.menu_item_name, o.menu_item_category, o.unit_price, o.quantity, o.total_price, o.customer_name, o.customer_email, o.customer_phone, o.notes, o.status, o.created_at, s.name AS stay_name, s.id AS stay_id
           FROM orders o JOIN stays s ON s.id = o.stay_id WHERE s.owner_user_id = $1 ORDER BY o.created_at DESC`,
          [session.user.id]
        );

    return res.status(200).json({
      orders: result.rows.map((r) => ({
        id: r.id,
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
    menuItemName,
    menuItemCategory,
    unitPrice,
    quantity,
    customerName,
    customerEmail,
    customerPhone,
    notes,
  } = req.body || {};

  if (!stayId || !menuItemName || !customerName) {
    return res.status(400).json({ error: 'Missing required booking fields' });
  }

  const category = (menuItemCategory || '').toString().trim().toLowerCase();
  if (!ALLOWED_MENU_CATEGORIES.has(category)) {
    return res.status(400).json({ error: 'menuItemCategory must be room or food' });
  }

  const parsedUnitPrice = Number(unitPrice);
  const parsedQuantity = Number(quantity);

  if (!Number.isFinite(parsedUnitPrice) || parsedUnitPrice < 0) {
    return res.status(400).json({ error: 'Invalid item price' });
  }

  if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
    return res.status(400).json({ error: 'Quantity must be a positive integer' });
  }

  const totalPrice = parsedUnitPrice * parsedQuantity;

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

    const result = await query(
      `
        INSERT INTO orders (
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
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, status, created_at
      `,
      [
        stayId,
        menuItemName,
        category,
        parsedUnitPrice,
        parsedQuantity,
        totalPrice,
        customerName.toString().trim(),
        customerEmail?.toString().trim() || null,
        customerPhone?.toString().trim() || null,
        notes?.toString().trim() || null,
      ]
    );

    return res.status(201).json({ order: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to place booking' });
  }
}
