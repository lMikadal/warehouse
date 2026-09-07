-- source: v2 v2_order_order_claims (UUID→BIGSERIAL)
--   - claim: request for refund/exchange; return: product sent back to us
--   - payment_type: how refund/compensation is processed
--   - supplier_user_id: optional supplier to claim against
--   - status: order_claim_status (shared with order_claim_item; 6-step UI workflow)
CREATE TYPE order_claim_payment_type AS ENUM ('cash', 'transfer', 'other', 'debt_reduction');
CREATE TYPE order_claim_status  AS ENUM (
    'pending',           -- awaiting purchasing action
    'acknowledged',      -- purchasing opened/editing
    'waiting_supplier',  -- claim docs sent to supplier
    'success',           -- claim succeeded
    'cancelled',         -- claim failed (supplier outcome)
    'rejected'           -- rejected by purchasing
);

CREATE TABLE order_claim (
    id               BIGSERIAL                PRIMARY KEY,              -- surrogate PK
    sku              TEXT,                                    -- claim document number
    order_payment_id BIGINT                   NOT NULL REFERENCES order_payment(id) ON DELETE RESTRICT, -- source payment
    supplier_user_id BIGINT                   REFERENCES supplier_user(id) ON DELETE SET NULL, -- supplier to claim against (optional)
    type             claim_type               NOT NULL,                 -- claim vs return
    payment_type     order_claim_payment_type NOT NULL,                 -- refund/compensation method
    other_reason     TEXT                     NOT NULL DEFAULT '',      -- reason when payment_type='other'
    total_price      NUMERIC(15,4)            NOT NULL DEFAULT 0,       -- claim total amount
    status           order_claim_status  NOT NULL DEFAULT 'pending', -- claim workflow (same enum as lines)
    deleted_at       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ              NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMPTZ              NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by       BIGINT                   REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by       BIGINT                   REFERENCES admin_user(id) ON DELETE SET NULL,
    CONSTRAINT uq_order_claim_sku UNIQUE (sku)
);

CREATE INDEX idx_order_claim_payment    ON order_claim (order_payment_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_order_claim_supplier   ON order_claim (supplier_user_id) WHERE supplier_user_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_order_claim_status     ON order_claim (status)           WHERE deleted_at IS NULL;
CREATE INDEX idx_order_claim_created_by ON order_claim (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_order_claim_updated_by ON order_claim (updated_by) WHERE updated_by IS NOT NULL;
