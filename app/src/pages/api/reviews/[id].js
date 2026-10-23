import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth-options';
import { query } from '../../../lib/db';

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
  if (!['PATCH', 'DELETE'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id || session.user.isBanned) return res.status(401).json({ error: 'Authentication required' });

  const reviewId = req.query.id;
  if (!reviewId) return res.status(400).json({ error: 'Review id is required' });

  if (req.method === 'DELETE') {
    const result = await query(`DELETE FROM reviews WHERE id = $1 AND reviewer_user_id = $2 RETURNING id`, [reviewId, session.user.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Review not found or you do not own it' });
    return res.status(200).json({ id: result.rows[0].id });
  }

  const rating = Number(req.body?.rating);
  const comment = String(req.body?.comment || '').trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  if (comment.length < 3 || comment.length > 1200) return res.status(400).json({ error: 'Review feedback must be between 3 and 1200 characters' });

  const result = await query(
    `
      UPDATE reviews r
      SET rating = $1, comment = $2, updated_at = NOW()
      FROM users u
      WHERE r.id = $3 AND r.reviewer_user_id = $4 AND u.id = r.reviewer_user_id
      RETURNING r.id, r.reviewer_user_id, r.rating, r.comment, r.created_at, r.updated_at,
        COALESCE(NULLIF(u.display_name, ''), NULLIF(u.username, ''), split_part(u.email, '@', 1), 'NepalTrex guest') AS reviewer_name,
        UPPER(LEFT(COALESCE(NULLIF(u.display_name, ''), NULLIF(u.username, ''), split_part(u.email, '@', 1), 'NT'), 1)) AS reviewer_initials
    `,
    [rating, comment, reviewId, session.user.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Review not found or you do not own it' });
  return res.status(200).json({ review: serializeReview(result.rows[0]) });
}