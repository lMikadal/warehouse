-- source: v2 v2_order_order_claim_reasons (module setting; flat dropdown lookup)
--   - is_claim / is_return: filter which claim types can use this reason (CHECK: at least one true)
--   - sort_order: display order in dropdown (no hierarchy — not a tree table)
CREATE TABLE setting_claim_reason (
    id          BIGSERIAL    PRIMARY KEY,              -- surrogate PK
    is_claim    BOOLEAN      NOT NULL DEFAULT FALSE,   -- usable for claim type
    is_return   BOOLEAN      NOT NULL DEFAULT FALSE,   -- usable for return type
    sort_order  INTEGER      NOT NULL DEFAULT 0,       -- dropdown display order
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,    -- soft-disable without delete
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    CONSTRAINT chk_setting_claim_reason_type CHECK (is_claim OR is_return)
);

CREATE INDEX idx_setting_claim_reason_type_active
    ON setting_claim_reason (is_claim, is_return, sort_order)
    WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX idx_setting_claim_reason_created_by ON setting_claim_reason (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_setting_claim_reason_updated_by ON setting_claim_reason (updated_by) WHERE updated_by IS NOT NULL;
