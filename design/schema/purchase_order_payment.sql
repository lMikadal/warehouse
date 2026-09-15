-- source: v1 order_purchase_payment (renamed)
--   - setting_payment_method_id: replaces setting_pay_id (consolidated table)
--   - supplier_bank_id: the supplier bank account used for this payment
--   - pricing: vat_rate + discount → total_price (aligned with purchase_order; no special_discount)
--   - image_url → system_file_id (purpose: purchase_order_payment_proof)
CREATE TABLE purchase_order_payment (
    id                          BIGSERIAL     PRIMARY KEY,              -- surrogate PK
    purchase_order_id           BIGINT        NOT NULL REFERENCES purchase_order(id) ON DELETE CASCADE, -- parent PO
    setting_payment_method_id   BIGINT        NOT NULL REFERENCES setting_payment_method(id) ON DELETE RESTRICT, -- payment method
    supplier_bank_id            BIGINT        REFERENCES supplier_bank(id) ON DELETE SET NULL, -- supplier bank account used
    vat_rate                    NUMERIC(5,2)  NOT NULL DEFAULT 0,       -- VAT rate snapshot
    discount                    NUMERIC(15,4) NOT NULL DEFAULT 0,       -- payment discount
    total_price                 NUMERIC(15,4) NOT NULL DEFAULT 0,       -- payment total
    note                        TEXT          NOT NULL DEFAULT '',      -- payment notes
    system_file_id             BIGINT        REFERENCES system_file(id) ON DELETE RESTRICT, -- payment proof (purpose: purchase_order_payment_proof)
    credit_term                 INTEGER,      -- payment days agreed for this payment
    paid_at                     TIMESTAMPTZ,                             -- payment timestamp
    deleted_at                  TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  BIGINT        REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by                  BIGINT        REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_purchase_order_payment_order   ON purchase_order_payment (purchase_order_id);
CREATE INDEX idx_purchase_order_payment_method  ON purchase_order_payment (setting_payment_method_id);
CREATE INDEX idx_purchase_order_payment_bank    ON purchase_order_payment (supplier_bank_id) WHERE supplier_bank_id IS NOT NULL;
CREATE INDEX idx_purchase_order_payment_file       ON purchase_order_payment (system_file_id) WHERE system_file_id IS NOT NULL;
CREATE INDEX idx_purchase_order_payment_created_by ON purchase_order_payment (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_purchase_order_payment_updated_by ON purchase_order_payment (updated_by) WHERE updated_by IS NOT NULL;
