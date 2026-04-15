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

CREATE INDEX IF NOT EXISTS stays_owner_user_id_idx ON stays(owner_user_id);

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

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_group_id UUID,
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

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS order_group_id UUID;

CREATE INDEX IF NOT EXISTS orders_stay_id_idx ON orders(stay_id);
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
