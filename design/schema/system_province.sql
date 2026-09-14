-- source: v1 system_province (split from v2 setting_address generic table)
CREATE TABLE system_province (
    id                  BIGSERIAL    PRIMARY KEY,              -- surrogate PK
    system_country_id  BIGINT       NOT NULL REFERENCES system_country(id) ON DELETE RESTRICT, -- parent country
    sku                 TEXT,                                   -- optional province code
    sort_order          INTEGER      NOT NULL DEFAULT 0,       -- sibling order under country
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,    -- selectable in address forms
    deleted_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by          BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by          BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_system_province_country_sort
    ON system_province (system_country_id, sort_order)
    WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_system_province_sku
    ON system_province (sku)
    WHERE sku IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_system_province_active_sort
    ON system_province (sort_order)
    WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX idx_system_province_created_by ON system_province (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_system_province_updated_by ON system_province (updated_by) WHERE updated_by IS NOT NULL;
