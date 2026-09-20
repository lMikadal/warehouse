-- Quotation line items (product_item only; no compare type).
CREATE TABLE order_quotation_item (
    id                 BIGSERIAL                    PRIMARY KEY,
    order_quotation_id BIGINT                       NOT NULL REFERENCES order_quotation(id) ON DELETE CASCADE,
    product_item_id    BIGINT                       REFERENCES product_item(id) ON DELETE SET NULL,
    sort_order         INTEGER                      NOT NULL DEFAULT 0,
    amount             NUMERIC(15,4)                NOT NULL DEFAULT 0,
    price_per_unit     NUMERIC(15,4)                NOT NULL DEFAULT 0,
    discount           NUMERIC(15,4)                NOT NULL DEFAULT 0,
    vat_type           setting_vat_type             NOT NULL DEFAULT 'exclude',
    vat_rate           NUMERIC(5,2)                 NOT NULL DEFAULT 0,
    total_price        NUMERIC(15,4)                NOT NULL DEFAULT 0,
    deleted_at         TIMESTAMPTZ,
    created_at         TIMESTAMPTZ                  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMPTZ                  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by         BIGINT                       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by         BIGINT                       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_order_quotation_item_quote   ON order_quotation_item (order_quotation_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_order_quotation_item_product ON order_quotation_item (product_item_id) WHERE product_item_id IS NOT NULL;
CREATE INDEX idx_order_quotation_item_sort    ON order_quotation_item (order_quotation_id, sort_order) WHERE deleted_at IS NULL;
