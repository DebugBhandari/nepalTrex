CREATE TABLE IF NOT EXISTS chat_conversation_hides (
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hidden_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS chat_conversation_hides_user_idx
  ON chat_conversation_hides(user_id, hidden_at DESC);