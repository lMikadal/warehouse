-- source: v1 product_products + v2 v2_product_products (UUID→BIGSERIAL)
--   - kept:    sku, product_brand_id, product_category_id, is_active, audit
--   - restored: tag, supplier_sku, note, is_new (v1); product_product_code still holds factory/other codes
--   - removed: sort_order (compute from name)
CREATE TABLE product_product (
    id                   BIGSERIAL    PRIMARY KEY,              -- surrogate PK
    sku                  TEXT         NOT NULL,                 -- unique product SKU
    product_brand_id     BIGINT       REFERENCES product_attribute(id) ON DELETE SET NULL,   -- type='brand'
    product_category_id  BIGINT       REFERENCES product_attribute(id) ON DELETE SET NULL,   -- type='category'
    tag                  TEXT         NOT NULL DEFAULT '',       -- comma-separated labels (e.g. ทดสอบ, 1, 2)
    supplier_sku         TEXT         NOT NULL DEFAULT '',       -- supplier-side SKU (v1 code_supplier)
    note                 TEXT         NOT NULL DEFAULT '',       -- admin note on product row (v1)
    is_new               BOOLEAN      NOT NULL DEFAULT FALSE,    -- highlight as new product (v1)
    is_active            BOOLEAN      NOT NULL DEFAULT TRUE,    -- sellable when TRUE
    deleted_at           TIMESTAMPTZ,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by           BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by           BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_product_product_sku    ON product_product (sku) WHERE deleted_at IS NULL;
CREATE INDEX idx_product_product_brand        ON product_product (product_brand_id)    WHERE product_brand_id IS NOT NULL;
CREATE INDEX idx_product_product_category     ON product_product (product_category_id) WHERE product_category_id IS NOT NULL;
CREATE INDEX idx_product_product_created_by   ON product_product (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_product_product_updated_by   ON product_product (updated_by) WHERE updated_by IS NOT NULL;
