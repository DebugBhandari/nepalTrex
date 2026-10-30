CREATE TABLE IF NOT EXISTS trek_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trek_id UUID NOT NULL REFERENCES treks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_latitude DOUBLE PRECISION,
  start_longitude DOUBLE PRECISION,
  start_accuracy_m DOUBLE PRECISION,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (start_latitude IS NULL OR start_latitude BETWEEN -90 AND 90),
  CHECK (start_longitude IS NULL OR start_longitude BETWEEN -180 AND 180),
  CHECK (start_accuracy_m IS NULL OR start_accuracy_m >= 0)
);

CREATE INDEX IF NOT EXISTS trek_attempts_user_id_attempted_at_idx
  ON trek_attempts(user_id, attempted_at DESC);

CREATE INDEX IF NOT EXISTS trek_attempts_trek_id_attempted_at_idx
  ON trek_attempts(trek_id, attempted_at DESC);