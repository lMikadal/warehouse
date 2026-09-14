INSERT INTO website_language (locale, name, sort_order, is_active, is_default)
VALUES
  ('th', 'ไทย', 100, TRUE, TRUE),
  ('en', 'English', 200, TRUE, FALSE)
ON CONFLICT (locale) DO UPDATE SET
  name = EXCLUDED.name,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  is_default = EXCLUDED.is_default,
  updated_at = CURRENT_TIMESTAMP;
