-- source: v1 admin_menu_permissions
-- junction: which permissions are required to see / activate a menu item
-- note: admin_role_menu and admin_role_menu_permission (v1 3-way junction) are removed;
--       menu visibility derives from admin_role_permission ∩ admin_menu_permission
CREATE TABLE admin_menu_permission (
    admin_menu_id        BIGINT NOT NULL REFERENCES admin_menu(id)       ON DELETE CASCADE,
    admin_permission_id  BIGINT NOT NULL REFERENCES admin_permission(id)  ON DELETE CASCADE,
    PRIMARY KEY (admin_menu_id, admin_permission_id)
);

CREATE INDEX idx_admin_menu_permission_permission_id ON admin_menu_permission (admin_permission_id);
