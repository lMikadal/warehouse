-- source: v1 website_district (split from v2 setting_address generic table)
CREATE TABLE website_district (
    id                   BIGSERIAL    PRIMARY KEY,              -- surrogate PK
    website_province_id  BIGINT       NOT NULL REFERENCES website_province(id) ON DELETE RESTRICT, -- parent province
    sku                  TEXT,                                   -- optional district code
    sort_order           INTEGER      NOT NULL DEFAULT 0,       -- sibling order under province
    is_active            BOOLEAN      NOT NULL DEFAULT TRUE,    -- selectable in address forms
    deleted_at           TIMESTAMPTZ,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by           BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by           BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_website_district_province_sort
    ON website_district (website_province_id, sort_order)
    WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_website_district_sku
    ON website_district (sku)
    WHERE sku IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_website_district_active_sort
    ON website_district (sort_order)
    WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX idx_website_district_created_by ON website_district (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_website_district_updated_by ON website_district (updated_by) WHERE updated_by IS NOT NULL;
