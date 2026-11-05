export async function createReservationConversation(client, reservation) {
  const result = await client.query(
    `INSERT INTO chat_conversations (conversation_type, source_id, status)
     VALUES ('reservation', $1, $2)
     ON CONFLICT (conversation_type, source_id) DO UPDATE SET updated_at = NOW()
     RETURNING id, status`,
    [reservation.id, reservation.status === 'confirmed' ? 'active' : 'pending']
  );
  const conversation = result.rows[0];
  await client.query(
    `INSERT INTO chat_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3) ON CONFLICT DO NOTHING`,
    [conversation.id, reservation.customerUserId, reservation.ownerUserId]
  );
  return conversation;
}

export async function createGuideBookingConversation(client, booking) {
  const result = await client.query(
    `INSERT INTO chat_conversations (conversation_type, source_id, status)
     VALUES ('guide_booking', $1, $2)
     ON CONFLICT (conversation_type, source_id) DO UPDATE SET updated_at = NOW()
     RETURNING id, status`,
    [booking.id, booking.status === 'confirmed' ? 'active' : 'pending']
  );
  const conversation = result.rows[0];
  await client.query(
    `INSERT INTO chat_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3) ON CONFLICT DO NOTHING`,
    [conversation.id, booking.customerUserId, booking.guideUserId]
  );
  return conversation;
}

export async function activateConversation(client, conversationType, sourceId) {
  const result = await client.query(
    `UPDATE chat_conversations SET status = 'active', updated_at = NOW()
     WHERE conversation_type = $1 AND source_id = $2
     RETURNING id`,
    [conversationType, sourceId]
  );
  return result.rows[0] || null;
}

export async function createChatNotifications(client, conversationId, senderUserId, body, notificationType = 'chat_message') {
  const recipients = await client.query(
    `SELECT DISTINCT u.id, COALESCE(NULLIF(u.display_name, ''), NULLIF(u.username, ''), split_part(u.email, '@', 1)) AS name
     FROM users u
     JOIN chat_conversations c ON c.id = $1
     WHERE u.id <> $2
       AND (
         EXISTS (SELECT 1 FROM chat_participants cp WHERE cp.conversation_id = c.id AND cp.user_id = u.id)
         OR (c.conversation_type = 'support' AND u.role = 'superUser' AND EXISTS (SELECT 1 FROM users sender WHERE sender.id = $2 AND sender.role NOT IN ('admin', 'superUser')))
       )`,
    [conversationId, senderUserId]
  );
  const sender = await client.query(`SELECT COALESCE(NULLIF(display_name, ''), NULLIF(username, ''), split_part(email, '@', 1)) AS name FROM users WHERE id = $1`, [senderUserId]);
  const senderName = sender.rows[0]?.name || 'NepalTrex member';
  for (const recipient of recipients.rows) {
    await client.query(
      `INSERT INTO app_notifications (recipient_user_id, notification_key, notification_type, title, body, href, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
       ON CONFLICT (recipient_user_id, notification_key) DO NOTHING`,
      [recipient.id, `${notificationType}:${conversationId}:${senderUserId}:${Date.now()}`, notificationType, notificationType === 'chat_ready' ? 'Your reservation chat is ready' : `New message from ${senderName}`, body, `/chats?conversation=${conversationId}`, JSON.stringify({ conversationId })]
    );
  }
}