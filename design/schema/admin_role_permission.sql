-- junction: no surrogate id, no audit columns (created_at for traceability only)
CREATE TABLE admin_role_permission (
    admin_role_id        BIGINT      NOT NULL REFERENCES admin_role(id)       ON DELETE CASCADE,
    system_permission_id BIGINT      NOT NULL REFERENCES system_permission(id)  ON DELETE CASCADE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (admin_role_id, system_permission_id)
);

CREATE INDEX idx_admin_role_permission_permission_id ON admin_role_permission (system_permission_id);
