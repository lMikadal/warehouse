-- source: v1 admin_permissions + v2 v2_admin_permissions combined
--   - restored: resource (API path), method (HTTP verb) — v2 dropped these; needed for API guard middleware
--   - kept:     code format "module.type.action" from v2 (slug renamed to code)
--   - renamed:  action values use v2 "view" instead of v1 "read"
CREATE TYPE admin_permission_action AS ENUM ('view', 'create', 'update', 'delete', 'import', 'export');
CREATE TYPE admin_permission_method AS ENUM ('GET', 'POST', 'PUT', 'PATCH', 'DELETE');

CREATE TABLE admin_permission (
    id        BIGSERIAL                NOT NULL,           -- surrogate PK
    code      VARCHAR(255)             NOT NULL,           -- "module.type.action" e.g. "product.item.create"
    module    VARCHAR(100)             NOT NULL,           -- domain module e.g. product, order
    type      VARCHAR(100)             NOT NULL,           -- feature area e.g. item, product
    action    admin_permission_action  NOT NULL,           -- CRUD-style action
    resource  VARCHAR(255)             NOT NULL,           -- API path e.g. "/api/v1/product/items"
    method    admin_permission_method  NOT NULL,           -- HTTP verb for route guard
    is_active BOOLEAN                  NOT NULL DEFAULT TRUE, -- false = hide/disable in UI even if role grants
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at  TIMESTAMPTZ,
    created_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_admin_permission_code        UNIQUE (code),
    CONSTRAINT chk_admin_permission_code_format
        CHECK (code = module || '.' || type || '.' || action::text)
);

CREATE INDEX idx_admin_permission_module     ON admin_permission (module);
CREATE INDEX idx_admin_permission_active     ON admin_permission (module, type, action)
    WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX idx_admin_permission_created_by ON admin_permission (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_admin_permission_updated_by ON admin_permission (updated_by) WHERE updated_by IS NOT NULL;
