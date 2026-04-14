import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth-options';
import { query } from '../../../../lib/db';

const ALLOWED_STAY_TYPES = new Set(['hotel', 'homestay']);

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
  const { name, slug, stayType, location, description, pricePerNight, contactPhone } = req.body || {};

  if (!stayId) {
    return res.status(400).json({ error: 'Missing stay id' });
  }

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
          price_per_night = $6,
          contact_phone = $7,
          updated_at = NOW()
        WHERE id = $8
        RETURNING id, owner_user_id, name, slug, stay_type, location, description, price_per_night, contact_phone
      `,
      [
        name.trim(),
        slug.trim(),
        stayType,
        location.trim(),
        description.trim(),
        numericPrice,
        contactPhone?.trim() || null,
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
