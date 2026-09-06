-- source: v1 setting_payment (sale side) + v1 setting_pay (purchase side) merged
--   - is_sale / is_purchase flags replace the two-table split
--   - seed examples: Cash (sale+purchase), QR Code (sale+purchase), Bank Transfer (sale+purchase),
--                    Credit/Debit card (sale), Cash cheque (purchase), Credit term (purchase)
CREATE TABLE setting_payment_method (
    id          BIGSERIAL    PRIMARY KEY,              -- surrogate PK
    is_sale     BOOLEAN      NOT NULL DEFAULT TRUE,    -- available on sales/checkout
    is_purchase BOOLEAN      NOT NULL DEFAULT FALSE,   -- available on purchase orders
    sort_order  INTEGER      NOT NULL DEFAULT 100,     -- UI list order
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,    -- selectable when true
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_setting_payment_method_sale
    ON setting_payment_method (sort_order)
    WHERE deleted_at IS NULL AND is_active = TRUE AND is_sale = TRUE;
CREATE INDEX idx_setting_payment_method_purchase
    ON setting_payment_method (sort_order)
    WHERE deleted_at IS NULL AND is_active = TRUE AND is_purchase = TRUE;
CREATE INDEX idx_setting_payment_method_created_by ON setting_payment_method (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_setting_payment_method_updated_by ON setting_payment_method (updated_by) WHERE updated_by IS NOT NULL;
