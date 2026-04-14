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
  route_geojson JSONB,
  is_featured BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE treks
  ADD COLUMN IF NOT EXISTS route_geojson JSONB;

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

UPDATE treks
SET
  name = 'Everest Base Camp Trek',
  region = 'Everest (Khumbu Region)',
  updated_at = NOW()
WHERE name = 'Everest Base Camp'
  AND NOT EXISTS (SELECT 1 FROM treks WHERE name = 'Everest Base Camp Trek');

UPDATE treks
SET
  name = 'Langtang Valley Trek',
  region = 'Langtang Region',
  updated_at = NOW()
WHERE name = 'Langtang Valley'
  AND NOT EXISTS (SELECT 1 FROM treks WHERE name = 'Langtang Valley Trek');

INSERT INTO treks (name, duration_days, level, region, description, route_geojson, is_featured)
VALUES
  (
    'Everest Base Camp Trek',
    14,
    'moderate',
    'Everest (Khumbu Region)',
    'Classic Khumbu route from Lukla to Everest Base Camp with Kala Patthar viewpoint.',
    '{"type":"LineString","coordinates":[[86.7314,27.6881],[86.7265,27.7016],[86.7148,27.7184],[86.7137,27.742],[86.714,27.7662],[86.7242,27.7897],[86.7335,27.8079],[86.7132,27.8236],[86.7176,27.836],[86.724,27.84],[86.733,27.855],[86.7153,27.8053],[86.716,27.806],[86.7138,27.8077],[86.7315,27.8195],[86.7502,27.8332],[86.7651,27.8367],[86.769,27.8348],[86.7793,27.8286],[86.8,27.817],[86.813,27.807],[86.8157,27.8361],[86.825,27.853],[86.8315,27.8648],[86.8317,27.8782],[86.8318,27.8965],[86.8319,27.9078],[86.8365,27.9055],[86.84,27.923],[86.845,27.94],[86.851,27.957],[86.8575,27.9695],[86.86,27.981],[86.8652,27.9881],[86.8528,27.9912]]}'::jsonb,
    true
  ),
  (
    'Gokyo Lakes Trek',
    12,
    'moderate',
    'Everest (Khumbu Region)',
    'Khumbu alternate route through Gokyo lakes and Cho La connection toward EBC.',
    '{"type":"LineString","coordinates":[[86.7314,27.6881],[86.7137,27.742],[86.7138,27.8077],[86.693,27.8385],[86.676,27.867],[86.6768,27.89],[86.6882,27.9505],[86.692,27.9525],[86.6935,27.957],[86.72,27.96],[86.851,27.957],[86.8652,27.9881]]}'::jsonb,
    true
  ),
  (
    'Three Passes Trek',
    18,
    'challenging',
    'Everest (Khumbu Region)',
    'High alpine Khumbu circuit crossing Cho La, Kongma La, and Renjo La passes.',
    '{"type":"LineString","coordinates":[[86.7314,27.6881],[86.7138,27.8077],[86.6882,27.9505],[86.72,27.96],[86.851,27.957],[86.88,27.95],[86.9,27.94],[86.87,27.92],[86.82,27.91],[86.79,27.89],[86.7138,27.8077],[86.7314,27.6881]]}'::jsonb,
    true
  ),
  (
    'Annapurna Circuit',
    16,
    'challenging',
    'Annapurna Region',
    'Classic long-haul circuit crossing Thorong La with dramatic terrain changes.',
    '{"type":"LineString","coordinates":[[84.41,28.235],[84.438,28.28],[84.486,28.35],[84.537,28.43],[84.628,28.595],[84.686,28.669],[84.742,28.781],[84.758,28.796],[84.067,28.848],[83.97,28.824],[83.682,28.209]]}'::jsonb,
    true
  ),
  (
    'Annapurna Base Camp Trek',
    11,
    'moderate',
    'Annapurna Region',
    'Moderate ascent route from Nayapul to Annapurna Base Camp via Chhomrong.',
    '{"type":"LineString","coordinates":[[83.819,28.224],[83.8,28.26],[83.809,28.36],[83.695,28.395],[83.813,28.47],[83.812,28.5],[83.82,28.53],[83.873,28.53],[83.86,28.52]]}'::jsonb,
    true
  ),
  (
    'Langtang Valley Trek',
    10,
    'easy',
    'Langtang Region',
    'Popular lower-altitude route from Syabrubesi to Kyanjin and Tserko Ri.',
    '{"type":"LineString","coordinates":[[85.358,28.213],[85.382,28.245],[85.4,28.275],[85.417,28.3],[85.447,28.35],[85.482,28.4],[85.5,28.41]]}'::jsonb,
    true
  ),
  (
    'Gosaikunda Trek',
    8,
    'moderate',
    'Langtang Region',
    'Sacred alpine lake trail from Dhunche to Gosaikunda and Lauribina Pass.',
    '{"type":"LineString","coordinates":[[85.3,28.1],[85.34,28.15],[85.37,28.2],[85.41,28.23],[85.42,28.25]]}'::jsonb,
    true
  ),
  (
    'Manaslu Circuit',
    15,
    'challenging',
    'Manaslu Region',
    'Remote circuit from Soti Khola via Samagaon over Larkya La to Dharapani.',
    '{"type":"LineString","coordinates":[[84.93,28.23],[84.98,28.3],[85.04,28.36],[85.1,28.42],[85.18,28.5],[85.28,28.6],[85.32,28.66],[85.38,28.7],[84.75,28.65]]}'::jsonb,
    true
  ),
  (
    'Kanchenjunga Base Camp Trek',
    20,
    'challenging',
    'Kanchenjunga Region',
    'Long eastern Nepal expedition route linking north and south Kanchenjunga base camp areas.',
    '{"type":"LineString","coordinates":[[87.93,27.37],[87.96,27.5],[87.98,27.65],[88.02,27.78],[88.1,27.85],[87.95,27.6],[87.9,27.45],[87.88,27.3]]}'::jsonb,
    true
  )
ON CONFLICT (name) DO UPDATE
SET
  duration_days = EXCLUDED.duration_days,
  level = EXCLUDED.level,
  region = EXCLUDED.region,
  description = EXCLUDED.description,
  route_geojson = EXCLUDED.route_geojson,
  is_featured = EXCLUDED.is_featured,
  updated_at = NOW();

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
