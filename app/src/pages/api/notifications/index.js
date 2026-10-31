import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth-options';
import { query } from '../../../lib/db';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Authentication required' });

  if (req.method === 'GET') {
    try {
      const result = await query(
        `
          SELECT id, notification_type, title, body, href, metadata, read_at, created_at
          FROM app_notifications
          WHERE recipient_user_id = $1
          ORDER BY created_at DESC
          LIMIT 100
        `,
        [session.user.id]
      );
      const unreadCount = result.rows.filter((notification) => !notification.read_at).length;
      return res.status(200).json({ notifications: result.rows, unreadCount });
    } catch (error) {
      return res.status(500).json({ error: error.message || 'Failed to fetch notifications' });
    }
  }

  if (req.method === 'PATCH') {
    const { notificationId, markAllRead } = req.body || {};
    if (!notificationId && !markAllRead) return res.status(400).json({ error: 'A notificationId or markAllRead is required' });
    try {
      if (markAllRead) {
        await query(
          `UPDATE app_notifications SET read_at = COALESCE(read_at, NOW()), updated_at = NOW() WHERE recipient_user_id = $1 AND read_at IS NULL`,
          [session.user.id]
        );
      } else {
        const result = await query(
          `UPDATE app_notifications SET read_at = COALESCE(read_at, NOW()), updated_at = NOW() WHERE id = $1 AND recipient_user_id = $2 RETURNING id`,
          [notificationId, session.user.id]
        );
        if (!result.rows[0]) return res.status(404).json({ error: 'Notification not found' });
      }
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: error.message || 'Failed to update notification' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}