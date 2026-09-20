-- source: v2 v2_order_order_payment_order_items (renamed; captures priced product snapshot at payment time)
--   - each row = one order_list_item's price snapshot at the moment of this payment
--   - unique (order_payment_id, order_list_item_id): one snapshot per item per payment
CREATE TABLE order_payment_item (
    id                    BIGSERIAL     PRIMARY KEY,              -- surrogate PK
    order_payment_id      BIGINT        NOT NULL REFERENCES order_payment(id) ON DELETE CASCADE, -- parent payment
    order_list_item_id    BIGINT        NOT NULL REFERENCES order_list_item(id) ON DELETE RESTRICT, -- source order line
    amount                NUMERIC(15,4) NOT NULL DEFAULT 0,       -- quantity at payment time
    vat_rate              NUMERIC(5,2)  NOT NULL DEFAULT 0,       -- VAT rate snapshot
    price_per_unit        NUMERIC(15,4) NOT NULL DEFAULT 0,       -- unit price snapshot
    discount              NUMERIC(15,4) NOT NULL DEFAULT 0,       -- line discount snapshot
    total_price           NUMERIC(15,4) NOT NULL DEFAULT 0,       -- line total snapshot
    deleted_at            TIMESTAMPTZ,
    created_at            TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by            BIGINT        REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by            BIGINT        REFERENCES admin_user(id) ON DELETE SET NULL,
    CONSTRAINT uq_order_payment_item_payment_order_item UNIQUE (order_payment_id, order_list_item_id)
);

CREATE INDEX idx_order_payment_item_payment    ON order_payment_item (order_payment_id);
CREATE INDEX idx_order_payment_item_order_item ON order_payment_item (order_list_item_id);
