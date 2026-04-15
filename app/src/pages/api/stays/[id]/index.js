import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth-options';
import { query } from '../../../../lib/db';

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

function normalizeMenuItems(menuItems) {
  if (!Array.isArray(menuItems) || menuItems.length === 0) {
    return null;
  }

  const normalized = [];

  for (const item of menuItems) {
    const category = (item?.category || '').toString().trim().toLowerCase();
    const name = (item?.name || '').toString().trim();
    const description = (item?.description || '').toString().trim();
    const price = Number(item?.price);
    const imageUrl = (item?.imageUrl || '').toString().trim() || 'https://placehold.co/600x380?text=Menu+Item';

    if (!ALLOWED_MENU_CATEGORIES.has(category) || !name || !Number.isFinite(price) || price < 0) {
      return null;
    }

    normalized.push({
      category,
      name,
      description,
      price,
      imageUrl,
    });
    available: item?.available !== false,
  }

  return normalized;
}

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
  const { name, slug, stayType, location, description, menuItems, imageUrl, contactPhone, latitude, longitude } = req.body || {};

  if (!stayId) {
    return res.status(400).json({ error: 'Missing stay id' });
  }

  if (!name?.trim() || !slug?.trim() || !location?.trim() || !description?.trim()) {
    return res.status(400).json({ error: 'Name, slug, location, and description are required' });
  }

  if (!ALLOWED_STAY_TYPES.has(stayType)) {
    return res.status(400).json({ error: 'stayType must be hotel or homestay' });
  }

  const normalizedMenuItems = normalizeMenuItems(menuItems);
  if (!normalizedMenuItems) {
    return res.status(400).json({ error: 'At least one valid menu item is required' });
  }

  const normalizedLatitude = normalizeCoordinate(latitude, -90, 90);
  const normalizedLongitude = normalizeCoordinate(longitude, -180, 180);

  if (Number.isNaN(normalizedLatitude) || Number.isNaN(normalizedLongitude)) {
    return res.status(400).json({ error: 'Latitude or longitude is invalid' });
  }

  const roomPrices = normalizedMenuItems.filter((item) => item.category === 'room').map((item) => item.price);
  const fallbackPrice = roomPrices.length > 0 ? Math.min(...roomPrices) : normalizedMenuItems[0].price;

  try {
    const existing = await query(
      `
        SELECT id, owner_user_id
        FROM stays
        WHERE id = $1
        LIMIT 1
      `,
      [stayId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Stay not found' });
    }

    const ownerId = existing.rows[0].owner_user_id;
    const isOwner = ownerId === session.user.id;
    const isSuper = session.user.role === 'superUser';

    if (!isOwner && !isSuper) {
      return res.status(403).json({ error: 'You can only update your own stays' });
    }

    const result = await query(
      `
        UPDATE stays
        SET
          name = $1,
          slug = $2,
          stay_type = $3,
          location = $4,
          description = $5,
          image_url = $6,
          menu_items = $7::jsonb,
          price_per_night = $8,
          contact_phone = $9,
          latitude = $10,
          longitude = $11,
          updated_at = NOW()
        WHERE id = $12
        RETURNING id, owner_user_id, name, slug, stay_type, location, description, image_url, menu_items, price_per_night, contact_phone, latitude, longitude
      `,
      [
        name.trim(),
        slug.trim(),
        stayType,
        location.trim(),
        description.trim(),
        (imageUrl || '').toString().trim() || 'https://placehold.co/1000x620?text=NepalTrex+Stay',
        JSON.stringify(normalizedMenuItems),
        fallbackPrice,
        contactPhone?.trim() || null,
        normalizedLatitude,
        normalizedLongitude,
        stayId,
      ]
    );

    return res.status(200).json({ stay: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Slug already exists' });
    }

    return res.status(500).json({ error: error.message || 'Failed to update stay' });
  }
}
