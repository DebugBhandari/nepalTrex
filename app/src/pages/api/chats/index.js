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
          END AS title,
          CASE c.conversation_type
            WHEN 'reservation' THEN (SELECT s.slug FROM reservations r JOIN stays s ON s.id = r.stay_id WHERE r.id = c.source_id)
            ELSE NULL
          END AS stay_slug,
          CASE c.conversation_type
            WHEN 'reservation' THEN (
              SELECT COALESCE(NULLIF(contact.display_name, ''), NULLIF(contact.username, ''), split_part(contact.email, '@', 1))
              FROM reservations r
              JOIN stays s ON s.id = r.stay_id
              JOIN users contact ON contact.id = CASE WHEN r.customer_user_id = $1 THEN s.owner_user_id ELSE r.customer_user_id END
              WHERE r.id = c.source_id
            )
            WHEN 'guide_booking' THEN (
              SELECT COALESCE(NULLIF(contact.display_name, ''), NULLIF(contact.username, ''), split_part(contact.email, '@', 1))
              FROM guide_bookings b
              JOIN guide_profiles gp ON gp.id = b.guide_profile_id
              JOIN users contact ON contact.id = CASE WHEN gp.user_id = $1 THEN b.customer_user_id ELSE gp.user_id END
              WHERE b.id = c.source_id
            )
            ELSE NULL
          END AS contact_name,
          CASE c.conversation_type
            WHEN 'reservation' THEN (
              SELECT contact.profile_image_url
              FROM reservations r
              JOIN stays s ON s.id = r.stay_id
              JOIN users contact ON contact.id = CASE WHEN r.customer_user_id = $1 THEN s.owner_user_id ELSE r.customer_user_id END
              WHERE r.id = c.source_id
            )
            WHEN 'guide_booking' THEN (
              SELECT contact.profile_image_url
              FROM guide_bookings b
              JOIN guide_profiles gp ON gp.id = b.guide_profile_id
              JOIN users contact ON contact.id = CASE WHEN gp.user_id = $1 THEN b.customer_user_id ELSE gp.user_id END
              WHERE b.id = c.source_id
            )
            ELSE NULL
          END AS contact_image_url,
          CASE c.conversation_type
            WHEN 'reservation' THEN (
              SELECT trim(both '-' from regexp_replace(lower(COALESCE(NULLIF(contact.username, ''), NULLIF(contact.display_name, ''))), '[^a-z0-9]+', '-', 'g'))
              FROM reservations r
              JOIN stays s ON s.id = r.stay_id
              JOIN users contact ON contact.id = CASE WHEN r.customer_user_id = $1 THEN s.owner_user_id ELSE r.customer_user_id END
              WHERE r.id = c.source_id
            )
            WHEN 'guide_booking' THEN (
              SELECT trim(both '-' from regexp_replace(lower(COALESCE(NULLIF(contact.username, ''), NULLIF(contact.display_name, ''))), '[^a-z0-9]+', '-', 'g'))
              FROM guide_bookings b
              JOIN guide_profiles gp ON gp.id = b.guide_profile_id
              JOIN users contact ON contact.id = CASE WHEN gp.user_id = $1 THEN b.customer_user_id ELSE gp.user_id END
              WHERE b.id = c.source_id
            )
            ELSE NULL
          END AS contact_handle
          FROM chat_conversations c
          LEFT JOIN chat_participants cp ON cp.conversation_id = c.id AND cp.user_id = $1
          WHERE cp.user_id IS NOT NULL
            OR ($2 = 'superUser' AND c.conversation_type IN ('support', 'guide_booking'))
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
    } else if (['reservation', 'guide_booking'].includes(conversationType) && typeof sourceId === 'string') {
      const found = await client.query(`SELECT c.* FROM chat_conversations c LEFT JOIN chat_participants cp ON cp.conversation_id=c.id AND cp.user_id=$3 WHERE c.conversation_type=$1 AND c.source_id=$2 AND (cp.user_id IS NOT NULL OR ($4='superUser' AND c.conversation_type='guide_booking'))`, [conversationType, sourceId, session.user.id, session.user.role || 'user']);
      conversation = found.rows[0];
      if (!conversation) throw Object.assign(new Error('Chat is not available for this booking'), { statusCode: 404 });
    } else throw Object.assign(new Error('Invalid chat request'), { statusCode: 400 });
    await client.query('COMMIT');
    return res.status(200).json({ conversation });
  } catch (error) { await client.query('ROLLBACK'); return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to open chat' }); } finally { client.release(); }
}