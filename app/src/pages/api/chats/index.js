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
            WHEN 'support' THEN CASE WHEN $2 = 'superUser' THEN 'Support request' ELSE 'NepalTrex support' END
            WHEN 'direct' THEN (
              SELECT COALESCE(NULLIF(contact.display_name, ''), NULLIF(contact.username, ''), split_part(contact.email, '@', 1))
              FROM direct_chat_pairs d
              JOIN users contact ON contact.id = CASE WHEN d.user_one_id = $1 THEN d.user_two_id ELSE d.user_one_id END
              WHERE d.conversation_id = c.id
            )
            ELSE 'Chat'
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
            WHEN 'support' THEN (
              SELECT COALESCE(NULLIF(requester.display_name, ''), NULLIF(requester.username, ''), split_part(requester.email, '@', 1))
              FROM users requester
              WHERE requester.id = c.source_id AND $2 = 'superUser'
            )
            WHEN 'direct' THEN (
              SELECT COALESCE(NULLIF(contact.display_name, ''), NULLIF(contact.username, ''), split_part(contact.email, '@', 1))
              FROM direct_chat_pairs d
              JOIN users contact ON contact.id = CASE WHEN d.user_one_id = $1 THEN d.user_two_id ELSE d.user_one_id END
              WHERE d.conversation_id = c.id
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
            WHEN 'support' THEN (
              SELECT requester.profile_image_url
              FROM users requester
              WHERE requester.id = c.source_id AND $2 = 'superUser'
            )
            WHEN 'direct' THEN (
              SELECT contact.profile_image_url
              FROM direct_chat_pairs d
              JOIN users contact ON contact.id = CASE WHEN d.user_one_id = $1 THEN d.user_two_id ELSE d.user_one_id END
              WHERE d.conversation_id = c.id
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
            WHEN 'support' THEN (
              SELECT trim(both '-' from regexp_replace(lower(COALESCE(NULLIF(requester.username, ''), NULLIF(requester.display_name, ''))), '[^a-z0-9]+', '-', 'g'))
              FROM users requester
              WHERE requester.id = c.source_id AND $2 = 'superUser'
            )
            WHEN 'direct' THEN (
              SELECT trim(both '-' from regexp_replace(lower(COALESCE(NULLIF(contact.username, ''), NULLIF(contact.display_name, ''))), '[^a-z0-9]+', '-', 'g'))
              FROM direct_chat_pairs d
              JOIN users contact ON contact.id = CASE WHEN d.user_one_id = $1 THEN d.user_two_id ELSE d.user_one_id END
              WHERE d.conversation_id = c.id
            )
            ELSE NULL
          END AS contact_handle
          FROM chat_conversations c
          LEFT JOIN chat_participants cp ON cp.conversation_id = c.id AND cp.user_id = $1
          WHERE (cp.user_id IS NOT NULL
            OR ($2 = 'superUser' AND c.conversation_type IN ('support', 'guide_booking')))
            AND c.status = 'active'
            AND NOT EXISTS (SELECT 1 FROM chat_conversation_hides hidden WHERE hidden.conversation_id = c.id AND hidden.user_id = $1)
         ORDER BY COALESCE((SELECT MAX(m.created_at) FROM chat_messages m WHERE m.conversation_id = c.id), c.updated_at) DESC`,
        [session.user.id, session.user.role || 'user']
      );
      return res.status(200).json({ conversations: result.rows, unreadCount: result.rows.reduce((total, conversation) => total + Number(conversation.unread_count || 0), 0) });
    } catch (error) { return res.status(500).json({ error: error.message || 'Failed to load chats' }); }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { conversationType, sourceId, userId } = req.body || {};
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let conversation;
    if (conversationType === 'support') {
      const created = await client.query(`INSERT INTO chat_conversations (conversation_type, source_id, status) VALUES ('support', $1, 'active') ON CONFLICT (conversation_type, source_id) DO UPDATE SET updated_at = NOW() RETURNING *`, [session.user.id]);
      conversation = created.rows[0];
      await client.query(`INSERT INTO chat_participants (conversation_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [conversation.id, session.user.id]);
    } else if (conversationType === 'direct' && typeof userId === 'string' && userId !== session.user.id) {
      const target = await client.query(`SELECT id FROM users WHERE id = $1 AND is_banned = FALSE`, [userId]);
      if (!target.rows[0]) throw Object.assign(new Error('User is not available for chat'), { statusCode: 404 });
      const [userOneId, userTwoId] = [session.user.id, userId].sort();
      const created = await client.query(`INSERT INTO chat_conversations (conversation_type, source_id, status) VALUES ('direct', gen_random_uuid(), 'active') RETURNING *`);
      const pair = await client.query(`INSERT INTO direct_chat_pairs (conversation_id, user_one_id, user_two_id) VALUES ($1, $2, $3) ON CONFLICT (user_one_id, user_two_id) DO UPDATE SET conversation_id = direct_chat_pairs.conversation_id RETURNING conversation_id`, [created.rows[0].id, userOneId, userTwoId]);
      conversation = pair.rows[0].conversation_id === created.rows[0].id ? created.rows[0] : (await client.query(`SELECT * FROM chat_conversations WHERE id = $1`, [pair.rows[0].conversation_id])).rows[0];
      if (conversation.id !== created.rows[0].id) await client.query(`DELETE FROM chat_conversations WHERE id = $1`, [created.rows[0].id]);
      await client.query(`INSERT INTO chat_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3) ON CONFLICT DO NOTHING`, [conversation.id, session.user.id, userId]);
    } else if (['reservation', 'guide_booking'].includes(conversationType) && typeof sourceId === 'string') {
      const found = await client.query(`SELECT c.* FROM chat_conversations c LEFT JOIN chat_participants cp ON cp.conversation_id=c.id AND cp.user_id=$3 WHERE c.conversation_type=$1 AND c.source_id=$2 AND (cp.user_id IS NOT NULL OR ($4='superUser' AND c.conversation_type='guide_booking'))`, [conversationType, sourceId, session.user.id, session.user.role || 'user']);
      conversation = found.rows[0];
      if (!conversation) throw Object.assign(new Error('Chat is not available for this booking'), { statusCode: 404 });
    } else throw Object.assign(new Error('Invalid chat request'), { statusCode: 400 });
    await client.query(`DELETE FROM chat_conversation_hides WHERE conversation_id = $1 AND user_id = $2`, [conversation.id, session.user.id]);
    await client.query('COMMIT');
    return res.status(200).json({ conversation });
  } catch (error) { await client.query('ROLLBACK'); return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to open chat' }); } finally { client.release(); }
}