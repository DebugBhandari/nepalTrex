CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE,
  email TEXT UNIQUE,
  display_name TEXT,
  profile_image_url TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  password_hash TEXT,
  provider TEXT NOT NULL DEFAULT 'credentials',
  provider_account_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

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
  price_per_night NUMERIC(10, 2) NOT NULL DEFAULT 0,
  contact_phone TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE stays
  ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE stays
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;

ALTER TABLE stays
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Remove legacy JSONB column if migrating from old schema
ALTER TABLE stays DROP COLUMN IF EXISTS menu_items;

CREATE INDEX IF NOT EXISTS stays_owner_user_id_idx ON stays(owner_user_id);

-- Separate menu_items table (replaces the JSONB column on stays)
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stay_id UUID NOT NULL REFERENCES stays(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('room', 'food')),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  image_url TEXT,
  available BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS menu_items_stay_id_idx ON menu_items(stay_id);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_group_id UUID,
  stay_id UUID NOT NULL REFERENCES stays(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
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

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS order_group_id UUID;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL;

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

CREATE TABLE IF NOT EXISTS user_trek_wishlists (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trek_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, trek_slug)
);

CREATE INDEX IF NOT EXISTS user_trek_wishlists_user_id_idx ON user_trek_wishlists(user_id);

-- ============================================================
-- DUMMY DATA: STAYS + MENU ITEMS + ORDERS
-- Truncate and re-seed on every fresh init
-- ============================================================
TRUNCATE TABLE orders, menu_items, stays RESTART IDENTITY CASCADE;

-- Stock image URLs (Wikimedia Commons)
-- Keeping URLs in seed data removes dependency on local /public image folders.


-- Stay 1: Ghandruk Homestay
WITH new_stay AS (
  INSERT INTO stays (owner_user_id, name, slug, stay_type, location, description, image_url, price_per_night, contact_phone, latitude, longitude)
  SELECT u.id, 'Ghandruk Homestay', 'ghandruk-homestay', 'homestay', 'Ghandruk, Kaski',
    'Warm local homestay nestled in the Gurung village of Ghandruk with stunning Annapurna panoramas, home-cooked Nepali meals, and authentic village cultural experiences.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Teahouse_Himalaya.jpg/1280px-Teahouse_Himalaya.jpg', 2500, '+977-9800000001', 28.3735, 83.8082
  FROM users u WHERE u.username = 'admin'
  RETURNING id
)
INSERT INTO menu_items (stay_id, category, name, description, price, image_url, available, sort_order)
SELECT s.id, m.category, m.name, m.description, m.price, m.image_url, true, m.sort_order
FROM new_stay s, (VALUES
  ('room'::TEXT, 'Mountain View Room', 'Private room with attached bathroom and sunrise Annapurna views.', 2500::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 1),
  ('room'::TEXT, 'Dormitory Bed', 'Shared dormitory with 6 beds, great for solo trekkers on a budget.', 800::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 2),
  ('food'::TEXT, 'Traditional Dal Bhat Set', 'Unlimited rice, lentils, seasonal vegetables, pickle, and papad.', 600::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 3),
  ('food'::TEXT, 'Vegetable Thukpa', 'Hearty Tibetan-style noodle soup packed with seasonal vegetables.', 450::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Mokto_or_moktoo_02.jpg/1280px-Mokto_or_moktoo_02.jpg', 4),
  ('food'::TEXT, 'Gurung Bread with Honey', 'Freshly baked local flatbread served with wild mountain honey.', 350::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 5)
) AS m(category, name, description, price, image_url, sort_order);

-- Stay 2: Namche Teahouse Hotel
WITH new_stay AS (
  INSERT INTO stays (owner_user_id, name, slug, stay_type, location, description, image_url, price_per_night, contact_phone, latitude, longitude)
  SELECT u.id, 'Namche Teahouse Hotel', 'namche-teahouse-hotel', 'hotel', 'Namche Bazaar, Solukhumbu',
    'Comfortable teahouse-style hotel in the heart of Namche Bazaar — the gateway to Everest. Enjoy panoramic Himalayan views, hot showers, and reliable WiFi after a day on the trail.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Teahouse_Himalaya.jpg/1280px-Teahouse_Himalaya.jpg', 3500, '+977-9800000002', 27.8050, 86.7140
  FROM users u WHERE u.username = 'admin'
  RETURNING id
)
INSERT INTO menu_items (stay_id, category, name, description, price, image_url, available, sort_order)
SELECT s.id, m.category, m.name, m.description, m.price, m.image_url, true, m.sort_order
FROM new_stay s, (VALUES
  ('room'::TEXT, 'Standard Twin Room', 'Twin-bed room with mountain view, hot shower, and attached bath.', 3500::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 1),
  ('room'::TEXT, 'Deluxe Everest View Room', 'Premium room with floor-to-ceiling windows framing the Everest range.', 6000::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 2),
  ('food'::TEXT, 'Sherpa Stew', 'Slow-cooked potato and vegetable stew with local spices — a trekker favourite.', 700::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Mokto_or_moktoo_02.jpg/1280px-Mokto_or_moktoo_02.jpg', 3),
  ('food'::TEXT, 'Yak Cheese Omelette & Toast', 'Two-egg omelette with locally produced yak cheese and sourdough toast.', 550::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 4),
  ('food'::TEXT, 'Momo Platter (12 pcs)', 'Steamed pork or vegetable momos served with house tomato achar.', 650::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Mokto_or_moktoo_02.jpg/1280px-Mokto_or_moktoo_02.jpg', 5),
  ('food'::TEXT, 'Butter Tea & Tsampa Porridge', 'Traditional Tibetan butter tea paired with roasted barley porridge.', 400::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 6)
) AS m(category, name, description, price, image_url, sort_order);

-- Stay 3: Pokhara Lakeside Boutique Inn
WITH new_stay AS (
  INSERT INTO stays (owner_user_id, name, slug, stay_type, location, description, image_url, price_per_night, contact_phone, latitude, longitude)
  SELECT u.id, 'Pokhara Lakeside Inn', 'pokhara-lakeside-inn', 'hotel', 'Lakeside, Pokhara',
    'Charming boutique inn steps from Phewa Lake offering peaceful garden rooms, a rooftop breakfast terrace with Machhapuchhre views, and curated local dining.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Teahouse_Himalaya.jpg/1280px-Teahouse_Himalaya.jpg', 4500, '+977-9800000003', 28.2096, 83.9556
  FROM users u WHERE u.username = 'admin'
  RETURNING id
)
INSERT INTO menu_items (stay_id, category, name, description, price, image_url, available, sort_order)
SELECT s.id, m.category, m.name, m.description, m.price, m.image_url, true, m.sort_order
FROM new_stay s, (VALUES
  ('room'::TEXT, 'Garden View Room', 'Quiet room overlooking our lush garden, queen bed, AC, and en-suite.', 4500::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 1),
  ('room'::TEXT, 'Lake View Suite', 'Spacious suite with private balcony directly facing Phewa Lake.', 8000::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 2),
  ('food'::TEXT, 'Continental Breakfast Platter', 'Fresh fruit, yogurt, eggs your way, toast, and filter coffee.', 900::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 3),
  ('food'::TEXT, 'Newari Khaja Set', 'Beaten rice, black-eyed peas, spiced buffalo meat, egg, and achar.', 850::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Mokto_or_moktoo_02.jpg/1280px-Mokto_or_moktoo_02.jpg', 4),
  ('food'::TEXT, 'Grilled Trout with Vegetables', 'Locally farmed Phewa Lake trout, grilled with seasonal vegetables.', 1200::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Mokto_or_moktoo_02.jpg/1280px-Mokto_or_moktoo_02.jpg', 5)
) AS m(category, name, description, price, image_url, sort_order);

-- Stay 4: Chitwan Jungle Camp
WITH new_stay AS (
  INSERT INTO stays (owner_user_id, name, slug, stay_type, location, description, image_url, price_per_night, contact_phone, latitude, longitude)
  SELECT u.id, 'Chitwan Jungle Camp', 'chitwan-jungle-camp', 'homestay', 'Sauraha, Chitwan',
    'Eco-friendly jungle camp on the edge of Chitwan National Park. Wake up to elephant calls, explore the park on foot or by canoe, and enjoy organic farm-to-table meals with your hosting Tharu family.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Teahouse_Himalaya.jpg/1280px-Teahouse_Himalaya.jpg', 3200, '+977-9800000004', 27.5749, 84.5057
  FROM users u WHERE u.username = 'admin'
  RETURNING id
)
INSERT INTO menu_items (stay_id, category, name, description, price, image_url, available, sort_order)
SELECT s.id, m.category, m.name, m.description, m.price, m.image_url, true, m.sort_order
FROM new_stay s, (VALUES
  ('room'::TEXT, 'Jungle Cottage', 'Private thatched cottage with two beds, mosquito net, fan, and en-suite bathroom.', 3200::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 1),
  ('room'::TEXT, 'Tharu Mud House Room', 'Authentic Tharu-style mud-walled room for a genuine village stay experience.', 2000::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 2),
  ('food'::TEXT, 'Tharu Feast Dinner', 'Five-dish Tharu community dinner: rice, fish curry, seasonal greens, lentils, and pickle.', 900::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 3),
  ('food'::TEXT, 'Jungle Breakfast', 'Local millet porridge, fresh papaya, scrambled eggs, and masala tea.', 600::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 4),
  ('food'::TEXT, 'Bamboo Shoot Curry Lunch', 'Traditional Tharu bamboo shoot and lentil curry served with steamed rice.', 700::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Mokto_or_moktoo_02.jpg/1280px-Mokto_or_moktoo_02.jpg', 5)
) AS m(category, name, description, price, image_url, sort_order);

-- Stay 5: Bandipur Heritage Guesthouse
WITH new_stay AS (
  INSERT INTO stays (owner_user_id, name, slug, stay_type, location, description, image_url, price_per_night, contact_phone, latitude, longitude)
  SELECT u.id, 'Bandipur Heritage Guesthouse', 'bandipur-heritage-guesthouse', 'hotel', 'Bandipur, Tanahun',
    'Restored Newari house with carved wooden windows, hilltop valley views, and easy walking access to Bandipur bazaar.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Teahouse_Himalaya.jpg/1280px-Teahouse_Himalaya.jpg', 3800, '+977-9800000005', 27.9364, 84.4195
  FROM users u WHERE u.username = 'admin'
  RETURNING id
)
INSERT INTO menu_items (stay_id, category, name, description, price, image_url, available, sort_order)
SELECT s.id, m.category, m.name, m.description, m.price, m.image_url, true, m.sort_order
FROM new_stay s, (VALUES
  ('room'::TEXT, 'Heritage Double Room', 'Wooden-floored double room with attached bathroom and traditional decor.', 3800::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 1),
  ('room'::TEXT, 'Family Attic Room', 'Large attic room for up to four guests with sweeping valley windows.', 5200::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 2),
  ('food'::TEXT, 'Bandipur Breakfast Set', 'Fresh fruit, local bread, eggs, and Nepali milk tea.', 700::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 3),
  ('food'::TEXT, 'Local Newari Thali', 'Traditional Newari platter with rice flakes, curry, pickle, and seasonal sides.', 950::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Mokto_or_moktoo_02.jpg/1280px-Mokto_or_moktoo_02.jpg', 4)
) AS m(category, name, description, price, image_url, sort_order);

-- Stay 6: Nagarkot Sunrise Lodge
WITH new_stay AS (
  INSERT INTO stays (owner_user_id, name, slug, stay_type, location, description, image_url, price_per_night, contact_phone, latitude, longitude)
  SELECT u.id, 'Nagarkot Sunrise Lodge', 'nagarkot-sunrise-lodge', 'homestay', 'Nagarkot, Bhaktapur',
    'Quiet ridge-side stay known for Himalayan sunrise decks, pine-forest trails, and cozy evening fireplaces.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Teahouse_Himalaya.jpg/1280px-Teahouse_Himalaya.jpg', 2900, '+977-9800000006', 27.7120, 85.5208
  FROM users u WHERE u.username = 'admin'
  RETURNING id
)
INSERT INTO menu_items (stay_id, category, name, description, price, image_url, available, sort_order)
SELECT s.id, m.category, m.name, m.description, m.price, m.image_url, true, m.sort_order
FROM new_stay s, (VALUES
  ('room'::TEXT, 'Sunrise Balcony Room', 'Private balcony room ideal for early-morning mountain panoramas.', 2900::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 1),
  ('room'::TEXT, 'Cozy Pine Cabin', 'Warm wooden cabin with heater, writing desk, and forest-facing windows.', 3400::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 2),
  ('food'::TEXT, 'Millet Pancake Breakfast', 'House-made millet pancakes with honey and seasonal fruit.', 550::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 3),
  ('food'::TEXT, 'Steam Momo Basket', 'Steamed vegetable and chicken momos with spicy tomato achar.', 650::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Mokto_or_moktoo_02.jpg/1280px-Mokto_or_moktoo_02.jpg', 4),
  ('food'::TEXT, 'Ginger Garlic Thukpa', 'Light noodle soup with herbs, vegetables, and mountain spices.', 600::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Mokto_or_moktoo_02.jpg/1280px-Mokto_or_moktoo_02.jpg', 5)
) AS m(category, name, description, price, image_url, sort_order);

-- Sample accepted order for Ghandruk Homestay
DO $$
DECLARE
  v_stay_id UUID;
  v_room_id UUID;
  v_food_id UUID;
  v_group_id UUID := gen_random_uuid();
BEGIN
  SELECT id INTO v_stay_id FROM stays WHERE slug = 'ghandruk-homestay';
  SELECT id INTO v_room_id FROM menu_items WHERE stay_id = v_stay_id AND category = 'room' LIMIT 1;
  SELECT id INTO v_food_id FROM menu_items WHERE stay_id = v_stay_id AND category = 'food' ORDER BY sort_order LIMIT 1;

  INSERT INTO orders (order_group_id, stay_id, menu_item_id, menu_item_name, menu_item_category, unit_price, quantity, total_price, customer_name, customer_email, customer_phone, notes, status)
  SELECT v_group_id, v_stay_id, v_room_id, 'Mountain View Room', 'room', price, 2, price * 2,
         'Priya Sharma', 'priya@example.com', '+977-9811234567', 'Arriving evening of the 15th.', 'accepted'
  FROM menu_items WHERE id = v_room_id;

  INSERT INTO orders (order_group_id, stay_id, menu_item_id, menu_item_name, menu_item_category, unit_price, quantity, total_price, customer_name, customer_email, customer_phone, notes, status)
  SELECT v_group_id, v_stay_id, v_food_id, name, 'food', price, 4, price * 4,
         'Priya Sharma', 'priya@example.com', '+977-9811234567', 'Arriving evening of the 15th.', 'accepted'
  FROM menu_items WHERE id = v_food_id;
END $$;

-- Pending order for Namche Teahouse Hotel
DO $$
DECLARE
  v_stay_id UUID;
  v_room_id UUID;
  v_group_id UUID := gen_random_uuid();
BEGIN
  SELECT id INTO v_stay_id FROM stays WHERE slug = 'namche-teahouse-hotel';
  SELECT id INTO v_room_id FROM menu_items WHERE stay_id = v_stay_id AND category = 'room' AND name LIKE 'Standard%' LIMIT 1;

  INSERT INTO orders (order_group_id, stay_id, menu_item_id, menu_item_name, menu_item_category, unit_price, quantity, total_price, customer_name, customer_email, customer_phone, status)
  SELECT v_group_id, v_stay_id, v_room_id, name, 'room', price, 3, price * 3,
         'James Walker', 'james@example.com', '+44-7700900123', 'pending'
  FROM menu_items WHERE id = v_room_id;
END $$;

