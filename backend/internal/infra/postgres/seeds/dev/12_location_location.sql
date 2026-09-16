-- Dev location demo — mirrors design/js/seed/location_location*.js
-- Requires: migration 20260918120000_location_module.sql

INSERT INTO location_location (id, sort_order, is_active, created_at, updated_at)
VALUES
  (1, 100, TRUE, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, 200, TRUE, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (3, 300, FALSE, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
ON CONFLICT (id) DO UPDATE SET
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = EXCLUDED.updated_at;

INSERT INTO location_location_language (location_location_id, locale, name, created_at, updated_at)
VALUES
  (1, 'th', 'โกดังหลัก', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (1, 'en', 'Main warehouse', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, 'th', 'หน้าร้าน', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, 'en', 'Store front', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (3, 'th', 'คลังสำรอง', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (3, 'en', 'Backup warehouse', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
ON CONFLICT (location_location_id, locale) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = EXCLUDED.updated_at;

SELECT setval(pg_get_serial_sequence('location_location', 'id'), GREATEST((SELECT MAX(id) FROM location_location), 1));
