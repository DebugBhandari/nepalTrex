import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth-options';
import { pool, query } from '../../../../lib/db';
import { resolveImageInput } from '../../../../lib/object-storage';

const ALLOWED_STAY_TYPES = new Set(['hotel', 'homestay']);
const ALLOWED_MENU_CATEGORIES = new Set(['room', 'food']);

function normalizeCoordinate(value, min, max) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const num = Number(value);
  if (!Number.isFinite(num) || num < min || num > max) {
    return Number.NaN;
  }

  return num;
}

async function normalizeMenuItems(menuItems) {
  if (!Array.isArray(menuItems) || menuItems.length === 0) {
    return null;
  }

  const normalized = [];

  for (const item of menuItems) {
    const category = (item?.category || '').toString().trim().toLowerCase();
    const name = (item?.name || '').toString().trim();
    const description = (item?.description || '').toString().trim();
    const price = Number(item?.price);
    const imageUrl = await resolveImageInput(item?.imageUrl, {
      fallback: 'https://placehold.co/600x380?text=Menu+Item',
      folder: 'menu-items',
    });

    if (!ALLOWED_MENU_CATEGORIES.has(category) || !name || !Number.isFinite(price) || price < 0) {
      return null;
    }

    normalized.push({
      category,
      name,
      description,
      price,
      imageUrl,
      available: item?.available !== false,
      sortOrder: Number.isInteger(item?.sortOrder) ? item.sortOrder : normalized.length,
    });
  }

  return normalized;
}

const MENU_AGG = `
  COALESCE(
    json_agg(
      json_build_object(
        'id', m.id,
        'category', m.category,
        'name', m.name,
        'description', m.description,
        'price', m.price,
        'imageUrl', m.image_url,
        'available', m.available,
        'sortOrder', m.sort_order
      ) ORDER BY m.sort_order, m.created_at
    ) FILTER (WHERE m.id IS NOT NULL),
    '[]'::json
  ) AS menu_items
`;

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session?.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!['admin', 'superUser'].includes(session.user.role)) {
    return res.status(403).json({ error: 'Only admin or superUser can update stays' });
  }

  const stayId = req.query.id;
  const { name, slug, stayType, location, description, menuItems, imageUrl, contactPhone, latitude, longitude, ownerUserId } = req.body || {};

  if (!stayId) {
    return res.status(400).json({ error: 'Missing stay id' });
  }

  if (!name?.trim() || !slug?.trim() || !location?.trim() || !description?.trim()) {
    return res.status(400).json({ error: 'Name, slug, location, and description are required' });
  }

  if (!ALLOWED_STAY_TYPES.has(stayType)) {
    return res.status(400).json({ error: 'stayType must be hotel or homestay' });
  }

  const normalizedMenuItems = await normalizeMenuItems(menuItems);
  if (!normalizedMenuItems) {
    return res.status(400).json({ error: 'At least one valid menu item is required' });
  }

  const normalizedLatitude = normalizeCoordinate(latitude, -90, 90);
  const normalizedLongitude = normalizeCoordinate(longitude, -180, 180);

  if (Number.isNaN(normalizedLatitude) || Number.isNaN(normalizedLongitude)) {
    return res.status(400).json({ error: 'Latitude or longitude is invalid' });
  }

  const resolvedStayImageUrl = await resolveImageInput(imageUrl, {
    fallback: 'https://placehold.co/1000x620?text=NepalTrex+Stay',
    folder: 'stays',
  });

  const roomPrices = normalizedMenuItems.filter((item) => item.category === 'room').map((item) => item.price);
  const fallbackPrice = roomPrices.length > 0 ? Math.min(...roomPrices) : normalizedMenuItems[0].price;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT id, owner_user_id FROM stays WHERE id = $1 LIMIT 1`,
      [stayId]
    );

    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Stay not found' });
    }

    const ownerId = existing.rows[0].owner_user_id;
    const isOwner = ownerId === session.user.id;
    const isSuper = session.user.role === 'superUser';

    if (!isOwner && !isSuper) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'You can only update your own stays' });
    }

    let nextOwnerUserId = ownerId;
    const requestedOwnerUserId = ownerUserId ? String(ownerUserId).trim() : '';

    if (requestedOwnerUserId && requestedOwnerUserId !== ownerId) {
      if (!isSuper) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'Only superUser can change stay ownership' });
      }

      const ownerCandidate = await client.query(
        `SELECT id, role FROM users WHERE id = $1 LIMIT 1`,
        [requestedOwnerUserId]
      );

      if (ownerCandidate.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Selected owner user does not exist' });
      }

      // If a regular user is assigned as owner, promote them to admin.
      if (ownerCandidate.rows[0].role === 'user') {
        await client.query(
          `UPDATE users SET role = 'admin', updated_at = NOW() WHERE id = $1`,
          [requestedOwnerUserId]
        );
      }

      nextOwnerUserId = ownerCandidate.rows[0].id;
    }

    await client.query(
      `
        UPDATE stays
        SET
          name = $1, slug = $2, stay_type = $3, location = $4, description = $5,
          image_url = $6, price_per_night = $7, contact_phone = $8, latitude = $9, longitude = $10,
          owner_user_id = $11,
          updated_at = NOW()
        WHERE id = $12
      `,
      [
        name.trim(),
        slug.trim(),
        stayType,
        location.trim(),
        description.trim(),
        resolvedStayImageUrl,
        fallbackPrice,
        contactPhone?.trim() || null,
        normalizedLatitude,
        normalizedLongitude,
        nextOwnerUserId,
        stayId,
      ]
    );

    // Replace all menu items: delete old, insert new
    await client.query(`DELETE FROM menu_items WHERE stay_id = $1`, [stayId]);

    for (let i = 0; i < normalizedMenuItems.length; i++) {
      const item = normalizedMenuItems[i];
      await client.query(
        `
          INSERT INTO menu_items (stay_id, category, name, description, price, image_url, available, sort_order)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [stayId, item.category, item.name, item.description, item.price, item.imageUrl, item.available, item.sortOrder ?? i]
      );
    }

    await client.query('COMMIT');

    const finalResult = await query(
      `
        SELECT s.id, s.owner_user_id, s.name, s.slug, s.stay_type, s.location, s.description,
               s.image_url, s.price_per_night, s.contact_phone, s.latitude, s.longitude,
               u.email AS owner_email, u.username AS owner_username, u.display_name AS owner_display_name,
               ${MENU_AGG}
        FROM stays s
        LEFT JOIN users u ON u.id = s.owner_user_id
        LEFT JOIN menu_items m ON m.stay_id = s.id
        WHERE s.id = $1
        GROUP BY s.id, u.email, u.username, u.display_name
      `,
      [stayId]
    );

    return res.status(200).json({ stay: finalResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Slug already exists' });
    }
    return res.status(500).json({ error: error.message || 'Failed to update stay' });
  } finally {
    client.release();
  }
}
