CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE,
  email TEXT UNIQUE,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  password_hash TEXT,
  provider TEXT NOT NULL DEFAULT 'credentials',
  provider_account_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

UPDATE users
SET role = 'user', updated_at = NOW()
WHERE role IS NULL OR TRIM(role) = '';

UPDATE users
SET role = 'superUser', updated_at = NOW()
WHERE LOWER(email) = 'bhandarideepakdev@gmail.com';

CREATE UNIQUE INDEX IF NOT EXISTS users_provider_provider_account_id_idx
  ON users(provider, provider_account_id);

CREATE TABLE IF NOT EXISTS treks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  duration_days INT NOT NULL,
  level TEXT NOT NULL,
  region TEXT NOT NULL,
  description TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

ALTER TABLE stays
  ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE stays
  ADD COLUMN IF NOT EXISTS menu_items JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE stays
SET
  image_url = COALESCE(image_url, 'https://placehold.co/1000x620?text=NepalTrex+Stay'),
  menu_items = CASE
    WHEN jsonb_typeof(menu_items) = 'array' THEN menu_items
    ELSE '[]'::jsonb
  END,
  updated_at = NOW();

CREATE INDEX IF NOT EXISTS stays_owner_user_id_idx ON stays(owner_user_id);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stay_id UUID NOT NULL REFERENCES stays(id) ON DELETE CASCADE,
  menu_item_name TEXT NOT NULL,
  menu_item_category TEXT NOT NULL CHECK (menu_item_category IN ('room', 'food')),
  unit_price NUMERIC(10, 2) NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  total_price NUMERIC(10, 2) NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS orders_stay_id_idx ON orders(stay_id);

INSERT INTO users (username, email, display_name, password_hash, provider)
VALUES (
  'admin',
  'admin@nepaltrex.local',
  'Admin',
  '$2b$10$zU6qawDDcvCYrKkZxjARtOA7mWoxQcsqGq1EQ02HQgjugUsOVjQk.',
  'credentials'
)
ON CONFLICT (username) DO NOTHING;

UPDATE users
SET role = 'admin', updated_at = NOW()
WHERE username = 'admin' AND role <> 'superUser';

INSERT INTO treks (name, duration_days, level, region, description, is_featured)
VALUES
  ('Everest Base Camp', 14, 'moderate', 'Khumbu Region', 'Classic Khumbu route to Everest Base Camp with Sherpa villages and glacier views.', true),
  ('Annapurna Circuit', 16, 'challenging', 'Annapurna Region', 'Long circuit trek crossing Thorong La and diverse mountain landscapes.', true),
  ('Langtang Valley', 10, 'easy', 'Langtang Region', 'Scenic valley trek with Tamang culture and lower altitude profile.', true),
  ('Manaslu Circuit', 15, 'challenging', 'Manaslu Region', 'Remote circuit around Manaslu with high mountain passes and fewer crowds.', true),
  ('Upper Mustang', 12, 'moderate', 'Mustang Region', 'Arid trans-Himalayan trail through ancient walled settlements.', true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO stays (
  owner_user_id,
  name,
  slug,
  stay_type,
  location,
  description,
  image_url,
  menu_items,
  price_per_night,
  contact_phone
)
SELECT
  u.id,
  'Ghandruk Homestay',
  'ghandrukHomestay',
  'homestay',
  'Ghandruk, Kaski',
  'Warm local homestay with mountain views, home-cooked meals, and village cultural experiences.',
  'https://placehold.co/1000x620?text=NepalTrex+Stay',
  jsonb_build_array(
    jsonb_build_object(
      'category', 'room',
      'name', 'Mountain View Room',
      'description', 'Private room with attached bathroom and sunrise views.',
      'price', 3000,
      'imageUrl', 'https://placehold.co/600x380?text=Room+Option'
    ),
    jsonb_build_object(
      'category', 'food',
      'name', 'Traditional Dal Bhat Set',
      'description', 'Rice, lentils, seasonal vegetables, and pickle.',
      'price', 600,
      'imageUrl', 'https://placehold.co/600x380?text=Food+Option'
    )
  ),
  35,
  '+977-9800000000'
FROM users u
WHERE u.username = 'admin'
ON CONFLICT (slug) DO NOTHING;
