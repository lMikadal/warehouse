-- source: v1 setting_code
--   - renamed: decode→code, encode→value (original names were opaque)
CREATE TABLE setting_code (
    id          BIGSERIAL    PRIMARY KEY,              -- surrogate PK
    code        VARCHAR(255) NOT NULL,                 -- human-readable label / external code
    value       VARCHAR(255) NOT NULL,                 -- internal encoded value
    sort_order  INTEGER      NOT NULL DEFAULT 100,     -- UI list order
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,    -- in use when true
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_setting_code_active_sort ON setting_code (sort_order) WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX idx_setting_code_created_by  ON setting_code (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_setting_code_updated_by  ON setting_code (updated_by) WHERE updated_by IS NOT NULL;
