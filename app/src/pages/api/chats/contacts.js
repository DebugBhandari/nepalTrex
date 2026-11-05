import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth-options';
import { query } from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Authentication required' });

  const search = String(req.query.search || '').trim();
  if (search.length < 2) return res.status(200).json({ contacts: [] });

  try {
    const result = await query(
      `SELECT u.id,
        COALESCE(NULLIF(u.display_name, ''), NULLIF(u.username, ''), split_part(u.email, '@', 1)) AS name,
        u.profile_image_url AS image_url,
        trim(both '-' from regexp_replace(lower(COALESCE(NULLIF(u.username, ''), NULLIF(u.display_name, ''))), '[^a-z0-9]+', '-', 'g')) AS handle
       FROM users u
       WHERE u.id <> $1
         AND u.is_banned = FALSE
         AND (COALESCE(u.username, '') ILIKE '%' || $2 || '%'
           OR COALESCE(u.display_name, '') ILIKE '%' || $2 || '%')
       ORDER BY COALESCE(NULLIF(u.display_name, ''), NULLIF(u.username, ''), split_part(u.email, '@', 1)) ASC
       LIMIT 10`,
      [session.user.id, search]
    );
    return res.status(200).json({ contacts: result.rows });
  } catch (error) { return res.status(500).json({ error: error.message || 'Failed to search users' }); }
}