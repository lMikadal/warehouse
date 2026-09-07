-- source: v2 v2_order_order_payment_item (renamed; "item" was ambiguous vs product line)
--   - breakdown of HOW a payment was made (amount per method)
--   - setting_payment_method_id: sale-side method (app validates is_sale=TRUE, is_active, not deleted)
CREATE TABLE order_payment_method (
    id                          BIGSERIAL     PRIMARY KEY,              -- surrogate PK
    order_payment_id            BIGINT        NOT NULL REFERENCES order_payment(id) ON DELETE CASCADE, -- parent payment
    setting_payment_method_id   BIGINT        NOT NULL REFERENCES setting_payment_method(id) ON DELETE RESTRICT, -- sale payment method
    amount                      NUMERIC(15,4) NOT NULL DEFAULT 0,       -- amount paid via this method
    created_at                  TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at                  TIMESTAMPTZ,
    created_by                  BIGINT        REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by                  BIGINT        REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_order_payment_method_payment_setting
    ON order_payment_method (order_payment_id, setting_payment_method_id)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_order_payment_method_payment  ON order_payment_method (order_payment_id)         WHERE deleted_at IS NULL;
CREATE INDEX idx_order_payment_method_setting  ON order_payment_method (setting_payment_method_id);
CREATE INDEX idx_order_payment_method_created_by ON order_payment_method (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_order_payment_method_updated_by ON order_payment_method (updated_by) WHERE updated_by IS NOT NULL;
