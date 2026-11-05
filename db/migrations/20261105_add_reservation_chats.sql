CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_type TEXT NOT NULL CHECK (conversation_type IN ('reservation', 'guide_booking', 'support')),
  source_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (conversation_type, source_id)
);

CREATE TABLE IF NOT EXISTS chat_participants (
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_participants_user_idx ON chat_participants(user_id, conversation_id);
CREATE INDEX IF NOT EXISTS chat_messages_conversation_created_idx ON chat_messages(conversation_id, created_at);

ALTER TABLE app_notifications DROP CONSTRAINT IF EXISTS app_notifications_notification_type_check;
ALTER TABLE app_notifications ADD CONSTRAINT app_notifications_notification_type_check
  CHECK (notification_type IN ('stay_reservation_requested', 'guide_booking_requested', 'chat_message', 'chat_ready'));

INSERT INTO chat_conversations (conversation_type, source_id, status)
SELECT 'reservation', r.id, 'active'
FROM reservations r
ON CONFLICT (conversation_type, source_id) DO NOTHING;

INSERT INTO chat_participants (conversation_id, user_id)
SELECT c.id, r.customer_user_id
FROM chat_conversations c
JOIN reservations r ON c.conversation_type = 'reservation' AND c.source_id = r.id
ON CONFLICT DO NOTHING;

INSERT INTO chat_participants (conversation_id, user_id)
SELECT c.id, s.owner_user_id
FROM chat_conversations c
JOIN reservations r ON c.conversation_type = 'reservation' AND c.source_id = r.id
JOIN stays s ON s.id = r.stay_id
ON CONFLICT DO NOTHING;

INSERT INTO chat_conversations (conversation_type, source_id, status)
SELECT 'guide_booking', b.id, 'active'
FROM guide_bookings b
ON CONFLICT (conversation_type, source_id) DO NOTHING;

INSERT INTO chat_participants (conversation_id, user_id)
SELECT c.id, b.customer_user_id
FROM chat_conversations c
JOIN guide_bookings b ON c.conversation_type = 'guide_booking' AND c.source_id = b.id
ON CONFLICT DO NOTHING;

INSERT INTO chat_participants (conversation_id, user_id)
SELECT c.id, gp.user_id
FROM chat_conversations c
JOIN guide_bookings b ON c.conversation_type = 'guide_booking' AND c.source_id = b.id
JOIN guide_profiles gp ON gp.id = b.guide_profile_id
ON CONFLICT DO NOTHING;