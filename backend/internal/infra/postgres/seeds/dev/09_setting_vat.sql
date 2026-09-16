-- Dev re-run of VAT singleton (keep in sync with init/09_setting_vat.sql).

INSERT INTO setting_vat (id, vat_type, rate, is_active, created_at, updated_at)
VALUES (1, 'include', 7.00, TRUE, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
ON CONFLICT (id) DO UPDATE SET
  vat_type = EXCLUDED.vat_type,
  rate = EXCLUDED.rate,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = EXCLUDED.updated_at;

SELECT setval(pg_get_serial_sequence('setting_vat', 'id'), GREATEST((SELECT MAX(id) FROM setting_vat), 1));
