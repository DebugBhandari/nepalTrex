import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth-options';
import { query } from '../../../lib/db';

const TARGET_TYPES = new Set(['stay', 'trek', 'guide']);

async function targetExists(targetType, targetId) {
  const sql = targetType === 'stay'
    ? 'SELECT id FROM stays WHERE id = $1 LIMIT 1'
    : targetType === 'guide'
      ? "SELECT id FROM guide_profiles WHERE id = $1 AND approval_status = 'approved' LIMIT 1"
      : 'SELECT id FROM treks WHERE id = $1 LIMIT 1';
  const result = await query(sql, [targetId]);
  return Boolean(result.rows[0]);
}

function serializeReview(row) {
  return {
    id: row.id,
    reviewerUserId: row.reviewer_user_id,
    reviewerName: row.reviewer_name,
    reviewerInitials: row.reviewer_initials,
    rating: Number(row.rating),
    comment: row.comment,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id || session.user.isBanned) {
    return res.status(401).json({ error: 'Authentication is required to add a review' });
  }

  const { targetType, targetId, rating, comment } = req.body || {};
  const normalizedType = String(targetType || '').toLowerCase();
  const normalizedRating = Number(rating);
  const normalizedComment = String(comment || '').trim();

  if (!TARGET_TYPES.has(normalizedType) || !targetId) {
    return res.status(400).json({ error: 'A valid review target is required' });
  }
  if (!Number.isInteger(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }
  if (normalizedComment.length < 3 || normalizedComment.length > 1200) {
    return res.status(400).json({ error: 'Review feedback must be between 3 and 1200 characters' });
  }
  if (!(await targetExists(normalizedType, targetId))) {
    return res.status(404).json({ error: 'Review target was not found' });
  }

  try {
    const created = await query(
      `
        INSERT INTO reviews (target_type, target_id, reviewer_user_id, rating, comment)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
      [normalizedType, targetId, session.user.id, normalizedRating, normalizedComment]
    );
    const result = await query(
      `
        SELECT r.id, r.reviewer_user_id, r.rating, r.comment, r.created_at, r.updated_at,
          COALESCE(NULLIF(u.display_name, ''), NULLIF(u.username, ''), split_part(u.email, '@', 1), 'NepalTrex guest') AS reviewer_name,
          UPPER(LEFT(COALESCE(NULLIF(u.display_name, ''), NULLIF(u.username, ''), split_part(u.email, '@', 1), 'NT'), 1)) AS reviewer_initials
        FROM reviews r
        JOIN users u ON u.id = r.reviewer_user_id
        WHERE r.id = $1
      `,
      [created.rows[0].id]
    );
    return res.status(201).json({ review: serializeReview(result.rows[0]) });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'You have already reviewed this item. Edit your review instead.' });
    return res.status(500).json({ error: error.message || 'Failed to add review' });
  }
}