-- source: new lookup (replaces member/supplier prefix enums)
--   - type person | company: filters dropdown (บุคคล vs บริษัท)
--   - code: stable slug for API/seed (mr, co_ltd, …)
--   - seed rows (7): person mr/mrs/miss; company co_ltd/pcl/ltd_part/individual
CREATE TYPE setting_prefix_type AS ENUM ('person', 'company');

CREATE TABLE setting_prefix (
    id          BIGSERIAL           PRIMARY KEY,              -- surrogate PK
    type        setting_prefix_type NOT NULL,                 -- person or company — filters dropdown
    code        VARCHAR(50)         NOT NULL,                 -- stable slug (mr, co_ltd, …) for API/seed
    sort_order  INTEGER             NOT NULL DEFAULT 0,       -- display order within type
    is_active   BOOLEAN             NOT NULL DEFAULT TRUE,    -- selectable in prefix dropdowns
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  BIGINT              REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by  BIGINT              REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_setting_prefix_code
    ON setting_prefix (code)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_setting_prefix_type_active
    ON setting_prefix (type, sort_order)
    WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX idx_setting_prefix_created_by ON setting_prefix (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_setting_prefix_updated_by ON setting_prefix (updated_by) WHERE updated_by IS NOT NULL;
