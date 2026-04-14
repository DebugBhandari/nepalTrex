import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth-options';
import { query } from '../../../../lib/db';

const ALLOWED_TARGET_ROLES = new Set(['admin', 'superUser']);

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session?.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (session.user.role !== 'superUser') {
    return res.status(403).json({ error: 'Only superUsers can update user roles' });
  }

  const userId = req.query.id;
  const nextRole = (req.body?.role || '').toString().trim();

  if (!userId) {
    return res.status(400).json({ error: 'Missing user id' });
  }

  if (!ALLOWED_TARGET_ROLES.has(nextRole)) {
    return res.status(400).json({ error: 'Role must be admin or superUser' });
  }

  try {
    const targetResult = await query(
      `
        SELECT id, role
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [userId]
    );

    if (targetResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentUserResult = await query(
      `
        SELECT id
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [session.user.id]
    );

    if (currentUserResult.rows[0]?.id === userId) {
      return res.status(400).json({ error: 'You cannot change your own role from this screen' });
    }

    const updated = await query(
      `
        UPDATE users
        SET role = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, username, email, role
      `,
      [nextRole, userId]
    );

    return res.status(200).json({
      message: 'User role updated',
      user: updated.rows[0],
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to update role' });
  }
}
