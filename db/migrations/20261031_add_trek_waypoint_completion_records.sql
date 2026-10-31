ALTER TABLE trek_completions
  ADD COLUMN IF NOT EXISTS verification_method TEXT NOT NULL DEFAULT 'live_gps',
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE trek_location_records
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'trek_completions_verification_method_check'
      AND conrelid = 'trek_completions'::regclass
  ) THEN
    ALTER TABLE trek_completions
      ADD CONSTRAINT trek_completions_verification_method_check
      CHECK (verification_method IN ('live_gps', 'demo')) NOT VALID;
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS trek_waypoint_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trek_id UUID NOT NULL REFERENCES treks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  waypoint_index INTEGER NOT NULL,
  waypoint_name TEXT NOT NULL,
  waypoint_latitude DOUBLE PRECISION NOT NULL,
  waypoint_longitude DOUBLE PRECISION NOT NULL,
  recorded_latitude DOUBLE PRECISION NOT NULL,
  recorded_longitude DOUBLE PRECISION NOT NULL,
  accuracy_m DOUBLE PRECISION,
  distance_m DOUBLE PRECISION NOT NULL,
  location_record_id UUID REFERENCES trek_location_records(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, trek_id, waypoint_index),
  CHECK (waypoint_index >= 0),
  CHECK (distance_m >= 0),
  CHECK (accuracy_m IS NULL OR accuracy_m >= 0)
);

CREATE INDEX IF NOT EXISTS trek_waypoint_completions_user_trek_idx
  ON trek_waypoint_completions(user_id, trek_id, waypoint_index);