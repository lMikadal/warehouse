-- source: v2 v2_order_order_payment (UUID→BIGSERIAL; field names cleaned up)
--   - payment_category: credit | payment (drives approval flow)
--   - amount_paid: cumulative paid; app maintains SUM(order_payment_method.amount)
--   - is_full: generated — amount_paid >= total_price (paid in full)
--   - is_paid: payment record settled/closed (workflow; separate from is_full)
--   - credit_approved_by / discount_approved_by: BIGINT FK (v2 had no FK)
--   - special_discount: additional one-time discount requiring approval
CREATE TYPE order_payment_category AS ENUM ('credit', 'payment');

CREATE TABLE order_payment (
    id                    BIGSERIAL              PRIMARY KEY,              -- surrogate PK
    order_list_id         BIGINT                 NOT NULL REFERENCES order_list(id) ON DELETE CASCADE, -- parent order
    sku                   TEXT,                                    -- payment document number
    payment_category      order_payment_category NOT NULL,         -- credit vs payment (approval flow)
    ordered_at            TIMESTAMPTZ            NOT NULL DEFAULT CURRENT_TIMESTAMP, -- payment record timestamp
    vat_rate              NUMERIC(5,2)           NOT NULL DEFAULT 0,       -- VAT rate snapshot
    discount              NUMERIC(15,4)          NOT NULL DEFAULT 0,       -- standard discount
    special_discount      NUMERIC(15,4)          NOT NULL DEFAULT 0,       -- one-time discount requiring approval
    total_price           NUMERIC(15,4)          NOT NULL DEFAULT 0,       -- payment total
    amount_paid           NUMERIC(15,4)          NOT NULL DEFAULT 0,       -- cumulative paid; app maintains SUM(order_payment_method.amount)
    is_full               BOOLEAN GENERATED ALWAYS AS (amount_paid >= total_price) STORED, -- paid in full
    is_paid               BOOLEAN                NOT NULL DEFAULT FALSE,   -- payment record settled/closed (not same as is_full)
    credit_approved_by    BIGINT                 REFERENCES admin_user(id) ON DELETE SET NULL, -- credit approver
    discount_approved_by  BIGINT                 REFERENCES admin_user(id) ON DELETE SET NULL, -- special-discount approver
    deleted_at            TIMESTAMPTZ,
    created_at            TIMESTAMPTZ            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by            BIGINT                 REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by            BIGINT                 REFERENCES admin_user(id) ON DELETE SET NULL,
    CONSTRAINT uq_order_payment_sku UNIQUE (sku)
);

CREATE INDEX idx_order_payment_order              ON order_payment (order_list_id)       WHERE deleted_at IS NULL;
CREATE INDEX idx_order_payment_unpaid             ON order_payment (order_list_id)       WHERE deleted_at IS NULL AND NOT is_full;
CREATE INDEX idx_order_payment_credit_approved_by ON order_payment (credit_approved_by)   WHERE credit_approved_by IS NOT NULL;
CREATE INDEX idx_order_payment_discount_approved  ON order_payment (discount_approved_by) WHERE discount_approved_by IS NOT NULL;
CREATE INDEX idx_order_payment_created_by         ON order_payment (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_order_payment_updated_by         ON order_payment (updated_by) WHERE updated_by IS NOT NULL;
