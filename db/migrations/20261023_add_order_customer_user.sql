BEGIN;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS orders_customer_user_id_created_at_idx
  ON orders(customer_user_id, created_at DESC);

COMMIT;