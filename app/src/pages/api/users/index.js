import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth-options';
import { query } from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session?.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (session.user.role !== 'superUser') {
    return res.status(403).json({ error: 'Only superUsers can view users' });
  }

  const search = (req.query.search || '').toString().trim();

  try {
    const result = await query(
      `
        SELECT u.id, u.username, u.email, u.display_name, u.role, u.is_banned, u.provider, u.profile_image_url, u.created_at, u.last_login_at,
          EXISTS (SELECT 1 FROM guide_profiles gp WHERE gp.user_id = u.id) AS is_guide
        FROM users u
        WHERE (
          $1 = ''
          OR COALESCE(u.username, '') ILIKE '%' || $1 || '%'
          OR COALESCE(u.email, '') ILIKE '%' || $1 || '%'
          OR COALESCE(u.display_name, '') ILIKE '%' || $1 || '%'
        )
        ORDER BY u.last_login_at DESC NULLS LAST, u.created_at DESC
        LIMIT 200
      `,
      [search]
    );

    const users = result.rows.map((row) => ({
      id: row.id,
      username: row.username,
      email: row.email,
      displayName: row.display_name,
      role: row.role || 'user',
      isBanned: Boolean(row.is_banned),
      isGuide: Boolean(row.is_guide),
      provider: row.provider,
      profileImageUrl: row.profile_image_url || '',
      createdAt: row.created_at,
      lastLoginAt: row.last_login_at,
    }));

    return res.status(200).json({ users });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to fetch users' });
  }
}
