import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth-options';
import { pool, query } from '../../../lib/db';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Authentication required' });

  if (req.method === 'GET') {
    try {
      const result = await query(
        `SELECT c.id, c.conversation_type, c.source_id, c.status, c.updated_at,
          COALESCE((SELECT m.body FROM chat_messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1), '') AS last_message,
          (SELECT m.created_at FROM chat_messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at,
          (SELECT COUNT(*)::int FROM chat_messages m WHERE m.conversation_id = c.id AND m.sender_user_id <> $1 AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)) AS unread_count,
          CASE c.conversation_type
            WHEN 'reservation' THEN (SELECT s.name FROM reservations r JOIN stays s ON s.id = r.stay_id WHERE r.id = c.source_id)
            WHEN 'guide_booking' THEN (SELECT p.title FROM guide_bookings b JOIN guide_packages p ON p.id = b.guide_package_id WHERE b.id = c.source_id)
            ELSE 'NepalTrex support'
          END AS title
         FROM chat_conversations c JOIN chat_participants cp ON cp.conversation_id = c.id
         WHERE cp.user_id = $1 OR ($2 IN ('admin', 'superUser') AND c.conversation_type = 'support')
         ORDER BY COALESCE((SELECT MAX(m.created_at) FROM chat_messages m WHERE m.conversation_id = c.id), c.updated_at) DESC`,
        [session.user.id, session.user.role || 'user']
      );
      return res.status(200).json({ conversations: result.rows });
    } catch (error) { return res.status(500).json({ error: error.message || 'Failed to load chats' }); }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { conversationType, sourceId } = req.body || {};
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let conversation;
    if (conversationType === 'support') {
      const created = await client.query(`INSERT INTO chat_conversations (conversation_type, source_id, status) VALUES ('support', $1, 'active') ON CONFLICT (conversation_type, source_id) DO UPDATE SET updated_at = NOW() RETURNING *`, [session.user.id]);
      conversation = created.rows[0];
      await client.query(`INSERT INTO chat_participants (conversation_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [conversation.id, session.user.id]);
      await client.query(`INSERT INTO chat_participants (conversation_id, user_id) SELECT $1, id FROM users WHERE role IN ('admin', 'superUser') ON CONFLICT DO NOTHING`, [conversation.id]);
    } else if (['reservation', 'guide_booking'].includes(conversationType) && typeof sourceId === 'string') {
      const found = await client.query(`SELECT c.* FROM chat_conversations c JOIN chat_participants cp ON cp.conversation_id=c.id WHERE c.conversation_type=$1 AND c.source_id=$2 AND cp.user_id=$3`, [conversationType, sourceId, session.user.id]);
      conversation = found.rows[0];
      if (!conversation) throw Object.assign(new Error('Chat is not available for this booking'), { statusCode: 404 });
    } else throw Object.assign(new Error('Invalid chat request'), { statusCode: 400 });
    await client.query('COMMIT');
    return res.status(200).json({ conversation });
  } catch (error) { await client.query('ROLLBACK'); return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to open chat' }); } finally { client.release(); }
}