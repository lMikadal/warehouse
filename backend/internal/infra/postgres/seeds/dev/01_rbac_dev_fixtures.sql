-- Dev-only RBAC fixtures (run after bootstrap). Not for production.
-- Fixed ids: roles 2–8, users 2–8. Passwords match username (see document/knowledge/backend.md).

INSERT INTO admin_role (id, is_active, created_at, updated_at)
VALUES
  (2, TRUE, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (3, TRUE, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (4, TRUE, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (5, TRUE, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (6, TRUE, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (7, TRUE, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (8, TRUE, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
ON CONFLICT (id) DO UPDATE SET is_active = EXCLUDED.is_active, updated_at = EXCLUDED.updated_at;

INSERT INTO admin_role_language (admin_role_id, locale, name)
VALUES
  (2, 'th', 'พนักงาน'), (2, 'en', 'Staff'),
  (3, 'th', 'ดูผู้ใช้'), (3, 'en', 'Users viewer'),
  (4, 'th', 'แก้ไขผู้ใช้'), (4, 'en', 'Users editor'),
  (5, 'th', 'ดูบทบาท'), (5, 'en', 'Roles viewer'),
  (6, 'th', 'ดูเมนูระบบ'), (6, 'en', 'System menu viewer'),
  (7, 'th', 'แก้ไขเมนูระบบ'), (7, 'en', 'System menu editor'),
  (8, 'th', 'ดูสิทธิ์ระบบ'), (8, 'en', 'System permission viewer')
ON CONFLICT (admin_role_id, locale) DO UPDATE SET name = EXCLUDED.name, updated_at = CURRENT_TIMESTAMP;

INSERT INTO admin_user (id, username, email, password_hash, status, type, admin_role_id, created_at, updated_at)
VALUES
  (2, 'staff', 'staff@warehouse.local', '$2a$10$KAVu/mCBQd6CJf7oERrteOs6emcZIjFjdy8SywE8yd9W3xjYxZVCO', 'active', 'staff', 2, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (3, 'user_view', 'user_view@warehouse.local', '$2a$10$EyINOO7IO0AcdePX3EnYYOKNCf0puX0VodpEJkveW3y.r82VtVbUC', 'active', 'staff', 3, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (4, 'user_edit', 'user_edit@warehouse.local', '$2a$10$xcgex8quMGklqCKiPbNTIuZK6CY77EMSPIs8iZM80h1BTJrtZyViG', 'active', 'staff', 4, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (5, 'role_view', 'role_view@warehouse.local', '$2a$10$AYLJvXUE8vQMAZbMOOQRXuXZSK/9bf60h8i8PJxP0b7kIbYWe.b6O', 'active', 'staff', 5, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (6, 'menu_view', 'menu_view@warehouse.local', '$2a$10$h50Q92UTQH/1rWfwT2jFfe0ShSKxrLq28RfbijXtdgzKQdJkjTsKe', 'active', 'staff', 6, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (7, 'menu_edit', 'menu_edit@warehouse.local', '$2a$10$CnVZfv.8XD0iOWPKsxxUgehuLfXu3b.QBjMblhNW45vo2b0Dw5DDu', 'active', 'staff', 7, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  (8, 'perm_view', 'perm_view@warehouse.local', '$2a$10$occvdvziT1FL0hqB14xnSOBU0qFN3WYc3Rjt42FOuysPxLeSPUCXe', 'active', 'staff', 8, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  email = EXCLUDED.email,
  password_hash = EXCLUDED.password_hash,
  status = EXCLUDED.status,
  type = EXCLUDED.type,
  admin_role_id = EXCLUDED.admin_role_id,
  updated_at = EXCLUDED.updated_at,
  deleted_at = NULL;

SELECT setval(pg_get_serial_sequence('admin_role', 'id'), GREATEST((SELECT MAX(id) FROM admin_role), 8));
SELECT setval(pg_get_serial_sequence('admin_user', 'id'), GREATEST((SELECT MAX(id) FROM admin_user), 8));

DELETE FROM admin_role_permission WHERE admin_role_id IN (2, 3, 4, 5, 6, 7, 8);

INSERT INTO admin_role_permission (admin_role_id, system_permission_id)
SELECT 2, sp.id
FROM system_permission sp
WHERE sp.deleted_at IS NULL
  AND sp.is_active = TRUE
  AND sp.code IN (
    'product.product_list.view',
    'product.product_list.create',
    'product.product_list.update',
    'product.product_category.view',
    'member.member_user.view',
    'member.member_user.create',
    'order.order_purchase.view',
    'order.order_sales_claim.view',
    'warehouse.warehouse_list.view'
  );

INSERT INTO admin_role_permission (admin_role_id, system_permission_id)
SELECT 3, sp.id
FROM system_permission sp
WHERE sp.deleted_at IS NULL
  AND sp.is_active = TRUE
  AND sp.code = 'admin.admin_user.view';

INSERT INTO admin_role_permission (admin_role_id, system_permission_id)
SELECT 4, sp.id
FROM system_permission sp
WHERE sp.deleted_at IS NULL
  AND sp.is_active = TRUE
  AND sp.code IN (
    'admin.admin_user.view',
    'admin.admin_user.create',
    'admin.admin_user.update'
  );

INSERT INTO admin_role_permission (admin_role_id, system_permission_id)
SELECT 5, sp.id
FROM system_permission sp
WHERE sp.deleted_at IS NULL
  AND sp.is_active = TRUE
  AND sp.code = 'admin.admin_role.view';

INSERT INTO admin_role_permission (admin_role_id, system_permission_id)
SELECT 6, sp.id
FROM system_permission sp
WHERE sp.deleted_at IS NULL
  AND sp.is_active = TRUE
  AND sp.code = 'system.system_menu.view';

INSERT INTO admin_role_permission (admin_role_id, system_permission_id)
SELECT 7, sp.id
FROM system_permission sp
WHERE sp.deleted_at IS NULL
  AND sp.is_active = TRUE
  AND sp.code IN (
    'system.system_menu.view',
    'system.system_menu.create',
    'system.system_menu.update'
  );

INSERT INTO admin_role_permission (admin_role_id, system_permission_id)
SELECT 8, sp.id
FROM system_permission sp
WHERE sp.deleted_at IS NULL
  AND sp.is_active = TRUE
  AND sp.code = 'system.system_permission.view';
