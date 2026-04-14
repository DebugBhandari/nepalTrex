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
  elevation_min_m INTEGER,
  elevation_max_m INTEGER,
  is_featured BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE treks
  ADD COLUMN IF NOT EXISTS route_geojson JSONB;

ALTER TABLE treks
  ADD COLUMN IF NOT EXISTS elevation_min_m INTEGER;

ALTER TABLE treks
  ADD COLUMN IF NOT EXISTS elevation_max_m INTEGER;

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
  image_url = COALESCE(image_url, '/stays/lodge-exterior.jpg'),
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

INSERT INTO treks (name, duration_days, level, region, elevation_min_m, elevation_max_m, route_geojson, is_featured)
VALUES
  ('Everest Base Camp Trek', 12, 'Moderate to Challenging', 'Everest', 2610, 5364, '{"type":"RouteWaypoints","waypoints":[[27.6881,86.7314,"Lukla"],[27.7000,86.7200,"Chheplung"],[27.7150,86.7150,"Thado Koshi"],[27.7300,86.7200,"Ghat"],[27.7405,86.7120,"Phakding"],[27.7800,86.7150,"Monjo"],[27.8000,86.7250,"Jorsalle"],[27.8050,86.7140,"Namche Bazaar"],[27.8200,86.7200,"Khumjung"],[27.8360,86.7640,"Tengboche"],[27.8600,86.7900,"Pangboche"],[27.8930,86.8310,"Dingboche"],[27.9200,86.8300,"Dughla"],[27.9500,86.8000,"Lobuche"],[27.9800,86.8290,"Gorak Shep"],[28.0043,86.8570,"Everest Base Camp"]]}', true),
  ('Gokyo Lakes Trek', 12, 'Moderate to Challenging', 'Everest', 2800, 5357, '{"type":"RouteWaypoints","waypoints":[[27.8050,86.7140,"Namche Bazaar"],[27.8600,86.6900,"Dole"],[27.9000,86.6900,"Machhermo"],[27.9600,86.6900,"Gokyo"],[27.9700,86.6900,"Gokyo Ri"]]}', true),
  ('Three Passes Trek', 18, 'Very Challenging', 'Everest', 2800, 5545, '{"type":"RouteWaypoints","waypoints":[[27.8050,86.7140,"Namche Bazaar"],[27.8200,86.6500,"Thame"],[27.9500,86.6500,"Renjo La Pass"],[27.9600,86.6900,"Gokyo"],[27.9700,86.7800,"Cho La Pass"],[27.9500,86.8000,"Lobuche"],[27.9600,86.8600,"Kongma La Pass"]]}', false),
  ('Annapurna Circuit Trek', 14, 'Moderate to Challenging', 'Annapurna', 800, 5416, '{"type":"RouteWaypoints","waypoints":[[28.2340,84.4163,"Besisahar"],[28.2600,84.4100,"Bhulbhule"],[28.3500,84.3800,"Jagat"],[28.5400,84.4000,"Dharapani"],[28.5500,84.3770,"Chame"],[28.6200,84.3700,"Pisang"],[28.6700,84.0200,"Manang"],[28.7200,83.9700,"Yak Kharka"],[28.7600,83.9500,"Thorong Phedi"],[28.7900,83.9400,"Thorong La Pass"],[28.8200,83.8800,"Muktinath"],[28.8300,83.8000,"Kagbeni"],[28.7800,83.7300,"Jomsom"]]}', true),
  ('Annapurna Base Camp Trek', 10, 'Moderate', 'Annapurna', 1070, 4130, '{"type":"RouteWaypoints","waypoints":[[28.2300,83.8700,"Nayapul"],[28.2300,83.8800,"Birethanti"],[28.4000,83.6900,"Ghorepani"],[28.3700,83.8200,"Tadapani"],[28.4000,83.8000,"Chhomrong"],[28.4400,83.8000,"Bamboo"],[28.5000,83.8100,"Deurali"],[28.5300,83.8900,"MBC"],[28.5300,83.8200,"Annapurna Base Camp"]]}', true),
  ('Mardi Himal Trek', 6, 'Moderate', 'Annapurna', 1400, 4500, '{"type":"RouteWaypoints","waypoints":[[28.3200,83.8200,"Kande"],[28.3400,83.8300,"Australian Camp"],[28.4000,83.8800,"Forest Camp"],[28.4300,83.9000,"Low Camp"],[28.4700,83.9200,"High Camp"],[28.5000,83.9300,"Mardi Base Camp"]]}', false),
  ('Poon Hill Trek', 4, 'Easy to Moderate', 'Annapurna', 1070, 3210, '{"type":"RouteWaypoints","waypoints":[[28.2300,83.8700,"Nayapul"],[28.2400,83.8100,"Tikhedhunga"],[28.3100,83.7800,"Ulleri"],[28.4000,83.6900,"Ghorepani"],[28.4100,83.6900,"Poon Hill"]]}', false),
  ('Langtang Valley Trek', 7, 'Moderate', 'Langtang', 1460, 4984, '{"type":"RouteWaypoints","waypoints":[[28.1700,85.3500,"Syabrubesi"],[28.1900,85.3700,"Bamboo"],[28.2100,85.4300,"Lama Hotel"],[28.2100,85.4700,"Ghora Tabela"],[28.2100,85.5000,"Langtang Village"],[28.2100,85.5600,"Kyanjin Gompa"],[28.2300,85.5800,"Kyanjin Ri"],[28.2300,85.6000,"Tserko Ri"]]}', true),
  ('Gosaikunda Trek', 6, 'Moderate to Challenging', 'Langtang', 1950, 4610, '{"type":"RouteWaypoints","waypoints":[[28.1100,85.3000,"Dhunche"],[28.1800,85.3500,"Sing Gompa"],[28.2000,85.3800,"Lauribina"],[28.2300,85.4200,"Gosaikunda Lake"]]}', false),
  ('Helambu Trek', 6, 'Easy to Moderate', 'Langtang', 800, 3600, '{"type":"RouteWaypoints","waypoints":[[27.7700,85.4200,"Sundarijal"],[27.8400,85.4100,"Chisapani"],[27.9000,85.5300,"Kutumsang"],[27.9200,85.6000,"Tharepati"],[27.9200,85.5800,"Melamchi Gaon"]]}', false),
  ('Manaslu Circuit Trek', 14, 'Challenging', 'Manaslu', 700, 5160, '{"type":"RouteWaypoints","waypoints":[[28.3600,84.7300,"Soti Khola"],[28.4000,84.8200,"Machha Khola"],[28.4500,84.9000,"Jagat"],[28.5000,84.9800,"Deng"],[28.5700,85.0300,"Namrung"],[28.6000,85.0000,"Lho"],[28.6200,84.9500,"Samagaon"],[28.6600,84.9300,"Samdo"],[28.6700,84.5600,"Larkya La Pass"],[28.5400,84.6300,"Bimthang"],[28.5400,84.4000,"Dharapani"]]}', true),
  ('Tsum Valley Trek', 12, 'Moderate', 'Manaslu', 1400, 3700, '{"type":"RouteWaypoints","waypoints":[[28.4500,84.9000,"Jagat"],[28.5000,84.9200,"Lokpa"],[28.5400,84.9400,"Chumling"],[28.5800,84.9800,"Chhokangparo"],[28.6500,85.0500,"Mu Gompa"]]}', false),
  ('Upper Mustang Trek', 12, 'Moderate', 'Mustang', 2800, 3840, '{"type":"RouteWaypoints","waypoints":[[28.7800,83.7300,"Jomsom"],[28.8300,83.8000,"Kagbeni"],[28.8700,83.9500,"Chele"],[28.9500,84.0000,"Ghami"],[29.0000,84.0200,"Charang"],[29.1800,84.0300,"Lo Manthang"]]}', true),
  ('Kanchenjunga North Base Camp Trek', 18, 'Very Challenging', 'Kanchenjunga', 1200, 5143, '{"type":"RouteWaypoints","waypoints":[[27.3500,87.6700,"Taplejung"],[27.4800,87.8000,"Chirwa"],[27.5200,87.8200,"Sekathum"],[27.5600,87.8500,"Amjilosa"],[27.6200,87.9000,"Ghunsa"],[27.7000,87.9500,"Kambachen"],[27.7800,87.9800,"Lhonak"],[27.8200,88.0200,"Pangpema"]]}', false),
  ('Rara Lake Trek', 8, 'Moderate', 'Western Nepal', 2000, 3010, '{"type":"RouteWaypoints","waypoints":[[29.2700,82.1800,"Jumla"],[29.3000,82.2000,"Chere Chaur"],[29.5200,82.1000,"Rara Lake"]]}', false)
ON CONFLICT (name) DO UPDATE
SET
  duration_days = EXCLUDED.duration_days,
  level = EXCLUDED.level,
  region = EXCLUDED.region,
  elevation_min_m = EXCLUDED.elevation_min_m,
  elevation_max_m = EXCLUDED.elevation_max_m,
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
  '/stays/lodge-exterior.jpg',
  jsonb_build_array(
    jsonb_build_object(
      'category', 'room',
      'name', 'Mountain View Room',
      'description', 'Private room with attached bathroom and sunrise views.',
      'price', 3000,
      'imageUrl', '/stays/hotel-room.jpg'
    ),
    jsonb_build_object(
      'category', 'food',
      'name', 'Traditional Dal Bhat Set',
      'description', 'Rice, lentils, seasonal vegetables, and pickle.',
      'price', 600,
      'imageUrl', '/stays/food-dal-bhat.jpg'
    ),
    jsonb_build_object(
      'category', 'food',
      'name', 'Vegetable Thukpa',
      'description', 'Hearty Tibetan-style noodle soup with seasonal vegetables.',
      'price', 450,
      'imageUrl', '/stays/food-thukpa.jpg'
    )
  ),
  35,
  '+977-9800000000'
FROM users u
WHERE u.username = 'admin'
ON CONFLICT (slug) DO UPDATE
  SET image_url = EXCLUDED.image_url,
      menu_items = EXCLUDED.menu_items;

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
  'Ghandruk Hotel',
  'Ghandruk-Hotel',
  'hotel',
  'Ghandruk, Kaski',
  'Comfortable mountain hotel with stunning Annapurna panoramas, en-suite rooms, and à la carte dining.',
  '/stays/lodge-exterior.jpg',
  jsonb_build_array(
    jsonb_build_object(
      'category', 'room',
      'name', 'AC Room',
      'description', 'Cozy air-conditioned room with mountain view.',
      'price', 400,
      'imageUrl', '/stays/hotel-room-2.jpg'
    ),
    jsonb_build_object(
      'category', 'food',
      'name', 'Momo Platter',
      'description', 'Steamed vegetable or chicken momos served with tomato chutney.',
      'price', 350,
      'imageUrl', '/stays/food-momo.jpg'
    )
  ),
  50,
  '+977-9800000001'
FROM users u
WHERE u.username = 'admin'
ON CONFLICT (slug) DO UPDATE
  SET image_url = EXCLUDED.image_url,
      menu_items = EXCLUDED.menu_items;
