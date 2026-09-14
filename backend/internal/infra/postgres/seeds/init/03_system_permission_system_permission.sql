-- system.system_permission.* (ids 7–12)
INSERT INTO system_permission (id, code, module, type, action, resource, method, is_active)
VALUES
  (7, 'system.system_permission.view', 'system', 'system_permission', 'view', '/api/v1/system/permissions', 'GET', TRUE),
  (8, 'system.system_permission.create', 'system', 'system_permission', 'create', '/api/v1/system/permissions', 'POST', TRUE),
  (9, 'system.system_permission.update', 'system', 'system_permission', 'update', '/api/v1/system/permissions', 'PATCH', TRUE),
  (10, 'system.system_permission.delete', 'system', 'system_permission', 'delete', '/api/v1/system/permissions', 'DELETE', TRUE),
  (11, 'system.system_permission.import', 'system', 'system_permission', 'import', '/api/v1/system/permissions', 'POST', FALSE),
  (12, 'system.system_permission.export', 'system', 'system_permission', 'export', '/api/v1/system/permissions', 'GET', FALSE)
ON CONFLICT (code) DO UPDATE SET
  module = EXCLUDED.module,
  type = EXCLUDED.type,
  action = EXCLUDED.action,
  resource = EXCLUDED.resource,
  method = EXCLUDED.method,
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

SELECT setval(pg_get_serial_sequence('system_permission', 'id'), GREATEST((SELECT MAX(id) FROM system_permission), 12));
