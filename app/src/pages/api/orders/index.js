import { query } from '../../../lib/db';

const ALLOWED_MENU_CATEGORIES = new Set(['room', 'food']);

export default async function handler(req, res) {
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
