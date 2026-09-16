-- Trim setting_vat catalog to view + update only (ids 61, 63). Safe to re-run.

DELETE FROM admin_role_permission WHERE system_permission_id IN (62, 64, 65, 66);
DELETE FROM system_menu_permission WHERE system_permission_id IN (62, 64, 65, 66);
DELETE FROM system_permission WHERE id IN (62, 64, 65, 66);
