-- source: v1 admin_role_permissions + v2 v2_admin_role_permissions
-- junction: no surrogate id, no audit columns (created_at for traceability only)
CREATE TABLE admin_role_permission (
    admin_role_id        BIGINT      NOT NULL REFERENCES admin_role(id)       ON DELETE CASCADE, -- role
    admin_permission_id  BIGINT      NOT NULL REFERENCES admin_permission(id)  ON DELETE CASCADE, -- granted permission
    created_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (admin_role_id, admin_permission_id)
);

CREATE INDEX idx_admin_role_permission_permission_id ON admin_role_permission (admin_permission_id);
