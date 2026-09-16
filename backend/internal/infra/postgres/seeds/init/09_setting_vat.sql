-- Init VAT singleton baseline (idempotent).
-- Requires: migration 20260317110000_setting_module.sql.

INSERT INTO setting_vat (id, vat_type, rate, created_at, updated_at)
VALUES (1, 'exclude', 7.00, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
ON CONFLICT (id) DO UPDATE SET
  vat_type = EXCLUDED.vat_type,
  rate = EXCLUDED.rate,
  deleted_at = NULL,
  updated_at = EXCLUDED.updated_at;

SELECT setval(pg_get_serial_sequence('setting_vat', 'id'), GREATEST((SELECT MAX(id) FROM setting_vat), 1));
