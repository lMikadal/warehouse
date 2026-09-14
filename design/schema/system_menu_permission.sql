CREATE TABLE system_menu_permission (
    system_menu_id        BIGINT NOT NULL REFERENCES system_menu(id)       ON DELETE CASCADE,
    system_permission_id  BIGINT NOT NULL REFERENCES system_permission(id)  ON DELETE CASCADE,
    PRIMARY KEY (system_menu_id, system_permission_id)
);

CREATE INDEX idx_system_menu_permission_permission_id ON system_menu_permission (system_permission_id);
