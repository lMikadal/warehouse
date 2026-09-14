-- source: v1 system_sub_district (split from v2 setting_address generic table)
--   - postcode lives here (meaningful at sub-district level only)
CREATE TABLE system_sub_district (
    id                   BIGSERIAL    PRIMARY KEY,              -- surrogate PK
    system_district_id  BIGINT       NOT NULL REFERENCES system_district(id) ON DELETE RESTRICT, -- parent district
    sku                  TEXT,                                   -- optional sub-district code
    postcode             TEXT,                                   -- postal code for this sub-district
    sort_order           INTEGER      NOT NULL DEFAULT 0,       -- sibling order under district
    is_active            BOOLEAN      NOT NULL DEFAULT TRUE,    -- selectable in address forms
    deleted_at           TIMESTAMPTZ,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by           BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by           BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_system_sub_district_district_sort
    ON system_sub_district (system_district_id, sort_order)
    WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_system_sub_district_sku
    ON system_sub_district (sku)
    WHERE sku IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_system_sub_district_active_sort
    ON system_sub_district (sort_order)
    WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX idx_system_sub_district_created_by ON system_sub_district (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_system_sub_district_updated_by ON system_sub_district (updated_by) WHERE updated_by IS NOT NULL;
