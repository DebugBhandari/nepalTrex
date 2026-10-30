import { Pool } from 'pg';

const connectionString =
  process.env.DATABASE_URL ||
  'postgres://nepaltrex:nepaltrex@localhost:5432/nepaltrex';

const globalForPg = globalThis;

const bootstrapSchemaSql = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE,
  email TEXT UNIQUE,
  display_name TEXT,
  profile_image_url TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  is_banned BOOLEAN NOT NULL DEFAULT false,
  password_hash TEXT,
  provider TEXT NOT NULL DEFAULT 'credentials',
  provider_account_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_provider_provider_account_id_idx
  ON users(provider, provider_account_id);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

UPDATE users
SET role = 'user', updated_at = NOW()
WHERE role IS NULL OR TRIM(role) = '';

UPDATE users
SET role = 'superUser', updated_at = NOW()
WHERE LOWER(email) = 'bhandarideepakdev@gmail.com';

UPDATE users
SET role = 'admin', updated_at = NOW()
WHERE username = 'admin' AND role <> 'superUser';

CREATE TABLE IF NOT EXISTS treks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  duration_days INT NOT NULL,
  level TEXT NOT NULL,
  region TEXT NOT NULL,
  description TEXT,
  route_geojson JSONB,
  is_featured BOOLEAN NOT NULL DEFAULT true,
  avg_rating NUMERIC(3, 1),
  review_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE treks
  ADD COLUMN IF NOT EXISTS route_geojson JSONB;

ALTER TABLE treks
  ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3, 1);

ALTER TABLE treks
  ADD COLUMN IF NOT EXISTS review_count INTEGER NOT NULL DEFAULT 0;

UPDATE treks
SET
  level = CASE
    WHEN LOWER(TRIM(level)) LIKE 'easy%' THEN 'Diff+'
    WHEN LOWER(TRIM(level)) LIKE 'moderate%' THEN 'Diff++'
    WHEN LOWER(TRIM(level)) LIKE '%challenging%' THEN 'Diff+++'
    ELSE level
  END,
  updated_at = NOW()
WHERE LOWER(TRIM(level)) NOT IN ('diff+', 'diff++', 'diff+++');

CREATE TABLE IF NOT EXISTS stays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  stay_type TEXT NOT NULL CHECK (stay_type IN ('hotel', 'homestay')),
  location TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  menu_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  price_per_night NUMERIC(10, 2) NOT NULL DEFAULT 0,
  contact_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS stays_owner_user_id_idx ON stays(owner_user_id);

ALTER TABLE stays
  ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE stays
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;

ALTER TABLE stays
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

ALTER TABLE stays
  ADD COLUMN IF NOT EXISTS menu_items JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE stays
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE stays
  ADD COLUMN IF NOT EXISTS discount_percent INT NOT NULL DEFAULT 0;

UPDATE stays
SET
  image_url = COALESCE(image_url, 'https://placehold.co/1000x620?text=NepalTrex+Stay'),
  menu_items = CASE
    WHEN jsonb_typeof(menu_items) = 'array' THEN menu_items
    ELSE '[]'::jsonb
  END,
  is_featured = COALESCE(is_featured, false),
  discount_percent = CASE
    WHEN discount_percent IS NULL OR discount_percent < 0 THEN 0
    WHEN discount_percent > 100 THEN 100
    ELSE discount_percent
  END,
  updated_at = NOW();

CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stay_id UUID NOT NULL REFERENCES stays(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('room', 'food')),
  price NUMERIC(10, 2) NOT NULL,
  available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS menu_items_stay_id_idx ON menu_items(stay_id);

CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stay_id UUID NOT NULL REFERENCES stays(id) ON DELETE CASCADE,
  legacy_menu_item_id UUID UNIQUE REFERENCES menu_items(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price_per_night NUMERIC(10, 2) NOT NULL CHECK (price_per_night >= 0),
  capacity INT NOT NULL DEFAULT 2 CHECK (capacity > 0),
  total_units INT NOT NULL DEFAULT 1 CHECK (total_units > 0),
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rooms_stay_id_active_idx
  ON rooms(stay_id, is_active);

INSERT INTO rooms (
  stay_id,
  legacy_menu_item_id,
  name,
  description,
  price_per_night,
  capacity,
  total_units,
  image_url,
  is_active
)
SELECT
  m.stay_id,
  m.id,
  m.name,
  m.description,
  m.price,
  2,
  1,
  m.image_url,
  m.available
FROM menu_items m
WHERE m.category = 'room'
ON CONFLICT (legacy_menu_item_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS stay_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stay_id UUID NOT NULL REFERENCES stays(id) ON DELETE CASCADE,
  reviewer_name TEXT NOT NULL,
  reviewer_initials TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS stay_reviews_stay_id_idx ON stay_reviews(stay_id);

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL CHECK (target_type IN ('stay', 'trek')),
  target_id UUID NOT NULL,
  reviewer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL CHECK (char_length(trim(comment)) BETWEEN 3 AND 1200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT reviews_one_per_user_target UNIQUE (target_type, target_id, reviewer_user_id)
);

CREATE INDEX IF NOT EXISTS reviews_target_created_at_idx
  ON reviews(target_type, target_id, created_at DESC);

ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_target_type_check;
ALTER TABLE reviews ADD CONSTRAINT reviews_target_type_check CHECK (target_type IN ('stay', 'trek', 'guide'));

CREATE TABLE IF NOT EXISTS guide_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  headline TEXT NOT NULL,
  bio TEXT NOT NULL,
  home_region TEXT NOT NULL,
  languages TEXT[] NOT NULL DEFAULT '{}',
  years_experience INTEGER NOT NULL DEFAULT 0 CHECK (years_experience >= 0),
  license_number TEXT,
  license_document_url TEXT,
  citizenship_document_url TEXT,
  profile_image_url TEXT,
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'suspended')),
  moderation_note TEXT,
  approved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE guide_profiles ADD COLUMN IF NOT EXISTS citizenship_document_url TEXT;

CREATE TABLE IF NOT EXISTS guide_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_profile_id UUID NOT NULL REFERENCES guide_profiles(id) ON DELETE CASCADE,
  trek_id UUID REFERENCES treks(id) ON DELETE SET NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  trek_name TEXT NOT NULL,
  region TEXT NOT NULL,
  summary TEXT NOT NULL,
  duration_days INTEGER NOT NULL CHECK (duration_days > 0),
  group_size_min INTEGER NOT NULL DEFAULT 1 CHECK (group_size_min > 0),
  group_size_max INTEGER NOT NULL DEFAULT 1 CHECK (group_size_max >= group_size_min),
  price_amount NUMERIC(10,2) NOT NULL CHECK (price_amount >= 0),
  price_unit TEXT NOT NULL DEFAULT 'package' CHECK (price_unit IN ('package', 'per_day', 'per_person')),
  currency TEXT NOT NULL DEFAULT 'NPR',
  image_url TEXT,
  inclusions TEXT[] NOT NULL DEFAULT '{}',
  exclusions TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT guide_packages_profile_slug_key UNIQUE (guide_profile_id, slug)
);

ALTER TABLE guide_packages
  ADD COLUMN IF NOT EXISTS trek_id UUID REFERENCES treks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS guide_packages_trek_id_active_idx
  ON guide_packages(trek_id)
  WHERE is_active = true;

UPDATE guide_packages gp
SET trek_id = t.id,
    updated_at = NOW()
FROM treks t
WHERE gp.trek_id IS NULL
  AND lower(trim(gp.trek_name)) = lower(trim(t.name));

CREATE TABLE IF NOT EXISTS guide_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_package_id UUID NOT NULL REFERENCES guide_packages(id) ON DELETE RESTRICT,
  guide_profile_id UUID NOT NULL REFERENCES guide_profiles(id) ON DELETE RESTRICT,
  customer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  start_date DATE NOT NULL,
  traveler_count INTEGER NOT NULL CHECK (traveler_count > 0),
  customer_note TEXT,
  guide_note TEXT,
  quoted_amount NUMERIC(10,2) NOT NULL CHECK (quoted_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'NPR',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guide_booking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_booking_id UUID NOT NULL REFERENCES guide_bookings(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  previous_status TEXT,
  next_status TEXT,
  note TEXT,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION refresh_trek_review_summary()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  trek_id UUID;
BEGIN
  trek_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.target_id ELSE NEW.target_id END;

  IF (TG_OP = 'DELETE' AND OLD.target_type <> 'trek')
    OR (TG_OP <> 'DELETE' AND NEW.target_type <> 'trek') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE treks
  SET
    avg_rating = summary.avg_rating,
    review_count = summary.review_count,
    updated_at = NOW()
  FROM (
    SELECT
      ROUND(AVG(rating)::numeric, 1) AS avg_rating,
      COUNT(*)::int AS review_count
    FROM reviews
    WHERE target_type = 'trek' AND target_id = trek_id
  ) AS summary
  WHERE treks.id = trek_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS reviews_refresh_trek_review_summary ON reviews;
CREATE TRIGGER reviews_refresh_trek_review_summary
AFTER INSERT OR UPDATE OF rating OR DELETE ON reviews
FOR EACH ROW
EXECUTE FUNCTION refresh_trek_review_summary();

UPDATE treks t
SET
  avg_rating = summary.avg_rating,
  review_count = summary.review_count
FROM (
  SELECT
    t.id,
    ROUND(AVG(r.rating)::numeric, 1) AS avg_rating,
    COUNT(r.id)::int AS review_count
  FROM treks t
  LEFT JOIN reviews r ON r.target_type = 'trek' AND r.target_id = t.id
  GROUP BY t.id
) AS summary
WHERE t.id = summary.id;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS password_reset_tokens_token_idx ON password_reset_tokens(token);

`;

export const pool =
  globalForPg.__nepalTrexPgPool ||
  new Pool({
    connectionString,
  });

if (!globalForPg.__nepalTrexPgPool) {
  globalForPg.__nepalTrexPgPool = pool;
}

let schemaInitPromise = null;

async function ensureSchemaInitialized() {
  if (!schemaInitPromise) {
    schemaInitPromise = pool.query(bootstrapSchemaSql).catch((error) => {
      schemaInitPromise = null;
      throw error;
    });
  }

  await schemaInitPromise;
}

export async function query(text, params = []) {
  await ensureSchemaInitialized();

  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}
