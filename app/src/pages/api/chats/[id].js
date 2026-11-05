import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth-options';
import { pool, query } from '../../../lib/db';
import { createChatNotifications } from '../../../lib/chats';

async function canAccessConversation(conversationId, userId, role) {
  const result = await query(`SELECT c.* FROM chat_conversations c LEFT JOIN chat_participants cp ON cp.conversation_id=c.id AND cp.user_id=$2 WHERE c.id=$1 AND (cp.user_id IS NOT NULL OR ($3='superUser' AND c.conversation_type IN ('support', 'guide_booking')))`, [conversationId, userId, role || 'user']);
  return result.rows[0] || null;
}

async function markConversationRead(conversationId, userId) {
  await query(`INSERT INTO chat_participants (conversation_id, user_id, last_read_at) VALUES ($1, $2, NOW()) ON CONFLICT (conversation_id, user_id) DO UPDATE SET last_read_at = EXCLUDED.last_read_at`, [conversationId, userId]);
  await query(`UPDATE app_notifications SET read_at = COALESCE(read_at, NOW()), updated_at = NOW() WHERE recipient_user_id = $1 AND read_at IS NULL AND notification_type IN ('chat_message', 'chat_ready') AND (metadata->>'conversationId' = $2 OR href = '/chats?conversation=' || $2)`, [userId, conversationId]);
}

async function getBookingContext(conversation) {
  if (conversation.conversation_type === 'reservation') {
    const result = await query(
      `SELECT r.status, r.check_in_date, r.check_out_date, r.guest_count,
        s.name AS stay_name, s.slug AS stay_slug,
        COALESCE(NULLIF(host.display_name, ''), NULLIF(host.username, ''), split_part(host.email, '@', 1)) AS host_name,
        trim(both '-' from regexp_replace(lower(COALESCE(NULLIF(host.username, ''), NULLIF(host.display_name, ''))), '[^a-z0-9]+', '-', 'g')) AS host_handle,
        COALESCE(NULLIF(customer.display_name, ''), NULLIF(customer.username, ''), split_part(customer.email, '@', 1)) AS customer_name,
        trim(both '-' from regexp_replace(lower(COALESCE(NULLIF(customer.username, ''), NULLIF(customer.display_name, ''))), '[^a-z0-9]+', '-', 'g')) AS customer_handle
       FROM reservations r
       JOIN stays s ON s.id = r.stay_id
       JOIN users host ON host.id = s.owner_user_id
       JOIN users customer ON customer.id = r.customer_user_id
       WHERE r.id = $1`,
      [conversation.source_id]
    );
    const booking = result.rows[0];
    return booking ? {
      type: 'reservation', status: booking.status, stayName: booking.stay_name, staySlug: booking.stay_slug,
      checkInDate: booking.check_in_date, checkOutDate: booking.check_out_date, guestCount: Number(booking.guest_count),
      hostName: booking.host_name, hostHandle: booking.host_handle || '',
      customerName: booking.customer_name, customerHandle: booking.customer_handle || '',
    } : null;
  }

  if (conversation.conversation_type === 'guide_booking') {
    const result = await query(
      `SELECT b.status, b.start_date, b.traveler_count, p.title AS package_title, gp.slug AS guide_slug,
        COALESCE(NULLIF(guide_user.display_name, ''), NULLIF(guide_user.username, ''), split_part(guide_user.email, '@', 1)) AS guide_name,
        trim(both '-' from regexp_replace(lower(COALESCE(NULLIF(guide_user.username, ''), NULLIF(guide_user.display_name, ''))), '[^a-z0-9]+', '-', 'g')) AS guide_handle,
        COALESCE(NULLIF(customer.display_name, ''), NULLIF(customer.username, ''), split_part(customer.email, '@', 1)) AS customer_name,
        trim(both '-' from regexp_replace(lower(COALESCE(NULLIF(customer.username, ''), NULLIF(customer.display_name, ''))), '[^a-z0-9]+', '-', 'g')) AS customer_handle
       FROM guide_bookings b
       JOIN guide_packages p ON p.id = b.guide_package_id
       JOIN guide_profiles gp ON gp.id = b.guide_profile_id
       JOIN users guide_user ON guide_user.id = gp.user_id
       JOIN users customer ON customer.id = b.customer_user_id
       WHERE b.id = $1`,
      [conversation.source_id]
    );
    const booking = result.rows[0];
    return booking ? {
      type: 'guide_booking', status: booking.status, packageTitle: booking.package_title, guideSlug: booking.guide_slug,
      startDate: booking.start_date, travelerCount: Number(booking.traveler_count),
      guideName: booking.guide_name, guideHandle: booking.guide_handle || '',
      customerName: booking.customer_name, customerHandle: booking.customer_handle || '',
    } : null;
  }

  return null;
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
      const booking = await getBookingContext(conversation);
      await markConversationRead(id, session.user.id);
      return res.status(200).json({ conversation, booking, currentUserId: session.user.id, messages: messages.rows });
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
      await markConversationRead(id, session.user.id);
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