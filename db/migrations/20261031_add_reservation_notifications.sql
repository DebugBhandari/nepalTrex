CREATE TABLE IF NOT EXISTS app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_key TEXT NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('stay_reservation_requested', 'guide_booking_requested')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  href TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  email_sent_at TIMESTAMPTZ,
  email_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (recipient_user_id, notification_key)
);

CREATE INDEX IF NOT EXISTS app_notifications_recipient_unread_created_idx
  ON app_notifications(recipient_user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS app_notifications_recipient_created_idx
  ON app_notifications(recipient_user_id, created_at DESC);