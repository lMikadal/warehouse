-- system.system_menu.* (ids 1–6) — see internal/rbac/perm_catalog.go
INSERT INTO system_permission (id, code, module, type, action, resource, method, is_active)
VALUES
  (1, 'system.system_menu.view', 'system', 'system_menu', 'view', '/api/v1/system/menus', 'GET', TRUE),
  (2, 'system.system_menu.create', 'system', 'system_menu', 'create', '/api/v1/system/menus', 'POST', TRUE),
  (3, 'system.system_menu.update', 'system', 'system_menu', 'update', '/api/v1/system/menus', 'PATCH', TRUE),
  (4, 'system.system_menu.delete', 'system', 'system_menu', 'delete', '/api/v1/system/menus', 'DELETE', TRUE),
  (5, 'system.system_menu.import', 'system', 'system_menu', 'import', '/api/v1/system/menus', 'POST', FALSE),
  (6, 'system.system_menu.export', 'system', 'system_menu', 'export', '/api/v1/system/menus', 'GET', FALSE)
ON CONFLICT (code) DO UPDATE SET
  module = EXCLUDED.module,
  type = EXCLUDED.type,
  action = EXCLUDED.action,
  resource = EXCLUDED.resource,
  method = EXCLUDED.method,
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

SELECT setval(pg_get_serial_sequence('system_permission', 'id'), GREATEST((SELECT MAX(id) FROM system_permission), 6));
