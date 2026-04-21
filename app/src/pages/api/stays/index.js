import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth-options';
import { pool, query } from '../../../lib/db';
import { resolveImageInput } from '../../../lib/object-storage';

const ALLOWED_STAY_TYPES = new Set(['hotel', 'homestay']);
const ALLOWED_MENU_CATEGORIES = new Set(['room', 'food']);
const DEFAULT_STAY_IMAGE = '/stays/lodge-exterior.jpg';

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
  if (req.method === 'GET') {
    return handleGet(req, res);
  }

  if (req.method === 'POST') {
    return handlePost(req, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleGet(req, res) {
  const mine = req.query.mine === 'true';
  const view = (req.query.view || '').toString();

  if (!mine) {
    if (view === 'listing') {
      const featuredOnly = req.query.featuredOnly === 'true';
      const limit = Number(req.query.limit);
      const hasLimit = Number.isInteger(limit) && limit > 0;

      const whereClause = featuredOnly ? 'WHERE s.is_featured = true' : '';
      const limitClause = hasLimit ? `LIMIT ${Math.min(limit, 48)}` : '';

      const result = await query(
        `
          SELECT
            s.id, s.name, s.slug, s.stay_type, s.location, s.description,
            s.image_url, s.price_per_night, s.is_featured, s.discount_percent, s.contact_phone,
            COUNT(DISTINCT m.id)::int AS menu_count,
            ROUND(AVG(sr.rating)::numeric, 1) AS avg_rating,
            COUNT(DISTINCT sr.id)::int AS review_count
          FROM stays s
          LEFT JOIN menu_items m ON m.stay_id = s.id
          LEFT JOIN stay_reviews sr ON sr.stay_id = s.id
          ${whereClause}
          GROUP BY s.id
          ORDER BY s.is_featured DESC, s.created_at DESC
          ${limitClause}
        `
      );

      const stays = result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        stayType: row.stay_type,
        location: row.location,
        description: row.description || '',
        imageUrl: row.image_url || DEFAULT_STAY_IMAGE,
        pricePerNight: row.price_per_night ? Number(row.price_per_night) : null,
        isFeatured: Boolean(row.is_featured),
        discountPercent: Number(row.discount_percent || 0),
        avgRating: row.avg_rating ? Number(row.avg_rating).toFixed(1) : null,
        reviewCount: Number(row.review_count || 0),
        contactPhone: row.contact_phone || '',
        menuCount: Number(row.menu_count || 0),
      }));

      return res.status(200).json({ stays });
    }

    const result = await query(
      `
        SELECT s.id, s.name, s.slug, s.stay_type, s.location, s.description, s.image_url,
               s.price_per_night, s.contact_phone, s.latitude, s.longitude,
               ${MENU_AGG}
        FROM stays s
        LEFT JOIN menu_items m ON m.stay_id = s.id
        GROUP BY s.id
        ORDER BY s.created_at DESC
      `
    );

    return res.status(200).json({ stays: result.rows });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session?.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!['admin', 'superUser'].includes(session.user.role)) {
    return res.status(403).json({ error: 'Only admin or superUser can access own stays' });
  }

  const isSuper = session.user.role === 'superUser';

  const result = isSuper
    ? await query(
        `
          SELECT s.id, s.name, s.slug, s.stay_type, s.location, s.description, s.price_per_night, s.contact_phone,
                 s.image_url, s.latitude, s.longitude, s.owner_user_id, u.email AS owner_email,
                 ${MENU_AGG}
          FROM stays s
          JOIN users u ON u.id = s.owner_user_id
          LEFT JOIN menu_items m ON m.stay_id = s.id
          GROUP BY s.id, u.email
          ORDER BY s.created_at DESC
        `
      )
    : await query(
        `
          SELECT s.id, s.name, s.slug, s.stay_type, s.location, s.description, s.price_per_night, s.contact_phone,
                 s.image_url, s.latitude, s.longitude, s.owner_user_id,
                 ${MENU_AGG}
          FROM stays s
          LEFT JOIN menu_items m ON m.stay_id = s.id
          WHERE s.owner_user_id = $1
          GROUP BY s.id
          ORDER BY s.created_at DESC
        `,
        [session.user.id]
      );

  return res.status(200).json({ stays: result.rows });
}

async function handlePost(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!['admin', 'superUser'].includes(session.user.role)) {
    return res.status(403).json({ error: 'Only admin or superUser can create stays' });
  }

  const { name, slug, stayType, location, description, menuItems, imageUrl, contactPhone, latitude, longitude } = req.body || {};

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

    const stayResult = await client.query(
      `
        INSERT INTO stays (
          owner_user_id, name, slug, stay_type, location, description,
          image_url, price_per_night, contact_phone, latitude, longitude
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, owner_user_id, name, slug, stay_type, location, description, image_url, price_per_night, contact_phone, latitude, longitude
      `,
      [
        session.user.id,
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
      ]
    );

    const stayId = stayResult.rows[0].id;

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
               ${MENU_AGG}
        FROM stays s
        LEFT JOIN menu_items m ON m.stay_id = s.id
        WHERE s.id = $1
        GROUP BY s.id
      `,
      [stayId]
    );

    return res.status(201).json({ stay: finalResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Slug already exists' });
    }
    return res.status(500).json({ error: error.message || 'Failed to create stay' });
  } finally {
    client.release();
  }
}
