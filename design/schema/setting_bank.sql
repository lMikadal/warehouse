-- source: v1 setting_banks (v2 had no equivalent — gap restored; needed for supplier_bank)
--   - image_url → system_file_id (purpose: setting_bank_logo)
CREATE TABLE setting_bank (
    id          BIGSERIAL    PRIMARY KEY,              -- surrogate PK
    system_file_id BIGINT       REFERENCES system_file(id) ON DELETE RESTRICT, -- bank logo (purpose: setting_bank_logo)
    sort_order  INTEGER      NOT NULL DEFAULT 100,     -- UI list order
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,    -- selectable in bank forms
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_setting_bank_file        ON setting_bank (system_file_id) WHERE system_file_id IS NOT NULL;
CREATE INDEX idx_setting_bank_active_sort ON setting_bank (sort_order) WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX idx_setting_bank_created_by  ON setting_bank (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_setting_bank_updated_by  ON setting_bank (updated_by) WHERE updated_by IS NOT NULL;
