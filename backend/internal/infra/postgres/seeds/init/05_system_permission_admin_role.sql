-- admin.admin_role.* (ids 19–24)
INSERT INTO system_permission (id, code, module, type, action, resource, method, is_active)
VALUES
  (19, 'admin.admin_role.view', 'admin', 'admin_role', 'view', '/api/v1/admin/roles', 'GET', TRUE),
  (20, 'admin.admin_role.create', 'admin', 'admin_role', 'create', '/api/v1/admin/roles', 'POST', TRUE),
  (21, 'admin.admin_role.update', 'admin', 'admin_role', 'update', '/api/v1/admin/roles', 'PATCH', TRUE),
  (22, 'admin.admin_role.delete', 'admin', 'admin_role', 'delete', '/api/v1/admin/roles', 'DELETE', TRUE),
  (23, 'admin.admin_role.import', 'admin', 'admin_role', 'import', '/api/v1/admin/roles', 'POST', FALSE),
  (24, 'admin.admin_role.export', 'admin', 'admin_role', 'export', '/api/v1/admin/roles', 'GET', FALSE)
ON CONFLICT (code) DO UPDATE SET
  module = EXCLUDED.module,
  type = EXCLUDED.type,
  action = EXCLUDED.action,
  resource = EXCLUDED.resource,
  method = EXCLUDED.method,
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

SELECT setval(pg_get_serial_sequence('system_permission', 'id'), GREATEST((SELECT MAX(id) FROM system_permission), 24));
