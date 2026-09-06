-- source: v1 setting_sale_platform + v2 v2_setting_sale_channels merged (UUID→BIGSERIAL)
--   - renamed: sale_platform → sale_channel (v2 naming)
--   - member_setting_id: links sale channel to member setting type (e.g. retail / wholesale)
--   - indexes added (v2 had none at all)
CREATE TABLE setting_sale_channel (
    id                BIGSERIAL    PRIMARY KEY,              -- surrogate PK
    image_url         TEXT,                                   -- channel logo URL
    is_active         BOOLEAN      NOT NULL DEFAULT TRUE,    -- available for orders
    is_default        BOOLEAN      NOT NULL DEFAULT FALSE,   -- default channel for new orders
    member_setting_id BIGINT       REFERENCES member_setting(id) ON DELETE SET NULL, -- linked member pricing group
    sort_order        INTEGER      NOT NULL DEFAULT 100,     -- UI list order
    deleted_at        TIMESTAMPTZ,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by        BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by        BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_setting_sale_channel_active
    ON setting_sale_channel (sort_order)
    WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX idx_setting_sale_channel_member_setting
    ON setting_sale_channel (member_setting_id)
    WHERE member_setting_id IS NOT NULL;
CREATE INDEX idx_setting_sale_channel_created_by ON setting_sale_channel (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_setting_sale_channel_updated_by ON setting_sale_channel (updated_by) WHERE updated_by IS NOT NULL;
