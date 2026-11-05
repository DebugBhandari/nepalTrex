import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth-options';
import { pool, query } from '../../../lib/db';
import { createChatNotifications } from '../../../lib/chats';

async function canAccessConversation(conversationId, userId, role) {
  const result = await query(`SELECT c.* FROM chat_conversations c LEFT JOIN chat_participants cp ON cp.conversation_id=c.id AND cp.user_id=$2 WHERE c.id=$1 AND (cp.user_id IS NOT NULL OR ($3='superUser' AND c.conversation_type IN ('support', 'guide_booking')))`, [conversationId, userId, role || 'user']);
  return result.rows[0] || null;
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Authentication required' });
  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const conversation = await canAccessConversation(id, session.user.id, session.user.role);
  if (!conversation) return res.status(404).json({ error: 'Chat not found' });
  if (req.method === 'GET') {
    try {
      const messages = await query(`SELECT m.id, m.body, m.created_at, m.sender_user_id, CASE WHEN $2='support' AND u.role IN ('admin','superUser') THEN 'NepalTrex support · ' || u.email ELSE COALESCE(NULLIF(u.display_name,''), NULLIF(u.username,''), split_part(u.email,'@',1)) END AS sender_name FROM chat_messages m JOIN users u ON u.id=m.sender_user_id WHERE m.conversation_id=$1 ORDER BY m.created_at ASC`, [id, conversation.conversation_type]);
      await query(`UPDATE chat_participants SET last_read_at=NOW() WHERE conversation_id=$1 AND user_id=$2`, [id, session.user.id]);
      return res.status(200).json({ conversation, currentUserId: session.user.id, messages: messages.rows });
    } catch (error) { return res.status(500).json({ error: error.message || 'Failed to load messages' }); }
  }
  if (req.method === 'DELETE') {
    try {
      await query(`INSERT INTO chat_conversation_hides (conversation_id, user_id) VALUES ($1, $2) ON CONFLICT (conversation_id, user_id) DO UPDATE SET hidden_at = NOW()`, [id, session.user.id]);
      return res.status(200).json({ success: true });
    } catch (error) { return res.status(500).json({ error: error.message || 'Failed to remove chat' }); }
  }
  if (req.method === 'PATCH') {
    if (req.body?.markRead !== true) return res.status(400).json({ error: 'markRead must be true' });
    try {
      await query(`UPDATE chat_participants SET last_read_at = NOW() WHERE conversation_id = $1 AND user_id = $2`, [id, session.user.id]);
      return res.status(200).json({ success: true });
    } catch (error) { return res.status(500).json({ error: error.message || 'Failed to mark chat as read' }); }
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (conversation.status !== 'active') return res.status(403).json({ error: 'Chat will be available after the reservation is accepted' });
  const body = String(req.body?.body || '').trim();
  if (!body || body.length > 4000) return res.status(400).json({ error: 'Message must be between 1 and 4,000 characters' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const message = await client.query(`INSERT INTO chat_messages (conversation_id, sender_user_id, body) VALUES ($1,$2,$3) RETURNING id, body, created_at, sender_user_id`, [id, session.user.id, body]);
    await client.query(`UPDATE chat_conversations SET updated_at=NOW() WHERE id=$1`, [id]);
    await createChatNotifications(client, id, session.user.id, body);
    await client.query('COMMIT');
    const senderName = conversation.conversation_type === 'support' && ['admin', 'superUser'].includes(session.user.role)
      ? `NepalTrex support · ${session.user.email || ''}`
      : session.user.name || session.user.email || 'You';
    return res.status(201).json({ message: { ...message.rows[0], sender_name: senderName } });
  } catch (error) { await client.query('ROLLBACK'); return res.status(500).json({ error: error.message || 'Failed to send message' }); } finally { client.release(); }
}