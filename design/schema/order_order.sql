-- source: v2 v2_order_bills + v2_order_orders merged (1:1 → single table)
--         + v2_order_bill_members fields inlined
--   - bill + order were always 1:1 (uq_v2_order_orders_bill_id enforced this); merged for simplicity
--   - status: sale-document lifecycle (draft/pending/success/cancelled/rejected)
--   - fulfill_status: warehouse fulfillment lifecycle (pending/in_progress/success/fail)
--   - member_user_id: FK to member (was bill_member with no FK in v2 — restored)
--   - member_name / member_tel / member_email: snapshot at order time (denormalized intentionally)
--   - member_setting_relation_id: which member profile combo drove pricing
--   - parent_id: for split orders / order families (was bill.parent_id in v2)
CREATE TYPE order_order_status         AS ENUM ('draft', 'pending', 'success', 'cancelled', 'rejected');
CREATE TYPE order_order_fulfill_status AS ENUM ('pending', 'in_progress', 'success', 'fail');

CREATE TABLE order_order (
    id                 BIGSERIAL                    PRIMARY KEY,              -- surrogate PK
    sku                TEXT,                -- order number (null in draft; unique when set)
    status             order_order_status         NOT NULL DEFAULT 'draft', -- sale-document lifecycle
    fulfill_status     order_order_fulfill_status NOT NULL DEFAULT 'pending',  -- warehouse fulfillment lifecycle
    parent_id          BIGINT               REFERENCES order_order(id) ON DELETE SET NULL, -- split-order parent
    member_user_id             BIGINT               REFERENCES member_user(id) ON DELETE SET NULL, -- member account
    member_setting_relation_id BIGINT         REFERENCES member_setting_relation(id) ON DELETE SET NULL, -- profile combo used
    member_name        TEXT,                                    -- member name snapshot at order time
    member_tel         TEXT,                                    -- member phone snapshot at order time
    member_email       TEXT,                                    -- member email snapshot at order time
    ordered_at         TIMESTAMPTZ,                             -- order placement timestamp
    deleted_at         TIMESTAMPTZ,
    created_at         TIMESTAMPTZ          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMPTZ          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by         BIGINT               REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by         BIGINT               REFERENCES admin_user(id) ON DELETE SET NULL,
    CONSTRAINT uq_order_order_sku UNIQUE (sku)
);

CREATE INDEX idx_order_order_status         ON order_order (status)           WHERE deleted_at IS NULL;
CREATE INDEX idx_order_order_fulfill        ON order_order (fulfill_status)   WHERE deleted_at IS NULL;
CREATE INDEX idx_order_order_member         ON order_order (member_user_id) WHERE member_user_id IS NOT NULL;
CREATE INDEX idx_order_order_member_setting_relation ON order_order (member_setting_relation_id) WHERE member_setting_relation_id IS NOT NULL;
CREATE INDEX idx_order_order_parent         ON order_order (parent_id)        WHERE parent_id IS NOT NULL;
CREATE INDEX idx_order_order_created_by     ON order_order (created_by)       WHERE created_by IS NOT NULL;
CREATE INDEX idx_order_order_updated_by     ON order_order (updated_by)       WHERE updated_by IS NOT NULL;
