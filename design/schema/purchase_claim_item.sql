-- source: new (purchase claim lines; parallel to order_claim_item)
--   - purchase_order_item_reject_id: receipt discrepancy being claimed
--   - amount: claimed amount (qty/value per business rules)
--   - status: confirmed | rejected per line (nullable until reviewed)
CREATE TABLE purchase_claim_item (
    id                            BIGSERIAL                    PRIMARY KEY,              -- surrogate PK
    purchase_claim_id             BIGINT                       NOT NULL REFERENCES purchase_claim(id) ON DELETE CASCADE, -- parent claim
    purchase_order_item_reject_id BIGINT                       NOT NULL REFERENCES purchase_order_item_reject(id) ON DELETE RESTRICT, -- source reject
    amount                        NUMERIC(15,4)                NOT NULL DEFAULT 0,       -- claimed amount
    status                        claim_item_status,                                     -- confirmed or rejected per line
    note                          TEXT                         NOT NULL DEFAULT '',      -- line notes
    deleted_at                    TIMESTAMPTZ,
    created_at                    TIMESTAMPTZ                  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                    TIMESTAMPTZ                  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                    BIGINT                       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by                    BIGINT                       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_purchase_claim_item_claim_reject
    ON purchase_claim_item (purchase_claim_id, purchase_order_item_reject_id)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_purchase_claim_item_claim
    ON purchase_claim_item (purchase_claim_id) WHERE deleted_at IS NULL;

CREATE INDEX idx_purchase_claim_item_reject
    ON purchase_claim_item (purchase_order_item_reject_id) WHERE deleted_at IS NULL;

CREATE INDEX idx_purchase_claim_item_created_by
    ON purchase_claim_item (created_by) WHERE created_by IS NOT NULL;

CREATE INDEX idx_purchase_claim_item_updated_by
    ON purchase_claim_item (updated_by) WHERE updated_by IS NOT NULL;
