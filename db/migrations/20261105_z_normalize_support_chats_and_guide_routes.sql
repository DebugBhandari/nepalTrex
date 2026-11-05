DELETE FROM chat_participants cp
USING chat_conversations c, users u
WHERE cp.conversation_id = c.id
  AND cp.user_id = u.id
  AND c.conversation_type = 'support'
  AND cp.user_id <> c.source_id
  AND u.role IN ('admin', 'superUser');