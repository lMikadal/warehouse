-- source: v1 admin_roles + v2 v2_admin_roles (UUID→BIGSERIAL; name moved to admin_role_language)
CREATE TABLE admin_role (
    id          BIGSERIAL   PRIMARY KEY,              -- surrogate PK
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,     -- assignable when true
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  BIGINT      REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by  BIGINT      REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_admin_role_active_not_deleted ON admin_role (created_at)
    WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX idx_admin_role_created_by ON admin_role (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_admin_role_updated_by ON admin_role (updated_by) WHERE updated_by IS NOT NULL;
