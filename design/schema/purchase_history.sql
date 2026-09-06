-- source: v1 order_histories (renamed; v2 had no equivalent)
--   - replaces: 12 workflow *_by/*_at columns that were on purchase_order (approved_by/approved_at etc.)
--   - each status transition creates a row here for full audit trail
--   - old_status/new_status: TEXT (enum label) because parent entities use different status enums
--   - FKs cover PO side (order/item/reject/claim) and request side (request/item/reject)
-- check:skip-audit (append-only event log)
CREATE TABLE purchase_history (
    id                            BIGSERIAL    PRIMARY KEY,              -- surrogate PK
    purchase_order_id             BIGINT       REFERENCES purchase_order(id) ON DELETE SET NULL, -- related PO
    purchase_order_item_id        BIGINT       REFERENCES purchase_order_item(id) ON DELETE SET NULL, -- related PO line
    purchase_order_item_reject_id BIGINT       REFERENCES purchase_order_item_reject(id) ON DELETE SET NULL, -- related reject
    purchase_claim_id             BIGINT       REFERENCES purchase_claim(id) ON DELETE SET NULL, -- related claim
    purchase_claim_item_id        BIGINT       REFERENCES purchase_claim_item(id) ON DELETE SET NULL, -- related claim line
    purchase_request_id           BIGINT       REFERENCES purchase_request(id) ON DELETE SET NULL, -- related request
    purchase_request_item_id      BIGINT       REFERENCES purchase_request_item(id) ON DELETE SET NULL, -- related request line
    purchase_request_item_reject_id BIGINT     REFERENCES purchase_request_item_reject(id) ON DELETE SET NULL, -- related request line reject
    old_status                    TEXT,                                    -- prior status (enum label; NULL on initial set)
    new_status                    TEXT,                                    -- resulting status (enum label)
    created_at                    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                    BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL -- actor admin user
);

CREATE INDEX idx_purchase_history_order        ON purchase_history (purchase_order_id,        created_at DESC) WHERE purchase_order_id IS NOT NULL;
CREATE INDEX idx_purchase_history_request      ON purchase_history (purchase_request_id,       created_at DESC) WHERE purchase_request_id IS NOT NULL;
CREATE INDEX idx_purchase_history_order_item   ON purchase_history (purchase_order_item_id)   WHERE purchase_order_item_id IS NOT NULL;
CREATE INDEX idx_purchase_history_claim        ON purchase_history (purchase_claim_id,        created_at DESC) WHERE purchase_claim_id IS NOT NULL;
CREATE INDEX idx_purchase_history_claim_item   ON purchase_history (purchase_claim_item_id)  WHERE purchase_claim_item_id IS NOT NULL;
CREATE INDEX idx_purchase_history_created_by   ON purchase_history (created_by) WHERE created_by IS NOT NULL;
