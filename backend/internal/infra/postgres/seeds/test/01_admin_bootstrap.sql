-- Demo RBAC bootstrap (run after init seeds). Passwords: admin / staff
INSERT INTO admin_role (id, is_active, created_at, updated_at)
VALUES
  (1, TRUE, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, TRUE, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
ON CONFLICT (id) DO UPDATE SET is_active = EXCLUDED.is_active, updated_at = EXCLUDED.updated_at;

SELECT setval(pg_get_serial_sequence('admin_role', 'id'), GREATEST((SELECT MAX(id) FROM admin_role), 2));

INSERT INTO admin_role_language (admin_role_id, locale, name)
VALUES
  (1, 'th', 'ผู้ดูแลสูงสุด'), (1, 'en', 'Super Admin'),
  (2, 'th', 'พนักงาน'), (2, 'en', 'Staff')
ON CONFLICT (admin_role_id, locale) DO UPDATE SET name = EXCLUDED.name, updated_at = CURRENT_TIMESTAMP;

INSERT INTO admin_user (id, username, email, password_hash, status, type, admin_role_id, created_at, updated_at)
VALUES
  (1, 'admin', 'admin@warehouse.local', '$2a$10$8HBcgC7QWLoeFnxLM/ljYOvNP73UV.LtZClwswBoKip6ZvUkxZS8y', 'active', 'superadmin', 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (2, 'staff', 'staff@warehouse.local', '$2a$10$KAVu/mCBQd6CJf7oERrteOs6emcZIjFjdy8SywE8yd9W3xjYxZVCO', 'active', 'staff', 2, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  email = EXCLUDED.email,
  password_hash = EXCLUDED.password_hash,
  status = EXCLUDED.status,
  type = EXCLUDED.type,
  admin_role_id = EXCLUDED.admin_role_id,
  updated_at = EXCLUDED.updated_at,
  deleted_at = NULL;

SELECT setval(pg_get_serial_sequence('admin_user', 'id'), GREATEST((SELECT MAX(id) FROM admin_user), 2));

INSERT INTO admin_role_permission (admin_role_id, system_permission_id)
SELECT 1, id FROM system_permission WHERE deleted_at IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO admin_role_permission (admin_role_id, system_permission_id)
SELECT 2, id FROM system_permission
WHERE code IN (
  'admin.admin_user.view',
  'system.system_menu.view'
) AND deleted_at IS NULL
ON CONFLICT DO NOTHING;
