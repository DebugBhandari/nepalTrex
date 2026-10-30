ALTER TABLE guide_packages
  ADD COLUMN IF NOT EXISTS trek_id UUID REFERENCES treks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS guide_packages_trek_id_active_idx
  ON guide_packages(trek_id)
  WHERE is_active = true;

UPDATE guide_packages gp
SET trek_id = t.id,
    updated_at = NOW()
FROM treks t
WHERE gp.trek_id IS NULL
  AND lower(trim(gp.trek_name)) = lower(trim(t.name));