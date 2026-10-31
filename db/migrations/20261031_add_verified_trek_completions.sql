CREATE TABLE IF NOT EXISTS trek_location_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trek_id UUID NOT NULL REFERENCES treks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy_m DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (latitude BETWEEN -90 AND 90),
  CHECK (longitude BETWEEN -180 AND 180),
  CHECK (accuracy_m IS NULL OR accuracy_m >= 0)
);

CREATE INDEX IF NOT EXISTS trek_location_records_user_trek_recorded_at_idx
  ON trek_location_records(user_id, trek_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS trek_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trek_id UUID NOT NULL REFERENCES treks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verification_radius_km NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  waypoint_count INTEGER NOT NULL,
  certificate_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, trek_id),
  CHECK (verification_radius_km > 0),
  CHECK (waypoint_count > 0)
);

CREATE INDEX IF NOT EXISTS trek_completions_user_completed_at_idx
  ON trek_completions(user_id, completed_at DESC);