-- Align legacy catalog rows (admin.website_* / /api/v1/website/*) with system address geo APIs.
UPDATE system_permission SET
  code = REPLACE(code, 'admin.website_', 'admin.system_'),
  type = REPLACE(type, 'website_', 'system_'),
  resource = REPLACE(resource, '/api/v1/website/', '/api/v1/system/'),
  updated_at = CURRENT_TIMESTAMP
WHERE code LIKE 'admin.website_%';
