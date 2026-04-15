import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth-options';
import { query } from '../../../lib/db';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.method === 'GET') {
    const result = await query(
      `SELECT trek_slug FROM user_trek_wishlists WHERE user_id = $1 ORDER BY created_at DESC`,
      [session.user.id]
    );
    return res.status(200).json({ slugs: result.rows.map((r) => r.trek_slug) });
  }

  if (req.method === 'POST') {
    const { slug, action } = req.body || {};

    if (!slug || typeof slug !== 'string' || slug.length > 200) {
      return res.status(400).json({ error: 'Valid slug is required' });
    }

    if (!['add', 'remove'].includes(action)) {
      return res.status(400).json({ error: 'action must be add or remove' });
    }

    if (action === 'add') {
      await query(
        `INSERT INTO user_trek_wishlists (user_id, trek_slug) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [session.user.id, slug]
      );
    } else {
      await query(
        `DELETE FROM user_trek_wishlists WHERE user_id = $1 AND trek_slug = $2`,
        [session.user.id, slug]
      );
    }

    const result = await query(
      `SELECT trek_slug FROM user_trek_wishlists WHERE user_id = $1 ORDER BY created_at DESC`,
      [session.user.id]
    );

    const countResult = await query(
      `SELECT COUNT(*)::int AS wishlist_count FROM user_trek_wishlists WHERE trek_slug = $1`,
      [slug]
    );

    return res.status(200).json({
      slugs: result.rows.map((r) => r.trek_slug),
      slug,
      wishlistCount: countResult.rows[0]?.wishlist_count || 0,
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
