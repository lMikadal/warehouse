-- source: split from v2_member_setting (type=group)
--   - pricing group lookup (ราคาปลีก, ราคาส่ง)
CREATE TABLE member_setting_group (
    id          BIGSERIAL    PRIMARY KEY,              -- surrogate PK
    sku         VARCHAR(100),                           -- optional code
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,   -- whether row is selectable
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_member_setting_group_sku
    ON member_setting_group (sku)
    WHERE sku IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_member_setting_group_active
    ON member_setting_group (id)
    WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX idx_member_setting_group_created_by ON member_setting_group (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_member_setting_group_updated_by ON member_setting_group (updated_by) WHERE updated_by IS NOT NULL;
