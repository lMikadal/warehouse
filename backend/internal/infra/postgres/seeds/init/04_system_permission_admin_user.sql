-- admin.admin_user.* (ids 13–18)
INSERT INTO system_permission (id, code, module, type, action, resource, method, is_active)
VALUES
  (13, 'admin.admin_user.view', 'admin', 'admin_user', 'view', '/api/v1/admin/users', 'GET', TRUE),
  (14, 'admin.admin_user.create', 'admin', 'admin_user', 'create', '/api/v1/admin/users', 'POST', TRUE),
  (15, 'admin.admin_user.update', 'admin', 'admin_user', 'update', '/api/v1/admin/users', 'PATCH', TRUE),
  (16, 'admin.admin_user.delete', 'admin', 'admin_user', 'delete', '/api/v1/admin/users', 'DELETE', TRUE),
  (17, 'admin.admin_user.import', 'admin', 'admin_user', 'import', '/api/v1/admin/users', 'POST', FALSE),
  (18, 'admin.admin_user.export', 'admin', 'admin_user', 'export', '/api/v1/admin/users', 'GET', FALSE)
ON CONFLICT (code) DO UPDATE SET
  module = EXCLUDED.module,
  type = EXCLUDED.type,
  action = EXCLUDED.action,
  resource = EXCLUDED.resource,
  method = EXCLUDED.method,
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

SELECT setval(pg_get_serial_sequence('system_permission', 'id'), GREATEST((SELECT MAX(id) FROM system_permission), 18));
