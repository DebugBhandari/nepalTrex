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
  profile_image_url TEXT,
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'suspended')),
  moderation_note TEXT,
  approved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS guide_profiles_approval_status_idx ON guide_profiles(approval_status);
CREATE INDEX IF NOT EXISTS guide_profiles_home_region_idx ON guide_profiles(home_region);

CREATE TABLE IF NOT EXISTS guide_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_profile_id UUID NOT NULL REFERENCES guide_profiles(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS guide_packages_profile_active_idx ON guide_packages(guide_profile_id, is_active);
CREATE INDEX IF NOT EXISTS guide_packages_region_idx ON guide_packages(region);

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

CREATE INDEX IF NOT EXISTS guide_bookings_customer_idx ON guide_bookings(customer_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS guide_bookings_guide_idx ON guide_bookings(guide_profile_id, created_at DESC);

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

CREATE INDEX IF NOT EXISTS guide_booking_events_booking_idx ON guide_booking_events(guide_booking_id, created_at);

ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_target_type_check;
ALTER TABLE reviews ADD CONSTRAINT reviews_target_type_check CHECK (target_type IN ('stay', 'trek', 'guide'));
