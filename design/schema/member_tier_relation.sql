-- source: v1 member_tier_items + v2 v2_member_tier_items (renamed)
--   - member_setting_relation_id: per-profile-combo override of tier defaults
--   - purchase_start/purchase_end: purchase-amount thresholds for this combo
--   - type: product scope override (all / brand / category / exceptions)
--   - is_promotion: whether to skip promotion stacking
--   - unique: (member_tier_id, member_setting_relation_id) prevents duplicate rules per tier+combo
CREATE TABLE member_tier_relation (
    id                         BIGSERIAL                      PRIMARY KEY,              -- surrogate PK
    member_tier_id             BIGINT                         NOT NULL REFERENCES member_tier(id)             ON DELETE CASCADE, -- owning tier
    member_setting_relation_id BIGINT                         NOT NULL REFERENCES member_setting_relation(id) ON DELETE RESTRICT, -- profile combo this rule applies to
    purchase_start             NUMERIC(15,4)                  NOT NULL DEFAULT 0,       -- min purchase amount threshold
    purchase_end               NUMERIC(15,4)                  NOT NULL DEFAULT 0,       -- max purchase amount threshold
    discount                   NUMERIC(15,4)                  NOT NULL DEFAULT 0,       -- discount value
    discount_type              discount_unit NOT NULL DEFAULT 'percent', -- percent or fixed baht
    type                       member_tier_relation_type      NOT NULL DEFAULT 'all',   -- product scope (all, brand, category, etc.)
    is_promotion               BOOLEAN                        NOT NULL DEFAULT FALSE,   -- skip promotion stacking when true
    deleted_at                 TIMESTAMPTZ,
    created_at                 TIMESTAMPTZ                    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                 TIMESTAMPTZ                    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                 BIGINT                         REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by                 BIGINT                         REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_member_tier_relation_tier_combo
    ON member_tier_relation (member_tier_id, member_setting_relation_id)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_member_tier_relation_tier       ON member_tier_relation (member_tier_id)             WHERE deleted_at IS NULL;
CREATE INDEX idx_member_tier_relation_setting    ON member_tier_relation (member_setting_relation_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_member_tier_relation_created_by ON member_tier_relation (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_member_tier_relation_updated_by ON member_tier_relation (updated_by) WHERE updated_by IS NOT NULL;
