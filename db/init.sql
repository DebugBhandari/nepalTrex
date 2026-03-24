CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE,
  email TEXT UNIQUE,
  display_name TEXT,
  password_hash TEXT,
  provider TEXT NOT NULL DEFAULT 'credentials',
  provider_account_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_provider_provider_account_id_idx
  ON users(provider, provider_account_id)
  WHERE provider_account_id IS NOT NULL;

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

INSERT INTO users (username, email, display_name, password_hash, provider)
VALUES (
  'admin',
  'admin@nepaltrex.local',
  'Admin',
  '$2b$10$zU6qawDDcvCYrKkZxjARtOA7mWoxQcsqGq1EQ02HQgjugUsOVjQk.',
  'credentials'
)
ON CONFLICT (username) DO NOTHING;

INSERT INTO treks (name, duration_days, level, region, description, is_featured)
VALUES
  ('Everest Base Camp', 14, 'moderate', 'Khumbu Region', 'Classic Khumbu route to Everest Base Camp with Sherpa villages and glacier views.', true),
  ('Annapurna Circuit', 16, 'challenging', 'Annapurna Region', 'Long circuit trek crossing Thorong La and diverse mountain landscapes.', true),
  ('Langtang Valley', 10, 'easy', 'Langtang Region', 'Scenic valley trek with Tamang culture and lower altitude profile.', true),
  ('Manaslu Circuit', 15, 'challenging', 'Manaslu Region', 'Remote circuit around Manaslu with high mountain passes and fewer crowds.', true),
  ('Upper Mustang', 12, 'moderate', 'Mustang Region', 'Arid trans-Himalayan trail through ancient walled settlements.', true)
ON CONFLICT (name) DO NOTHING;
