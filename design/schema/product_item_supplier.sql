-- source: v1 product_item_suppliers (reshaped — cost only; stock on product_item_stock)
-- check:skip-audit (child cost row; hard delete, no soft-delete)
CREATE TABLE product_item_supplier (
    id                   BIGSERIAL                             PRIMARY KEY,              -- surrogate PK
    product_item_id      BIGINT        NOT NULL REFERENCES product_item(id)       ON DELETE CASCADE, -- parent variant
    supplier_user_id     BIGINT        NOT NULL REFERENCES supplier_user(id)  ON DELETE RESTRICT, -- supplier
    cost_price           NUMERIC(15,4) NOT NULL DEFAULT 0,    -- ex-VAT supplier cost
    vat_rate             NUMERIC(5,2)  NOT NULL DEFAULT 0,    -- VAT rate snapshot at save time
    discount             NUMERIC(15,4) NOT NULL DEFAULT 0,    -- discount value
    discount_type        discount_unit NOT NULL DEFAULT 'baht', -- baht or percent
    created_at           TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by           BIGINT        REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by           BIGINT        REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_product_item_supplier_item_supplier
    ON product_item_supplier (product_item_id, supplier_user_id);

CREATE INDEX idx_product_item_supplier_item       ON product_item_supplier (product_item_id);
CREATE INDEX idx_product_item_supplier_supplier   ON product_item_supplier (supplier_user_id);
CREATE INDEX idx_product_item_supplier_created_by ON product_item_supplier (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_product_item_supplier_updated_by ON product_item_supplier (updated_by) WHERE updated_by IS NOT NULL;
