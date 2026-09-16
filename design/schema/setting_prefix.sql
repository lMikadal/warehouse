-- source: new lookup (replaces member/supplier prefix enums)
--   - is_person / is_company: filter dropdown (บุคคล vs บริษัท); at least one true (CHECK)
--   - seed rows (7): person mr/mrs/miss; company co_ltd/pcl/ltd_part/individual
CREATE TABLE setting_prefix (
    id          BIGSERIAL    PRIMARY KEY,              -- surrogate PK
    is_person   BOOLEAN      NOT NULL DEFAULT FALSE,   -- usable for person / individual
    is_company  BOOLEAN      NOT NULL DEFAULT FALSE,   -- usable for company / juristic
    sort_order  INTEGER      NOT NULL DEFAULT 0,       -- display order within reorder scope
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,    -- selectable in prefix dropdowns
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    CONSTRAINT chk_setting_prefix_audience CHECK (is_person OR is_company)
);

CREATE INDEX idx_setting_prefix_audience_active
    ON setting_prefix (is_person, is_company, sort_order)
    WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX idx_setting_prefix_created_by ON setting_prefix (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_setting_prefix_updated_by ON setting_prefix (updated_by) WHERE updated_by IS NOT NULL;
