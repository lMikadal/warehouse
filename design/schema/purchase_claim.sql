-- source: new (purchase-side claim document; parallel to order_claim)
--   - claim: supplier compensation; return: send goods back to supplier
--   - lines via purchase_claim_item → purchase_order_item_reject
--   - sku: null in draft (status='draft')
CREATE TYPE purchase_claim_type   AS ENUM ('claim', 'return');
CREATE TYPE purchase_claim_status AS ENUM ('draft', 'success', 'cancel');

CREATE TABLE purchase_claim (
    id                BIGSERIAL               PRIMARY KEY,              -- surrogate PK
    sku               VARCHAR(50),                                    -- claim document number; null in draft
    purchase_order_id BIGINT                  NOT NULL REFERENCES purchase_order(id) ON DELETE RESTRICT, -- parent PO
    type              purchase_claim_type     NOT NULL,                 -- claim vs return
    status            purchase_claim_status   NOT NULL DEFAULT 'draft', -- claim workflow state
    note              TEXT                    NOT NULL DEFAULT '',      -- header notes
    deleted_at        TIMESTAMPTZ,
    created_at        TIMESTAMPTZ             NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ             NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by        BIGINT                  REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by        BIGINT                  REFERENCES admin_user(id) ON DELETE SET NULL,
    CONSTRAINT uq_purchase_claim_sku UNIQUE (sku)
);

CREATE INDEX idx_purchase_claim_order      ON purchase_claim (purchase_order_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_purchase_claim_status     ON purchase_claim (status)           WHERE deleted_at IS NULL;
CREATE INDEX idx_purchase_claim_created_by ON purchase_claim (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_purchase_claim_updated_by ON purchase_claim (updated_by) WHERE updated_by IS NOT NULL;
