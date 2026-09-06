-- source: v1 order_purchase_item_rejects (renamed)
--   - image_url[] removed → purchase_order_item_reject_file (gallery; v1 max 3, app-enforced)
-- check:skip-audit (append-only receipt-discrepancy log; no updated_at/deleted_at)
CREATE TYPE purchase_order_item_reject_type         AS ENUM ('overage', 'shortage', 'damaged', 'wrong', 'other');
CREATE TYPE purchase_order_item_reject_overage_type AS ENUM ('receive', 'return');
CREATE TYPE purchase_order_item_reject_resolution   AS ENUM ('claim', 'return', 'reject');
CREATE TYPE purchase_order_item_reject_status       AS ENUM ('pending', 'process', 'completed', 'cancelled');

CREATE TABLE purchase_order_item_reject (
    id                        BIGSERIAL                             PRIMARY KEY,              -- surrogate PK
    purchase_order_id         BIGINT                                REFERENCES purchase_order(id) ON DELETE SET NULL, -- parent PO (denormalized)
    purchase_order_item_id    BIGINT                                NOT NULL REFERENCES purchase_order_item(id) ON DELETE CASCADE, -- parent PO line
    purchase_request_item_id  BIGINT                                REFERENCES purchase_request_item(id) ON DELETE SET NULL, -- source request line
    sku                       VARCHAR(50)                           NOT NULL,                 -- reject number
    type                      purchase_order_item_reject_type       NOT NULL,                 -- discrepancy type
    overage_type              purchase_order_item_reject_overage_type,          -- required iff type='overage'
    resolution                purchase_order_item_reject_resolution  NOT NULL DEFAULT 'claim', -- claim/return/reject outcome
    status                    purchase_order_item_reject_status      NOT NULL DEFAULT 'pending', -- resolution workflow state
    qty                       INTEGER                               NOT NULL,                 -- affected quantity
    unit                      product_unit                          NOT NULL DEFAULT 'piece', -- measurement unit
    price                     NUMERIC(15,4)                         NOT NULL DEFAULT 0,       -- ex-VAT unit price
    vat_rate                  NUMERIC(5,2)                          NOT NULL DEFAULT 0,       -- VAT rate snapshot
    note                      TEXT                                  NOT NULL DEFAULT '',      -- discrepancy notes
    note_resolution           TEXT                                  NOT NULL DEFAULT '',      -- resolution notes
    note_process              TEXT                                  NOT NULL DEFAULT '',      -- processing notes
    created_at                TIMESTAMPTZ                           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                BIGINT                                REFERENCES admin_user(id) ON DELETE SET NULL, -- reporter admin user
    CONSTRAINT uq_purchase_order_item_reject_sku UNIQUE (sku),
    CONSTRAINT chk_purchase_order_item_reject_qty CHECK (qty >= 0)
);

CREATE INDEX idx_purchase_order_item_reject_item    ON purchase_order_item_reject (purchase_order_item_id);
CREATE INDEX idx_purchase_order_item_reject_order   ON purchase_order_item_reject (purchase_order_id) WHERE purchase_order_id IS NOT NULL;
CREATE INDEX idx_purchase_order_item_reject_status  ON purchase_order_item_reject (status);
CREATE INDEX idx_purchase_order_item_reject_created_by ON purchase_order_item_reject (created_by) WHERE created_by IS NOT NULL;
