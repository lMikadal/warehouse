-- source: v2 v2_order_bill_items + v2_order_order_items merged (renamed order_item → order_list_item)
--   - amount: ordered quantity
--   - amount_picked: picked qty (may differ from amount — over/short)
--   - amount_checked: verified qty before billing (SUM from order_list_item_warehouse; maintained by app)
--   - pick locations: order_list_item_warehouse (per location amount_checked)
--   - status: fulfillment status per line (pending/in_progress/success)
--   - price/discount/total_price: pricing snapshot at order time (VAT at order_payment_item)
--   - detail JSONB: only for compare-type lines (type='compare')
CREATE TYPE order_list_item_status AS ENUM ('pending', 'in_progress', 'success');
CREATE TYPE order_list_item_type   AS ENUM ('item', 'compare');

CREATE TABLE order_list_item (
    id                      BIGSERIAL                    PRIMARY KEY,              -- surrogate PK
    order_list_id           BIGINT                       NOT NULL REFERENCES order_list(id) ON DELETE CASCADE, -- parent order
    product_item_id         BIGINT                       REFERENCES product_item(id) ON DELETE SET NULL, -- catalog product
    type                    order_list_item_type         NOT NULL DEFAULT 'item',  -- item vs compare line
    amount                  NUMERIC(15,4)                NOT NULL DEFAULT 0,       -- ordered quantity
    amount_picked           NUMERIC(15,4)                NOT NULL DEFAULT 0,       -- picked qty (may differ from amount)
    amount_checked          NUMERIC(15,4)                NOT NULL DEFAULT 0,       -- verified qty before billing
    status                  order_list_item_status       NOT NULL DEFAULT 'pending',  -- fulfillment status per line
    price_per_unit          NUMERIC(15,4)                NOT NULL DEFAULT 0,       -- unit price snapshot
    discount                NUMERIC(15,4)                NOT NULL DEFAULT 0,       -- line discount
    vat_type                setting_vat_type             NOT NULL DEFAULT 'exclude', -- snapshot from product_item or order header
    vat_rate                NUMERIC(5,2)                 NOT NULL DEFAULT 0,       -- VAT rate snapshot
    total_price             NUMERIC(15,4)                NOT NULL DEFAULT 0,       -- line total price
    detail                  JSONB,                                                 -- compare-line payload only
    deleted_at              TIMESTAMPTZ,
    created_at              TIMESTAMPTZ                  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMPTZ                  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by              BIGINT                       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by              BIGINT                       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_order_list_item_order      ON order_list_item (order_list_id)  WHERE deleted_at IS NULL;
CREATE INDEX idx_order_list_item_product    ON order_list_item (product_item_id) WHERE product_item_id IS NOT NULL;
CREATE INDEX idx_order_list_item_status     ON order_list_item (status)          WHERE deleted_at IS NULL;
CREATE INDEX idx_order_list_item_created_by ON order_list_item (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_order_list_item_updated_by ON order_list_item (updated_by) WHERE updated_by IS NOT NULL;
