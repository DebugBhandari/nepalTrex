ALTER TABLE reservation_events
  ADD COLUMN IF NOT EXISTS actor_name TEXT;

ALTER TABLE reservation_events
  ADD COLUMN IF NOT EXISTS actor_role TEXT;

UPDATE reservation_events re
SET
  actor_name = COALESCE(re.actor_name, NULLIF(u.display_name, ''), NULLIF(u.username, ''), split_part(u.email, '@', 1)),
  actor_role = COALESCE(re.actor_role, u.role)
FROM users u
WHERE re.actor_user_id = u.id
  AND (re.actor_name IS NULL OR re.actor_role IS NULL);

DROP TABLE IF EXISTS orders;