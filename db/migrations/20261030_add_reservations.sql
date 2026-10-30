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

CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stay_id UUID NOT NULL REFERENCES stays(id) ON DELETE CASCADE,
  customer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  guest_count INT NOT NULL CHECK (guest_count > 0),
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT NOT NULL,
  guest_notes TEXT,
  host_note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined', 'cancelled', 'completed')),
  hold_expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_price NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (check_out_date > check_in_date)
);

CREATE INDEX IF NOT EXISTS reservations_customer_user_id_created_at_idx
  ON reservations(customer_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reservations_stay_id_check_in_date_idx
  ON reservations(stay_id, check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS reservations_active_status_idx
  ON reservations(status, hold_expires_at)
  WHERE status IN ('pending', 'confirmed');

CREATE TABLE IF NOT EXISTS reservation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
  room_name TEXT NOT NULL,
  nightly_price NUMERIC(10, 2) NOT NULL CHECK (nightly_price >= 0),
  units INT NOT NULL DEFAULT 1 CHECK (units > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(reservation_id, room_id)
);

CREATE INDEX IF NOT EXISTS reservation_items_room_id_idx
  ON reservation_items(room_id);

CREATE TABLE IF NOT EXISTS reservation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  previous_status TEXT,
  next_status TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reservation_events_reservation_id_created_at_idx
  ON reservation_events(reservation_id, created_at ASC);