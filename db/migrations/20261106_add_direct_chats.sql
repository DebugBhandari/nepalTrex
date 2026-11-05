ALTER TABLE chat_conversations DROP CONSTRAINT IF EXISTS chat_conversations_conversation_type_check;
ALTER TABLE chat_conversations ADD CONSTRAINT chat_conversations_conversation_type_check
  CHECK (conversation_type IN ('reservation', 'guide_booking', 'support', 'direct'));

CREATE TABLE IF NOT EXISTS direct_chat_pairs (
  conversation_id UUID PRIMARY KEY REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_one_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_two_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  CHECK (user_one_id < user_two_id),
  UNIQUE (user_one_id, user_two_id)
);

CREATE INDEX IF NOT EXISTS direct_chat_pairs_user_one_idx ON direct_chat_pairs(user_one_id);
CREATE INDEX IF NOT EXISTS direct_chat_pairs_user_two_idx ON direct_chat_pairs(user_two_id);