CREATE TYPE system_permission_action AS ENUM ('view', 'create', 'update', 'delete', 'import', 'export');
CREATE TYPE system_permission_method AS ENUM ('GET', 'POST', 'PUT', 'PATCH', 'DELETE');

CREATE TABLE system_permission (
    id        BIGSERIAL                NOT NULL,
    code      VARCHAR(255)             NOT NULL,
    module    VARCHAR(100)             NOT NULL,
    type      VARCHAR(100)             NOT NULL,
    action    system_permission_action  NOT NULL,
    resource  VARCHAR(255)             NOT NULL,
    method    system_permission_method  NOT NULL,
    is_active BOOLEAN                  NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at  TIMESTAMPTZ,
    created_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_system_permission_code        UNIQUE (code),
    CONSTRAINT chk_system_permission_code_format
        CHECK (code = module || '.' || type || '.' || action::text)
);

CREATE INDEX idx_system_permission_module     ON system_permission (module);
CREATE INDEX idx_system_permission_active     ON system_permission (module, type, action)
    WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX idx_system_permission_created_by ON system_permission (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_system_permission_updated_by ON system_permission (updated_by) WHERE updated_by IS NOT NULL;
