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

ALTER TABLE stays
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE stays
  ADD COLUMN IF NOT EXISTS discount_percent INT NOT NULL DEFAULT 0;

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
    'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Ghandruk_%286%29.JPG/1280px-Ghandruk_%286%29.JPG', 2500, '+977-9800000001', 28.3735, 83.8082
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
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Namche_bazzar.jpg/1280px-Namche_bazzar.jpg', 3500, '+977-9800000002', 27.8050, 86.7140
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
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Phewa_Lake_of_Pokhara_city.jpg/1280px-Phewa_Lake_of_Pokhara_city.jpg', 4500, '+977-9800000003', 28.2096, 83.9556
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
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Asian_Elephant_Safari_in_Chitwan_National_Park%2C_Chitwan%2C_Nepal_%28Indian_Rhinoceros_Unicornis%29_05.jpg/1280px-Asian_Elephant_Safari_in_Chitwan_National_Park%2C_Chitwan%2C_Nepal_%28Indian_Rhinoceros_Unicornis%29_05.jpg', 3200, '+977-9800000004', 27.5749, 84.5057
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
    'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Mountain_view_from_Bandipur%2C_Nepal.jpg/1280px-Mountain_view_from_Bandipur%2C_Nepal.jpg', 3800, '+977-9800000005', 27.9364, 84.4195
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
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/The_Nagarkot_Photography_Experiences.JPG/1280px-The_Nagarkot_Photography_Experiences.JPG', 2900, '+977-9800000006', 27.7120, 85.5208
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


-- Stay 7: Thamel Boutique Hotel (Kathmandu)
WITH new_stay AS (
  INSERT INTO stays (owner_user_id, name, slug, stay_type, location, description, image_url, price_per_night, contact_phone, latitude, longitude, is_featured, discount_percent)
  SELECT u.id, 'Thamel Boutique Hotel', 'thamel-boutique-hotel', 'hotel', 'Thamel, Kathmandu',
    'Stylish boutique hotel in the heart of Thamel — Kathmandu''s vibrant traveller district. Steps from restaurants, shops, and temples, with rooftop Himalayan views and modern amenities.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Kathmandu%2C_Nepal%2C_Thamel_streets.jpg/1280px-Kathmandu%2C_Nepal%2C_Thamel_streets.jpg', 6500, '+977-9800000007', 27.7172, 85.3096, true, 15
  FROM users u WHERE u.username = 'admin'
  RETURNING id
)
INSERT INTO menu_items (stay_id, category, name, description, price, image_url, available, sort_order)
SELECT s.id, m.category, m.name, m.description, m.price, m.image_url, true, m.sort_order
FROM new_stay s, (VALUES
  ('room'::TEXT, 'Deluxe Double Room', 'Air-conditioned room with king bed, city view, en-suite, and free breakfast.', 6500::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 1),
  ('room'::TEXT, 'Rooftop Suite', 'Spacious suite on the top floor with Himalayan horizon views and a private terrace.', 11000::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 2),
  ('food'::TEXT, 'Nepali Breakfast Platter', 'Fresh samosas, sel roti, beaten rice, chiya, and seasonal fruit.', 850::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 3),
  ('food'::TEXT, 'Kathmandu Set Lunch', 'Dal bhat with mixed curry, achar, and seasonal vegetables.', 750::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 4),
  ('food'::TEXT, 'Rooftop Momo Basket', 'Pan-fried momos with sesame achar served on the rooftop terrace.', 700::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Mokto_or_moktoo_02.jpg/1280px-Mokto_or_moktoo_02.jpg', 5)
) AS m(category, name, description, price, image_url, sort_order);

-- Stay 8: Bhaktapur Heritage Inn
WITH new_stay AS (
  INSERT INTO stays (owner_user_id, name, slug, stay_type, location, description, image_url, price_per_night, contact_phone, latitude, longitude, is_featured, discount_percent)
  SELECT u.id, 'Bhaktapur Heritage Inn', 'bhaktapur-heritage-inn', 'hotel', 'Bhaktapur, Bagmati',
    'Atmospheric hotel inside a lovingly restored Newari merchant house. Windows open onto carved courtyards, and the rooftop restaurant overlooks Bhaktapur Durbar Square.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Bhaktapur_Durbar_Square_5.jpg/1280px-Bhaktapur_Durbar_Square_5.jpg', 4200, '+977-9800000008', 27.6724, 85.4277, true, 0
  FROM users u WHERE u.username = 'admin'
  RETURNING id
)
INSERT INTO menu_items (stay_id, category, name, description, price, image_url, available, sort_order)
SELECT s.id, m.category, m.name, m.description, m.price, m.image_url, true, m.sort_order
FROM new_stay s, (VALUES
  ('room'::TEXT, 'Courtyard View Double', 'Traditional Newari room facing the carved stone courtyard with hand-painted ceiling.', 4200::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 1),
  ('room'::TEXT, 'Square View Suite', 'Top-floor suite with direct views of Bhaktapur Durbar Square.', 7500::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 2),
  ('food'::TEXT, 'Newari Samay Baji', 'Traditional Newari feast: beaten rice, roasted soybeans, egg, achar, and Lyang Lyang.', 1100::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 3),
  ('food'::TEXT, 'Juju Dhau Dessert', 'Bhaktapur''s famous ''king curd'' with honey and crushed roasted nuts.', 400::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 4)
) AS m(category, name, description, price, image_url, sort_order);

-- Stay 9: Patan Cultural Homestay
WITH new_stay AS (
  INSERT INTO stays (owner_user_id, name, slug, stay_type, location, description, image_url, price_per_night, contact_phone, latitude, longitude, is_featured, discount_percent)
  SELECT u.id, 'Patan Cultural Homestay', 'patan-cultural-homestay', 'homestay', 'Patan, Lalitpur',
    'Live like a local in a 200-year-old Newari home metres from Patan Durbar Square. Your hosts share family recipes, temple rituals, and the rhythms of old Nepal.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Nepal_Patan_Durbar_Square_10_%28full_res%29.jpg/1280px-Nepal_Patan_Durbar_Square_10_%28full_res%29.jpg', 2800, '+977-9800000009', 27.6710, 85.3248, false, 0
  FROM users u WHERE u.username = 'admin'
  RETURNING id
)
INSERT INTO menu_items (stay_id, category, name, description, price, image_url, available, sort_order)
SELECT s.id, m.category, m.name, m.description, m.price, m.image_url, true, m.sort_order
FROM new_stay s, (VALUES
  ('room'::TEXT, 'Family Courtyard Room', 'Shared bathroom, hand-carved wooden bed, and access to the family rooftop.', 2800::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 1),
  ('food'::TEXT, 'Newari Home Dinner', 'Authentic family-cooked Newari meal with guided stories about each dish.', 950::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 2),
  ('food'::TEXT, 'Morning Chiya & Sweets', 'Spiced milk tea with sel roti and local sesame sweets.', 300::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 3)
) AS m(category, name, description, price, image_url, sort_order);

-- Stay 10: Lumbini Peace Guest House
WITH new_stay AS (
  INSERT INTO stays (owner_user_id, name, slug, stay_type, location, description, image_url, price_per_night, contact_phone, latitude, longitude, is_featured, discount_percent)
  SELECT u.id, 'Lumbini Peace Guest House', 'lumbini-peace-guest-house', 'homestay', 'Lumbini, Rupandehi',
    'Tranquil guesthouse beside the birthplace of the Buddha. Cycle to the sacred Mayadevi Temple, stroll through the monastery zone, and unwind in our meditation garden.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/World_Peace_Pagoda_Lumbini%2C_Nepal.jpg/1280px-World_Peace_Pagoda_Lumbini%2C_Nepal.jpg', 2200, '+977-9800000010', 27.4833, 83.2763, false, 20
  FROM users u WHERE u.username = 'admin'
  RETURNING id
)
INSERT INTO menu_items (stay_id, category, name, description, price, image_url, available, sort_order)
SELECT s.id, m.category, m.name, m.description, m.price, m.image_url, true, m.sort_order
FROM new_stay s, (VALUES
  ('room'::TEXT, 'Garden Cottage Room', 'Peaceful private room with garden access, mosquito nets, and ceiling fan.', 2200::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 1),
  ('food'::TEXT, 'Vegetarian Thali', 'Daily rotating plant-based Nepali thali with seasonal curries and fresh roti.', 550::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 2),
  ('food'::TEXT, 'Mindful Morning Breakfast', 'Porridge, fresh mango, herbal tea, and multigrain toast.', 400::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 3)
) AS m(category, name, description, price, image_url, sort_order);

-- Stay 11: Everest View Hotel
WITH new_stay AS (
  INSERT INTO stays (owner_user_id, name, slug, stay_type, location, description, image_url, price_per_night, contact_phone, latitude, longitude, is_featured, discount_percent)
  SELECT u.id, 'Everest View Hotel', 'everest-view-hotel', 'hotel', 'Syangboche, Solukhumbu',
    'The world''s highest-altitude hotel at 3,880m, perched on a ridge with an unobstructed panorama of Everest, Lhotse, Ama Dablam, and the entire Khumbu icefall.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Everest_View_Hotel.jpg/1280px-Everest_View_Hotel.jpg', 12000, '+977-9800000011', 27.8147, 86.7239, true, 0
  FROM users u WHERE u.username = 'admin'
  RETURNING id
)
INSERT INTO menu_items (stay_id, category, name, description, price, image_url, available, sort_order)
SELECT s.id, m.category, m.name, m.description, m.price, m.image_url, true, m.sort_order
FROM new_stay s, (VALUES
  ('room'::TEXT, 'Everest Panorama Room', 'Private room with floor-to-ceiling glass, heated oxygen supplement, and attached bath.', 12000::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 1),
  ('room'::TEXT, 'Premium Summit Suite', 'Sprawling suite for two with 270-degree Everest panorama and personal butler service.', 22000::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 2),
  ('food'::TEXT, 'High-Altitude Set Dinner', 'Hearty multi-course dinner designed for acclimatisation — soup, protein, carbs, dessert.', 2500::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 3),
  ('food'::TEXT, 'Sherpa Breakfast Basket', 'Hot porridge, boiled eggs, yak butter toast, and herbal altitude tea.', 1800::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 4)
) AS m(category, name, description, price, image_url, sort_order);

-- Stay 12: Manang Mountain Lodge
WITH new_stay AS (
  INSERT INTO stays (owner_user_id, name, slug, stay_type, location, description, image_url, price_per_night, contact_phone, latitude, longitude, is_featured, discount_percent)
  SELECT u.id, 'Manang Mountain Lodge', 'manang-mountain-lodge', 'hotel', 'Manang, Annapurna',
    'Acclimatisation lodge at 3,519m on the Annapurna Circuit. Cosy rooms, a wood-fire dining hall with potato-and-yak meals, and dramatic Gangapurna Glacier views outside every window.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Teahouse_Himalaya.jpg/1280px-Teahouse_Himalaya.jpg', 3400, '+977-9800000012', 28.6700, 84.0200, false, 10
  FROM users u WHERE u.username = 'admin'
  RETURNING id
)
INSERT INTO menu_items (stay_id, category, name, description, price, image_url, available, sort_order)
SELECT s.id, m.category, m.name, m.description, m.price, m.image_url, true, m.sort_order
FROM new_stay s, (VALUES
  ('room'::TEXT, 'Glacier View Room', 'Twin room with wood-fire heating, thick quilts, and Gangapurna Glacier views.', 3400::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 1),
  ('food'::TEXT, 'Yak Potato Soup', 'Hearty broth with slow-cooked yak and local potatoes.', 600::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Mokto_or_moktoo_02.jpg/1280px-Mokto_or_moktoo_02.jpg', 2),
  ('food'::TEXT, 'Circuit Dal Bhat', 'Unlimited dal bhat with two refills of rice, lentils, and seasonal vegetable curry.', 700::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 3)
) AS m(category, name, description, price, image_url, sort_order);

-- Set featured and discount flags on existing stays
UPDATE stays SET is_featured = true, discount_percent = 15 WHERE slug = 'ghandruk-homestay';
UPDATE stays SET is_featured = true WHERE slug = 'namche-teahouse-hotel';
UPDATE stays SET is_featured = true WHERE slug = 'pokhara-lakeside-inn';
UPDATE stays SET discount_percent = 10 WHERE slug = 'chitwan-jungle-camp';

-- Sample reviews
INSERT INTO stay_reviews (stay_id, reviewer_name, reviewer_initials, rating, comment) VALUES
  ((SELECT id FROM stays WHERE slug = 'ghandruk-homestay'), 'Priya Sharma', 'PS', 5, 'Absolutely magical sunrise from the rooftop — Annapurna South was glowing pink. The family was so warm and the dal bhat was the best we had on the whole trek.'),
  ((SELECT id FROM stays WHERE slug = 'ghandruk-homestay'), 'James Walker', 'JW', 4, 'Authentic Gurung hospitality. Great home-cooked meals and genuine cultural exchange. A bit cold at night but that''s part of the mountain experience.'),
  ((SELECT id FROM stays WHERE slug = 'ghandruk-homestay'), 'Yuki Tanaka', 'YT', 5, 'Stayed 2 nights on the Poon Hill loop. Perfect base for exploring the village trails. Highly recommend the Gurung bread with honey!'),
  ((SELECT id FROM stays WHERE slug = 'namche-teahouse-hotel'), 'Maria Chen', 'MC', 5, 'Best views in Namche! Hot showers were an incredible luxury after trekking. WiFi worked great for video calls.'),
  ((SELECT id FROM stays WHERE slug = 'namche-teahouse-hotel'), 'David Kim', 'DK', 4, 'Solid teahouse in a prime Namche location. Rooms are simple but comfortable. Yak cheese omelette for breakfast was amazing.'),
  ((SELECT id FROM stays WHERE slug = 'pokhara-lakeside-inn'), 'Sophie Laurent', 'SL', 5, 'The lake view suite was a dream. Watching the sun rise over Machhapuchhre from bed is something I''ll never forget. Superb breakfast too.'),
  ((SELECT id FROM stays WHERE slug = 'pokhara-lakeside-inn'), 'Ahmed Hassan', 'AH', 5, 'Best hotel in Pokhara for the price. Rooftop breakfast terrace is stunning. Staff went above and beyond for our anniversary dinner.'),
  ((SELECT id FROM stays WHERE slug = 'pokhara-lakeside-inn'), 'Emma Schmidt', 'ES', 4, 'Lovely quiet garden. The trout was fresh and delicious. The lake is literally a 2-minute walk.'),
  ((SELECT id FROM stays WHERE slug = 'chitwan-jungle-camp'), 'Carlos Rivera', 'CR', 5, 'Woke up to a rhino walking by the camp fence! The Tharu guides were incredible — knowledgeable and super friendly. Food was organic and delicious.'),
  ((SELECT id FROM stays WHERE slug = 'chitwan-jungle-camp'), 'Lisa Johnson', 'LJ', 4, 'Genuine eco experience. A bit basic (no AC) but that''s the point. The canoe safari at dawn was absolutely worth it.'),
  ((SELECT id FROM stays WHERE slug = 'bandipur-heritage-guesthouse'), 'Tom Hughes', 'TH', 5, 'Bandipur is the most underrated town in Nepal and this guesthouse fits right in. Beautiful carved windows, valley views, and lovely hosts.'),
  ((SELECT id FROM stays WHERE slug = 'nagarkot-sunrise-lodge'), 'Anna Kowalski', 'AK', 5, 'The Himalayan sunrise deck delivers exactly what it promises. Arrived at 5:30am in a blanket to watch Everest glow orange. Unforgettable.'),
  ((SELECT id FROM stays WHERE slug = 'nagarkot-sunrise-lodge'), 'Ravi Patel', 'RP', 4, 'Quiet, peaceful, and great views. Momo basket by the fire was the perfect evening. Easy day trip from Kathmandu.'),
  ((SELECT id FROM stays WHERE slug = 'thamel-boutique-hotel'), 'Sarah Miller', 'SM', 5, 'The rooftop suite had jaw-dropping views of the mountains on a clear morning. Walking distance to Thamel restaurants and Boudhanath. Will come back.'),
  ((SELECT id FROM stays WHERE slug = 'thamel-boutique-hotel'), 'Kevin Park', 'KP', 4, 'Super central location, friendly staff, and the breakfast platter was generous. Rooms are well-designed and quiet despite being in Thamel.'),
  ((SELECT id FROM stays WHERE slug = 'bhaktapur-heritage-inn'), 'Isabelle Dubois', 'ID', 5, 'The Newari architecture is stunning. Falling asleep to the sound of the temple bells and waking up to the square was a once-in-a-lifetime experience.'),
  ((SELECT id FROM stays WHERE slug = 'bhaktapur-heritage-inn'), 'Oliver Brown', 'OB', 5, 'The Samay Baji dinner guided by the owner was the cultural highlight of our Nepal trip. Juju Dhau for dessert — don''t skip it!'),
  ((SELECT id FROM stays WHERE slug = 'patan-cultural-homestay'), 'Nina Rossi', 'NR', 5, 'Incredible immersion. Our host took us to a family puja ceremony we never would have found otherwise. Simple room, extraordinary experience.'),
  ((SELECT id FROM stays WHERE slug = 'lumbini-peace-guest-house'), 'Ben Turner', 'BT', 5, 'The perfect place to slow down and reflect. The meditation garden is beautiful, and cycling to the sacred garden at sunrise was deeply moving.'),
  ((SELECT id FROM stays WHERE slug = 'everest-view-hotel'), 'Hannah Mueller', 'HM', 5, 'At 3,880m, seeing Everest from your bedroom window is surreal. The oxygen system made acclimatisation much easier. Worth every rupee.'),
  ((SELECT id FROM stays WHERE slug = 'everest-view-hotel'), 'Marcus Johansson', 'MJ', 5, 'The most dramatic hotel view I have ever experienced. Check in at sunset for the full effect — the Khumbu turns gold and pink.'),
  ((SELECT id FROM stays WHERE slug = 'manang-mountain-lodge'), 'Rachel Green', 'RG', 4, 'Perfect acclimatisation day base. The yak potato soup is hearty and warming. Staff gave great advice on the Thorong La crossing.');

-- Stay 13: Lukla Adventure Hotel (Everest - gateway town)
WITH new_stay AS (
  INSERT INTO stays (owner_user_id, name, slug, stay_type, location, description, image_url, price_per_night, contact_phone, latitude, longitude, is_featured, discount_percent)
  SELECT u.id, 'Lukla Adventure Hotel', 'lukla-adventure-hotel', 'hotel', 'Lukla, Solukhumbu',
    'Your first night after landing at Lukla – relax in style before the trek begins. Modern ensuite rooms, oxygen-assisted showers, and a rooftop bar with flight-watching views.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Tenzing-Hillary_Airport_Lukla.jpg/1280px-Tenzing-Hillary_Airport_Lukla.jpg', 5200, '+977-9800000013', 27.6882, 86.7300, true, 12
  FROM users u WHERE u.username = 'admin'
  RETURNING id
)
INSERT INTO menu_items (stay_id, category, name, description, price, image_url, available, sort_order)
SELECT s.id, m.category, m.name, m.description, m.price, m.image_url, true, m.sort_order
FROM new_stay s, (VALUES
  ('room'::TEXT, 'Comfort Double Room', 'Heated twin room with ensuite hot shower, down blankets, and oxygen access.', 5200::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 1),
  ('room'::TEXT, 'Deluxe Suite with Summit View', 'Premium suite with mountain views, private balcony, and heated bathroom.', 8500::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 2),
  ('food'::TEXT, 'Pre-Trek Feast Dinner', 'Three-course meal to fuel up: soup, main with protein, fresh fruit dessert.', 1100::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 3),
  ('food'::TEXT, 'Sherpa Breakfast Combo', 'Four types of Sherpa breads with yak butter, honey, and boiled eggs.', 800::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 4),
  ('food'::TEXT, 'Rooftop Bar Momos', 'Himalayan-style momos served with spicy achar under the stars.', 700::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Mokto_or_moktoo_02.jpg/1280px-Mokto_or_moktoo_02.jpg', 5)
) AS m(category, name, description, price, image_url, sort_order);

-- Stay 14: Dingboche Mountain Lodge (Everest - acclimatisation)
WITH new_stay AS (
  INSERT INTO stays (owner_user_id, name, slug, stay_type, location, description, image_url, price_per_night, contact_phone, latitude, longitude, is_featured, discount_percent)
  SELECT u.id, 'Dingboche Mountain Lodge', 'dingboche-mountain-lodge', 'hotel', 'Dingboche, Solukhumbu',
    'Key acclimatisation stop at 4,410m. Comfort meets altitude — heated rooms, hot water, and a cosy dining hall with daily weather briefings for summit climbers.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Ama_Dablam_%282%29.jpg/1280px-Ama_Dablam_%282%29.jpg', 4800, '+977-9800000014', 27.8930, 86.8310, false, 8
  FROM users u WHERE u.username = 'admin'
  RETURNING id
)
INSERT INTO menu_items (stay_id, category, name, description, price, image_url, available, sort_order)
SELECT s.id, m.category, m.name, m.description, m.price, m.image_url, true, m.sort_order
FROM new_stay s, (VALUES
  ('room'::TEXT, 'Ama Dablam View Room', 'Twin beds with direct views of iconic Ama Dablam, heated via wood stove.', 4800::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 1),
  ('room'::TEXT, 'Acclimatisation Suite', 'Spacious suite designed for trekkers spending 2 nights, with day lounge access.', 7600::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 2),
  ('food'::TEXT, 'Altitude Soup & Bread', 'Light, nourishing vegetable soup with local barley bread for acclimatisation.', 550::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Mokto_or_moktoo_02.jpg/1280px-Mokto_or_moktoo_02.jpg', 3),
  ('food'::TEXT, 'Acclimatisation Stew', 'Slow-cooked potato and root vegetable stew designed for high altitude digestion.', 700::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 4)
) AS m(category, name, description, price, image_url, sort_order);

-- Stay 15: Ghorepani Poon Hill Inn (Annapurna - panoramic sunrise)
WITH new_stay AS (
  INSERT INTO stays (owner_user_id, name, slug, stay_type, location, description, image_url, price_per_night, contact_phone, latitude, longitude, is_featured, discount_percent)
  SELECT u.id, 'Ghorepani Poon Hill Inn', 'ghorepani-poon-hill-inn', 'hotel', 'Ghorepani, Kaski',
    'Traditional teahouse inside a rhododendron forest at 2,874m. Wake before dawn to hike to Poon Hill — a 30-minute summit with a 360° Himalayan sunrise view.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Poon_hill%2C_Ghorepani.jpg/1280px-Poon_hill%2C_Ghorepani.jpg', 2600, '+977-9800000015', 28.4000, 83.6900, true, 0
  FROM users u WHERE u.username = 'admin'
  RETURNING id
)
INSERT INTO menu_items (stay_id, category, name, description, price, image_url, available, sort_order)
SELECT s.id, m.category, m.name, m.description, m.price, m.image_url, true, m.sort_order
FROM new_stay s, (VALUES
  ('room'::TEXT, 'Sunrise Room', 'Basic room with forest view, coal heater, and warm blankets for the climb.', 2600::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 1),
  ('room'::TEXT, 'Panorama Suite', 'Larger room with window seat facing Dhaulagiri and Annapurna peaks.', 4200::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 2),
  ('food'::TEXT, 'Pre-Summit Breakfast', '4 AM: hot porridge, boiled eggs, and thermos of ginger tea for the climb.', 450::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 3),
  ('food'::TEXT, 'Post-Climb Feast', 'Celebration lunch after returning from Poon Hill: 3-course Nepali feast.', 850::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Mokto_or_moktoo_02.jpg/1280px-Mokto_or_moktoo_02.jpg', 4),
  ('food'::TEXT, 'Rhododendron Trail Packed Lunch', 'Homemade sandwiches, dried fruit, and snacks for day hikes in the forest.', 600::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 5)
) AS m(category, name, description, price, image_url, sort_order);

-- Stay 16: ABC Sanctuary Lodge (Annapurna Base Camp approach)
WITH new_stay AS (
  INSERT INTO stays (owner_user_id, name, slug, stay_type, location, description, image_url, price_per_night, contact_phone, latitude, longitude, is_featured, discount_percent)
  SELECT u.id, 'ABC Sanctuary Lodge', 'abc-sanctuary-lodge', 'homestay', 'Bamboo, Annapurna',
    'Family-run homestay on the Annapurna Base Camp route at 2,310m. Sleep in a restored farmhouse, join the family in the kitchen, and wake to Annapurna South filling your window.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Annapurna_I_from_Paxarbasti.jpg/1280px-Annapurna_I_from_Paxarbasti.jpg', 2400, '+977-9800000016', 28.4400, 83.8000, false, 5
  FROM users u WHERE u.username = 'admin'
  RETURNING id
)
INSERT INTO menu_items (stay_id, category, name, description, price, image_url, available, sort_order)
SELECT s.id, m.category, m.name, m.description, m.price, m.image_url, true, m.sort_order
FROM new_stay s, (VALUES
  ('room'::TEXT, 'Farmhouse Double Room', 'Traditional room with wood furnishings, shared hot shower, and mountain view.', 2400::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 1),
  ('room'::TEXT, 'Family Loft', 'Spacious loft for groups of up to 4, with skylight views of the glacier.', 3600::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 2),
  ('food'::TEXT, 'Family Kitchen Dinner', 'Cook alongside the family and learn Annapurna Region recipes — 5-course meal.', 850::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 3),
  ('food'::TEXT, 'Farmhouse Breakfast', 'Flour made from local wheat, fresh yogurt, honey, and homemade bread.', 500::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 4),
  ('food'::TEXT, 'Packed Lunch for Trail', 'Homemade roti, cheese, vegetables, and seasonal fruit for the ABC route.', 600::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 5)
) AS m(category, name, description, price, image_url, sort_order);

-- Stay 17: Kyanjin Ri Lodge (Langtang - high altitude)
WITH new_stay AS (
  INSERT INTO stays (owner_user_id, name, slug, stay_type, location, description, image_url, price_per_night, contact_phone, latitude, longitude, is_featured, discount_percent)
  SELECT u.id, 'Kyanjin Ri Lodge', 'kyanjin-ri-lodge', 'hotel', 'Kyanjin, Langtang',
    'At 3,870m, this is the highest staying point on Langtang Valley trek. Panoramic ridge views, cheese factory nearby, and perfect base for glacier exploration.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Langtang_Valley.jpg/1280px-Langtang_Valley.jpg', 3100, '+977-9800000017', 28.2100, 85.5600, true, 0
  FROM users u WHERE u.username = 'admin'
  RETURNING id
)
INSERT INTO menu_items (stay_id, category, name, description, price, image_url, available, sort_order)
SELECT s.id, m.category, m.name, m.description, m.price, m.image_url, true, m.sort_order
FROM new_stay s, (VALUES
  ('room'::TEXT, 'Alpine Twin Room', 'Basic heated room with thick quilts and high-altitude adapted menu planning.', 3100::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 1),
  ('room'::TEXT, 'Glacier View Deluxe', 'Larger room facing the Langtang Glacier with upgrade to premium meals.', 5200::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 2),
  ('food'::TEXT, 'Yak Cheese Specialty', 'Fresh local yak cheese served three ways: raw, in curry, and as desert.', 750::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Mokto_or_moktoo_02.jpg/1280px-Mokto_or_moktoo_02.jpg', 3),
  ('food'::TEXT, 'Alpine Nourishment Stew', 'High-calorie slow-cooked chunky vegetable and potato stew with yak meat.', 800::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 4)
) AS m(category, name, description, price, image_url, sort_order);

-- Stay 18: Gilded Lantern Dhunche (Langtang gateway)
WITH new_stay AS (
  INSERT INTO stays (owner_user_id, name, slug, stay_type, location, description, image_url, price_per_night, contact_phone, latitude, longitude, is_featured, discount_percent)
  SELECT u.id, 'Gilded Lantern Dhunche', 'gilded-lantern-dhunche', 'homestay', 'Dhunche, Nuwakot',
    'Charming homestay where the Langtang Trek begins. Local owners share stories over dinner, and they''ll pack your trail lunches with their family recipes.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Dhunche_village_landscape.jpg/1280px-Dhunche_village_landscape.jpg', 2300, '+977-9800000018', 28.1100, 85.3000, false, 0
  FROM users u WHERE u.username = 'admin'
  RETURNING id
)
INSERT INTO menu_items (stay_id, category, name, description, price, image_url, available, sort_order)
SELECT s.id, m.category, m.name, m.description, m.price, m.image_url, true, m.sort_order
FROM new_stay s, (VALUES
  ('room'::TEXT, 'Trekker''s Twin Room', 'Cosy double room, shared hot shower, and family living room access.', 2300::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 1),
  ('food'::TEXT, 'Langtang Sendoff Dinner', 'Five-course meal to energise for the trek start — local specialties.', 800::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 2),
  ('food'::TEXT, 'Home-Packed Trail Lunch', 'Custom lunch boxes with local bread, pickle, cheese, and dried fruit.', 500::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 3)
) AS m(category, name, description, price, image_url, sort_order);

-- Stay 19: Manaslu Circuit Serena (Manaslu - premium lodge)
WITH new_stay AS (
  INSERT INTO stays (owner_user_id, name, slug, stay_type, location, description, image_url, price_per_night, contact_phone, latitude, longitude, is_featured, discount_percent)
  SELECT u.id, 'Manaslu Circuit Serena', 'manaslu-circuit-serena', 'hotel', 'Samagaon, Gorkha',
    'Premium lodge on the Manaslu Circuit at 3,860m. Private rooms with mod cons, a wood-fire lounge, and daily briefings on the Larkya La pass ahead.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Manaslu_%281%29.jpg/1280px-Manaslu_%281%29.jpg', 5500, '+977-9800000019', 28.6200, 84.9500, true, 10
  FROM users u WHERE u.username = 'admin'
  RETURNING id
)
INSERT INTO menu_items (stay_id, category, name, description, price, image_url, available, sort_order)
SELECT s.id, m.category, m.name, m.description, m.price, m.image_url, true, m.sort_order
FROM new_stay s, (VALUES
  ('room'::TEXT, 'Mountain View Suite', 'Private room with ensuite, oxygen access, and 180° Manaslu views.', 5500::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 1),
  ('room'::TEXT, 'Premium Lounge Deluxe', 'Spacious suite with lounge seating, private heater, and mountain panorama.', 8200::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 2),
  ('food'::TEXT, 'Manaslu Summit Feast', 'Three-course dinner to fuel for the Larkya La crossing.', 1200::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 3),
  ('food'::TEXT, 'High-Altitude Breakfast', 'Warm porridge, eggs, toast, and butter tea designed for altitude.', 850::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 4)
) AS m(category, name, description, price, image_url, sort_order);

-- Stay 20: Soti Khola Gateway Inn (Manaslu - trek start)
WITH new_stay AS (
  INSERT INTO stays (owner_user_id, name, slug, stay_type, location, description, image_url, price_per_night, contact_phone, latitude, longitude, is_featured, discount_percent)
  SELECT u.id, 'Soti Khola Gateway Inn', 'soti-khola-gateway-inn', 'homestay', 'Soti Khola, Gorkha',
    'Homestay where the Manaslu Circuit begins. Local Gurung family, home-cooked meals, and insider knowledge on the permitting process and best times to trek.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Gorkha_region%2C_Nepal.jpg/1280px-Gorkha_region%2C_Nepal.jpg', 2100, '+977-9800000020', 28.3600, 84.7300, false, 0
  FROM users u WHERE u.username = 'admin'
  RETURNING id
)
INSERT INTO menu_items (stay_id, category, name, description, price, image_url, available, sort_order)
SELECT s.id, m.category, m.name, m.description, m.price, m.image_url, true, m.sort_order
FROM new_stay s, (VALUES
  ('room'::TEXT, 'Manaslu Prep Room', 'Simple double room, shared hot shower, and acclimatisation meal planning.', 2100::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 1),
  ('food'::TEXT, 'Manaslu Sendoff Feast', 'Five-course dinner with local Gorkha specialties before the trek.', 750::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 2),
  ('food'::TEXT, 'Trail Pack Service', 'Packed lunches prepared with local ingredients for each trekking day.', 550::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 3)
) AS m(category, name, description, price, image_url, sort_order);

-- Stay 21: Lo Manthang Kingdom Lodge (Mustang - legendary trek)
WITH new_stay AS (
  INSERT INTO stays (owner_user_id, name, slug, stay_type, location, description, image_url, price_per_night, contact_phone, latitude, longitude, is_featured, discount_percent)
  SELECT u.id, 'Lo Manthang Kingdom Lodge', 'lo-manthang-kingdom-lodge', 'hotel', 'Lo Manthang, Mustang',
    'Only hotel in the forbidden kingdom at 3,840m. Sleep inside ancient 15th-century walls, explore Tibetan monasteries by day, and feast on yak momos by firelight.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Lo-Manthang%2C_Upper_Mustang%2C_Nepal_-_April_2015.jpg/1280px-Lo-Manthang%2C_Upper_Mustang%2C_Nepal_-_April_2015.jpg', 6800, '+977-9800000021', 29.1800, 84.0300, true, 0
  FROM users u WHERE u.username = 'admin'
  RETURNING id
)
INSERT INTO menu_items (stay_id, category, name, description, price, image_url, available, sort_order)
SELECT s.id, m.category, m.name, m.description, m.price, m.image_url, true, m.sort_order
FROM new_stay s, (VALUES
  ('room'::TEXT, 'Royal Tibetan Room', 'Authentic Tibetan room within the old palace walls with prayer flags.', 6800::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 1),
  ('room'::TEXT, 'Panorama Suite', 'Premium suite with views over Lo Manthang''s sacred courtyards and monasteries.', 10500::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 2),
  ('food'::TEXT, 'Royal Yak Feast', 'Five-course Tibetan feast: thukpa, yak steak, momos, butter tea, and dessert.', 1600::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Mokto_or_moktoo_02.jpg/1280px-Mokto_or_moktoo_02.jpg', 3),
  ('food'::TEXT, 'Monastery Guide Breakfast', 'Fuel up before monastery tours: yak butter tea, tsampa, and local bread.', 900::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 4)
) AS m(category, name, description, price, image_url, sort_order);

-- Stay 22: Jomsom Gateway Teahouse (Mustang - entry point)
WITH new_stay AS (
  INSERT INTO stays (owner_user_id, name, slug, stay_type, location, description, image_url, price_per_night, contact_phone, latitude, longitude, is_featured, discount_percent)
  SELECT u.id, 'Jomsom Gateway Teahouse', 'jomsom-gateway-teahouse', 'homestay', 'Jomsom, Kaski',
    'Teahouse on the edge of Mustang with stunning Machhapuchhre views from the rooftop. Your hosts arrange permits and guide recommendations for Upper Mustang adventures.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Jomsom%2C_Nepal.jpg/1280px-Jomsom%2C_Nepal.jpg', 2700, '+977-9800000022', 28.7800, 83.7300, false, 8
  FROM users u WHERE u.username = 'admin'
  RETURNING id
)
INSERT INTO menu_items (stay_id, category, name, description, price, image_url, available, sort_order)
SELECT s.id, m.category, m.name, m.description, m.price, m.image_url, true, m.sort_order
FROM new_stay s, (VALUES
  ('room'::TEXT, 'Teahouse Double Room', 'Traditional room with mountain view and access to rooftop Machhapuchhre viewing deck.', 2700::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 1),
  ('food'::TEXT, 'Mustang Preparation Dinner', 'Five-course meal to prepare for Mustang: traditional local dishes.', 900::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 2),
  ('food'::TEXT, 'High-Altitude Trail Pack', 'Nutritious packed lunches designed for Mustang''s cold, dry climate.', 600::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 3)
) AS m(category, name, description, price, image_url, sort_order);

-- Stay 23: Kanchenjunga Sacred Peak Lodge (Kanchenjunga - east extreme)
WITH new_stay AS (
  INSERT INTO stays (owner_user_id, name, slug, stay_type, location, description, image_url, price_per_night, contact_phone, latitude, longitude, is_featured, discount_percent)
  SELECT u.id, 'Kanchenjunga Sacred Peak Lodge', 'kanchenjunga-sacred-peak-lodge', 'hotel', 'Taplejung, Kanchenjunga',
    'Gateway to Nepal''s third-highest mountain and least-visited trek. Family-run lodge with expert guides, local stories, and access to pristine rhododendron forests.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Kanchenjunga.jpg/1280px-Kanchenjunga.jpg', 3800, '+977-9800000023', 27.3500, 87.6700, true, 0
  FROM users u WHERE u.username = 'admin'
  RETURNING id
)
INSERT INTO menu_items (stay_id, category, name, description, price, image_url, available, sort_order)
SELECT s.id, m.category, m.name, m.description, m.price, m.image_url, true, m.sort_order
FROM new_stay s, (VALUES
  ('room'::TEXT, 'Explorer''s Twin Room', 'Comfortable room with local art, shared hot shower, and extensive trek information.', 3800::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 1),
  ('room'::TEXT, 'Premium Trek Suite', 'Larger room with study area for route planning and independent research.', 6000::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 2),
  ('food'::TEXT, 'Limbu Community Dinner', 'Meet locals and feast on Limbu tribal specialties — unique regional cuisine.', 1000::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 3),
  ('food'::TEXT, 'Trekker''s Trail Breakfast', 'High-energy breakfast with yak cheese, local honey, and energy bars.', 700::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 4)
) AS m(category, name, description, price, image_url, sort_order);

-- Stay 24: Janakpur Pilgrimage Inn (Janakpur - spiritual site)
WITH new_stay AS (
  INSERT INTO stays (owner_user_id, name, slug, stay_type, location, description, image_url, price_per_night, contact_phone, latitude, longitude, is_featured, discount_percent)
  SELECT u.id, 'Janakpur Pilgrimage Inn', 'janakpur-pilgrimage-inn', 'homestay', 'Janakpur, Dhanusa',
    'Cultural homestay in Nepal''s spiritual pilgrimage city. Witness the Vivaha Mandap temple, join local Mithila art classes, and stay with a traditional artist family.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Janaki_Mandir_Janakpur_Nepal.jpg/1280px-Janaki_Mandir_Janakpur_Nepal.jpg', 1900, '+977-9800000024', 26.8083, 85.9275, false, 0
  FROM users u WHERE u.username = 'admin'
  RETURNING id
)
INSERT INTO menu_items (stay_id, category, name, description, price, image_url, available, sort_order)
SELECT s.id, m.category, m.name, m.description, m.price, m.image_url, true, m.sort_order
FROM new_stay s, (VALUES
  ('room'::TEXT, 'Artist Room with Studio Access', 'Sleep in the family home and use the painting studio during your stay.', 1900::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 1),
  ('food'::TEXT, 'Mithila Home Cooking Class', 'Learn to cook traditional Maithili cuisine with the family — 4-course meal included.', 950::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 2),
  ('food'::TEXT, 'Pilgrimage Breakfast', 'Vegetarian breakfast before visiting the temple — local bread and curries.', 400::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 3)
) AS m(category, name, description, price, image_url, sort_order);

-- Set new featured stays and special offers
UPDATE stays SET is_featured = true WHERE slug IN ('lukla-adventure-hotel', 'ghorepani-poon-hill-inn', 'kyanjin-ri-lodge', 'lo-manthang-kingdom-lodge', 'kanchenjunga-sacred-peak-lodge');
UPDATE stays SET discount_percent = 15 WHERE slug = 'lukla-adventure-hotel';
UPDATE stays SET discount_percent = 12 WHERE slug = 'ghorepani-poon-hill-inn';

-- Stay 25: Lobuche Glacier Rest
WITH new_stay AS (
  INSERT INTO stays (owner_user_id, name, slug, stay_type, location, description, image_url, price_per_night, contact_phone, latitude, longitude, is_featured, discount_percent)
  SELECT u.id, 'Lobuche Glacier Rest', 'lobuche-glacier-rest', 'hotel', 'Lobuche, Solukhumbu',
    'A high-altitude lodge at 4,940m with thick duvets, expedition briefings, and a front-row seat to Khumbu glacier light at sunrise.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Khumbu_Glacier.jpg/1280px-Khumbu_Glacier.jpg', 6100, '+977-9800000025', 27.9500, 86.8000, true, 10
  FROM users u WHERE u.username = 'admin'
  RETURNING id
)
INSERT INTO menu_items (stay_id, category, name, description, price, image_url, available, sort_order)
SELECT s.id, m.category, m.name, m.description, m.price, m.image_url, true, m.sort_order
FROM new_stay s, (VALUES
  ('room'::TEXT, 'Glacier Edge Room', 'Insulated twin room with glacier-facing window and heated dining access.', 6100::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 1),
  ('food'::TEXT, 'Acclimatisation Broth', 'Light vegetable broth with herbs and garlic for altitude comfort.', 650::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Mokto_or_moktoo_02.jpg/1280px-Mokto_or_moktoo_02.jpg', 2),
  ('food'::TEXT, 'Khumbu Energy Breakfast', 'Porridge, eggs, butter toast, and altitude tea before the EBC push.', 900::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 3)
) AS m(category, name, description, price, image_url, sort_order);

-- Stay 26: Gokyo Blue Lake Lodge
WITH new_stay AS (
  INSERT INTO stays (owner_user_id, name, slug, stay_type, location, description, image_url, price_per_night, contact_phone, latitude, longitude, is_featured, discount_percent)
  SELECT u.id, 'Gokyo Blue Lake Lodge', 'gokyo-blue-lake-lodge', 'hotel', 'Gokyo, Solukhumbu',
    'Boutique trekking lodge overlooking the turquoise Gokyo Lakes. Perfect for rest days, ridge ascents, and Renjo La transitions.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Gokyo_lake.jpg/1280px-Gokyo_lake.jpg', 5600, '+977-9800000026', 27.9600, 86.6900, true, 0
  FROM users u WHERE u.username = 'admin'
  RETURNING id
)
INSERT INTO menu_items (stay_id, category, name, description, price, image_url, available, sort_order)
SELECT s.id, m.category, m.name, m.description, m.price, m.image_url, true, m.sort_order
FROM new_stay s, (VALUES
  ('room'::TEXT, 'Lake View Double', 'Private room with uninterrupted Gokyo lake views and extra-warm bedding.', 5600::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 1),
  ('food'::TEXT, 'Blue Lake Breakfast', 'Hot oats, local bread, fruit, and tea with lakefront sunrise seating.', 850::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 2),
  ('food'::TEXT, 'Sherpa Momo Supper', 'Steamed momos and soup for a relaxed post-hike dinner.', 780::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Mokto_or_moktoo_02.jpg/1280px-Mokto_or_moktoo_02.jpg', 3)
) AS m(category, name, description, price, image_url, sort_order);

-- Stay 27: Chhomrong Hillside Homestay
WITH new_stay AS (
  INSERT INTO stays (owner_user_id, name, slug, stay_type, location, description, image_url, price_per_night, contact_phone, latitude, longitude, is_featured, discount_percent)
  SELECT u.id, 'Chhomrong Hillside Homestay', 'chhomrong-hillside-homestay', 'homestay', 'Chhomrong, Kaski',
    'A friendly Gurung family homestay above the stone staircases of Chhomrong, with sweeping Annapurna South views and a kitchen that never stops cooking.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Chhomrong.jpg/1280px-Chhomrong.jpg', 2600, '+977-9800000027', 28.4000, 83.8000, false, 6
  FROM users u WHERE u.username = 'admin'
  RETURNING id
)
INSERT INTO menu_items (stay_id, category, name, description, price, image_url, available, sort_order)
SELECT s.id, m.category, m.name, m.description, m.price, m.image_url, true, m.sort_order
FROM new_stay s, (VALUES
  ('room'::TEXT, 'Stone Terrace Room', 'Simple village room with shared bath and valley terrace access.', 2600::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 1),
  ('food'::TEXT, 'Homestyle Dal Bhat', 'Refill-friendly dal bhat cooked the Chhomrong family way.', 650::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 2),
  ('food'::TEXT, 'Trail Thermos Tea', 'Fresh ginger-lemon honey tea packed for the ABC climb.', 350::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 3)
) AS m(category, name, description, price, image_url, sort_order);

-- Stay 28: Lama Hotel Riverside Inn
WITH new_stay AS (
  INSERT INTO stays (owner_user_id, name, slug, stay_type, location, description, image_url, price_per_night, contact_phone, latitude, longitude, is_featured, discount_percent)
  SELECT u.id, 'Lama Hotel Riverside Inn', 'lama-hotel-riverside-inn', 'homestay', 'Lama Hotel, Rasuwa',
    'Forest-wrapped stopover on the Langtang trail with river sounds, hanging prayer flags, and a warm communal room for rainy trekking days.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Langtang_Valley.jpg/1280px-Langtang_Valley.jpg', 2400, '+977-9800000028', 28.2100, 85.4300, false, 0
  FROM users u WHERE u.username = 'admin'
  RETURNING id
)
INSERT INTO menu_items (stay_id, category, name, description, price, image_url, available, sort_order)
SELECT s.id, m.category, m.name, m.description, m.price, m.image_url, true, m.sort_order
FROM new_stay s, (VALUES
  ('room'::TEXT, 'Riverside Trek Room', 'Cosy room with timber walls and access to hot bucket showers.', 2400::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 1),
  ('food'::TEXT, 'Forest Thukpa Bowl', 'Noodle soup with herbs, vegetables, and garlic after a damp trail day.', 520::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Mokto_or_moktoo_02.jpg/1280px-Mokto_or_moktoo_02.jpg', 2),
  ('food'::TEXT, 'Morning Bread & Chiya', 'Fresh griddle bread, jam, and spiced milk tea before the valley climb.', 380::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 3)
) AS m(category, name, description, price, image_url, sort_order);

-- Stay 29: Namrung Horizon Lodge
WITH new_stay AS (
  INSERT INTO stays (owner_user_id, name, slug, stay_type, location, description, image_url, price_per_night, contact_phone, latitude, longitude, is_featured, discount_percent)
  SELECT u.id, 'Namrung Horizon Lodge', 'namrung-horizon-lodge', 'hotel', 'Namrung, Gorkha',
    'Stone-built mountain lodge on the Manaslu Circuit with pine views, yak-wool blankets, and an airy dining hall for acclimatisation stops.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Manaslu_%281%29.jpg/1280px-Manaslu_%281%29.jpg', 3700, '+977-9800000029', 28.5700, 85.0300, true, 8
  FROM users u WHERE u.username = 'admin'
  RETURNING id
)
INSERT INTO menu_items (stay_id, category, name, description, price, image_url, available, sort_order)
SELECT s.id, m.category, m.name, m.description, m.price, m.image_url, true, m.sort_order
FROM new_stay s, (VALUES
  ('room'::TEXT, 'Pine Ridge Room', 'Twin room with warm quilts and ridge-facing window seats.', 3700::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 1),
  ('food'::TEXT, 'Circuit Set Meal', 'Soup, dal bhat, achar, and tea designed for a full trekking day.', 720::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 2),
  ('food'::TEXT, 'Yak Cheese Toast', 'Toasted bread with local yak cheese and tomato chutney.', 480::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 3)
) AS m(category, name, description, price, image_url, sort_order);

-- Stay 30: Kagbeni Monastery Guesthouse
WITH new_stay AS (
  INSERT INTO stays (owner_user_id, name, slug, stay_type, location, description, image_url, price_per_night, contact_phone, latitude, longitude, is_featured, discount_percent)
  SELECT u.id, 'Kagbeni Monastery Guesthouse', 'kagbeni-monastery-guesthouse', 'homestay', 'Kagbeni, Mustang',
    'Quiet guesthouse beside the old alleys of Kagbeni where trekkers pause before Upper Mustang. Expect whitewashed walls, monastery bells, and wide river valley views.',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Kagbeni_Mustang_Nepal.jpg/1280px-Kagbeni_Mustang_Nepal.jpg', 2900, '+977-9800000030', 28.8300, 83.8000, false, 0
  FROM users u WHERE u.username = 'admin'
  RETURNING id
)
INSERT INTO menu_items (stay_id, category, name, description, price, image_url, available, sort_order)
SELECT s.id, m.category, m.name, m.description, m.price, m.image_url, true, m.sort_order
FROM new_stay s, (VALUES
  ('room'::TEXT, 'Monastery Courtyard Room', 'Simple stone room with a quiet courtyard and warm layered bedding.', 2900::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ghorepani_teahouse_room.jpg/1280px-Ghorepani_teahouse_room.jpg', 1),
  ('food'::TEXT, 'Mustang Butter Tea Set', 'Butter tea, barley bread, and roasted potatoes for chilly evenings.', 540::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Dal_Bhat_Tarkari.jpg/1280px-Dal_Bhat_Tarkari.jpg', 2),
  ('food'::TEXT, 'Kagbeni Momo Plate', 'Handmade momos with mountain herbs and tomato-sesame achar.', 620::NUMERIC, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Mokto_or_moktoo_02.jpg/1280px-Mokto_or_moktoo_02.jpg', 3)
) AS m(category, name, description, price, image_url, sort_order);

UPDATE stays SET is_featured = true WHERE slug IN ('gokyo-blue-lake-lodge', 'lobuche-glacier-rest', 'namrung-horizon-lodge');

INSERT INTO stay_reviews (stay_id, reviewer_name, reviewer_initials, rating, comment) VALUES
  ((SELECT id FROM stays WHERE slug = 'gokyo-blue-lake-lodge'), 'Elena Petrova', 'EP', 5, 'The blue lake outside the breakfast room looked unreal. One of the most memorable lodge views on our whole trek.'),
  ((SELECT id FROM stays WHERE slug = 'lobuche-glacier-rest'), 'Samir Khan', 'SK', 4, 'A very solid final stop before base camp. Warmest blankets we found above Dingboche.'),
  ((SELECT id FROM stays WHERE slug = 'chhomrong-hillside-homestay'), 'Lara Nguyen', 'LN', 5, 'The family dinner and terrace view made this feel like the real Annapurna experience.'),
  ((SELECT id FROM stays WHERE slug = 'lama-hotel-riverside-inn'), 'Jonas Meyer', 'JM', 4, 'Fell asleep to the river and woke up to prayer flags moving in the mist. Exactly what I hoped for on Langtang.'),
  ((SELECT id FROM stays WHERE slug = 'namrung-horizon-lodge'), 'Sita Bista', 'SB', 5, 'Clean rooms, great meals, and the staff knew every detail of the next section of the Manaslu Circuit.'),
  ((SELECT id FROM stays WHERE slug = 'kagbeni-monastery-guesthouse'), 'Marta Silva', 'MS', 5, 'Quiet, atmospheric, and a perfect stop before heading deeper into Mustang. Loved the butter tea set.');
