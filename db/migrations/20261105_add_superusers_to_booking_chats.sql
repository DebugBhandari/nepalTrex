-- Booking chats always include the requester, the stay owner or guide, and all platform superusers.
INSERT INTO chat_participants (conversation_id, user_id)
SELECT c.id, u.id
FROM chat_conversations c
CROSS JOIN users u
WHERE c.conversation_type IN ('reservation', 'guide_booking')
  AND u.role = 'superUser'
ON CONFLICT DO NOTHING;