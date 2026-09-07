-- source: v2 v2_order_order_claim_items (UUID→BIGSERIAL)
--   - order_payment_item_id: priced line snapshot at claim time
--   - status: order_claim_status (defined in order_claim.sql)
CREATE TABLE order_claim_item (
    id                      BIGSERIAL                PRIMARY KEY,              -- surrogate PK
    order_claim_id          BIGINT                   NOT NULL REFERENCES order_claim(id) ON DELETE CASCADE, -- parent claim
    order_payment_item_id   BIGINT                   NOT NULL REFERENCES order_payment_item(id) ON DELETE RESTRICT, -- priced line snapshot
    setting_claim_reason_id BIGINT                   NOT NULL REFERENCES setting_claim_reason(id) ON DELETE RESTRICT, -- claim reason (setting module)
    type                    claim_type               NOT NULL,                 -- claim vs return
    amount                  NUMERIC(15,4)            NOT NULL DEFAULT 0,       -- claimed quantity
    status                  order_claim_status  NOT NULL DEFAULT 'pending', -- line workflow state
    note                    TEXT                     NOT NULL DEFAULT '',      -- line notes
    deleted_at              TIMESTAMPTZ,
    created_at              TIMESTAMPTZ              NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMPTZ              NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by              BIGINT                   REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by              BIGINT                   REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_order_claim_item_claim                ON order_claim_item (order_claim_id)        WHERE deleted_at IS NULL;
CREATE INDEX idx_order_claim_item_payment_item         ON order_claim_item (order_payment_item_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_order_claim_item_setting_claim_reason ON order_claim_item (setting_claim_reason_id);
CREATE INDEX idx_order_claim_item_status               ON order_claim_item (status)               WHERE deleted_at IS NULL;
CREATE INDEX idx_order_claim_item_created_by           ON order_claim_item (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_order_claim_item_updated_by           ON order_claim_item (updated_by) WHERE updated_by IS NOT NULL;
