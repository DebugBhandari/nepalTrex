import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth-options';
import { query } from '../../../../lib/db';

async function requireSuperUser(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }

  if (session.user.role !== 'superUser') {
    res.status(403).json({ error: 'Only superUsers can manage users' });
    return null;
  }

  return session;
}

export default async function handler(req, res) {
  const session = await requireSuperUser(req, res);
  if (!session) return;

  const userId = req.query.id;

  if (!userId) {
    return res.status(400).json({ error: 'Missing user id' });
  }

  if (session.user.id === userId) {
    return res.status(400).json({ error: 'You cannot ban or delete your own account from this screen' });
  }

  if (req.method === 'PATCH') {
    const isBanned = req.body?.isBanned;

    if (typeof isBanned !== 'boolean') {
      return res.status(400).json({ error: 'isBanned must be a boolean' });
    }

    try {
      const updated = await query(
        `
          UPDATE users
          SET is_banned = $1, updated_at = NOW()
          WHERE id = $2
          RETURNING id, username, email, role, is_banned
        `,
        [isBanned, userId]
      );

      if (updated.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json({
        message: isBanned ? 'User banned' : 'User unbanned',
        user: {
          id: updated.rows[0].id,
          username: updated.rows[0].username,
          email: updated.rows[0].email,
          role: updated.rows[0].role || 'user',
          isBanned: Boolean(updated.rows[0].is_banned),
        },
      });
    } catch (error) {
      return res.status(500).json({ error: error.message || 'Failed to update ban status' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const ownedStays = await query(
        `
          SELECT COUNT(*)::int AS count
          FROM stays
          WHERE owner_user_id = $1
        `,
        [userId]
      );

      if (Number(ownedStays.rows[0]?.count || 0) > 0) {
        return res.status(400).json({ error: "Transfer this user's stay ownership before deleting the account" });
      }

      const deleted = await query(
        `
          DELETE FROM users
          WHERE id = $1
          RETURNING id, username, email
        `,
        [userId]
      );

      if (deleted.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json({
        message: 'User deleted',
        user: deleted.rows[0],
      });
    } catch (error) {
      return res.status(500).json({ error: error.message || 'Failed to delete user' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
