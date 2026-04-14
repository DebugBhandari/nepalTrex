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
        SELECT id, username, email, display_name, role, provider, created_at
        FROM users
        WHERE (
          $1 = ''
          OR COALESCE(username, '') ILIKE '%' || $1 || '%'
          OR COALESCE(email, '') ILIKE '%' || $1 || '%'
          OR COALESCE(display_name, '') ILIKE '%' || $1 || '%'
        )
        ORDER BY created_at DESC
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
      provider: row.provider,
      createdAt: row.created_at,
    }));

    return res.status(200).json({ users });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to fetch users' });
  }
}
