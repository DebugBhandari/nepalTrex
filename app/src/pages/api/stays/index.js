import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth-options';
import { query } from '../../../lib/db';

const ALLOWED_STAY_TYPES = new Set(['hotel', 'homestay']);

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

  if (!mine) {
    const result = await query(
      `
        SELECT id, name, slug, stay_type, location, description, price_per_night, contact_phone
        FROM stays
        ORDER BY created_at DESC
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
                 s.owner_user_id, u.email AS owner_email
          FROM stays s
          JOIN users u ON u.id = s.owner_user_id
          ORDER BY s.created_at DESC
        `
      )
    : await query(
        `
          SELECT s.id, s.name, s.slug, s.stay_type, s.location, s.description, s.price_per_night, s.contact_phone,
                 s.owner_user_id
          FROM stays s
          WHERE s.owner_user_id = $1
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

  const { name, slug, stayType, location, description, pricePerNight, contactPhone } = req.body || {};

  if (!name?.trim() || !slug?.trim() || !location?.trim() || !description?.trim()) {
    return res.status(400).json({ error: 'Name, slug, location, and description are required' });
  }

  if (!ALLOWED_STAY_TYPES.has(stayType)) {
    return res.status(400).json({ error: 'stayType must be hotel or homestay' });
  }

  const numericPrice = Number(pricePerNight);
  if (!Number.isFinite(numericPrice) || numericPrice < 0) {
    return res.status(400).json({ error: 'pricePerNight must be a valid non-negative number' });
  }

  try {
    const result = await query(
      `
        INSERT INTO stays (
          owner_user_id,
          name,
          slug,
          stay_type,
          location,
          description,
          price_per_night,
          contact_phone
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, owner_user_id, name, slug, stay_type, location, description, price_per_night, contact_phone
      `,
      [
        session.user.id,
        name.trim(),
        slug.trim(),
        stayType,
        location.trim(),
        description.trim(),
        numericPrice,
        contactPhone?.trim() || null,
      ]
    );

    return res.status(201).json({ stay: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Slug already exists' });
    }

    return res.status(500).json({ error: error.message || 'Failed to create stay' });
  }
}
