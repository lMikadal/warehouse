-- source: v1 system_country (split from v2 setting_address generic table)
--   - root of geo hierarchy; flat list ordered by sort_order
--   - sku: optional admin code e.g. country ISO
CREATE TABLE system_country (
    id          BIGSERIAL    PRIMARY KEY,              -- surrogate PK
    sku         TEXT,                                   -- optional country code
    sort_order  INTEGER      NOT NULL DEFAULT 0,       -- UI list order
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,    -- selectable in address forms
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_system_country_sku
    ON system_country (sku)
    WHERE sku IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_system_country_active_sort
    ON system_country (sort_order)
    WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX idx_system_country_created_by ON system_country (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_system_country_updated_by ON system_country (updated_by) WHERE updated_by IS NOT NULL;
