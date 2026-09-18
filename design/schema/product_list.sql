-- source: v1 product_products + v2 v2_product_products (UUID→BIGSERIAL)
--   - kept:    sku, product_brand_id, product_category_id, is_active, audit
--   - restored: tag, supplier_sku, note (v1); is_new lives on product_item; product_list_code holds factory/other codes
--   - removed: sort_order (compute from name)
CREATE TABLE product_list (
    id                   BIGSERIAL    PRIMARY KEY,              -- surrogate PK
    sku                  TEXT         NOT NULL,                 -- unique product SKU
    product_brand_id     BIGINT       REFERENCES product_attribute(id) ON DELETE SET NULL,   -- type='brand'
    product_category_id  BIGINT       REFERENCES product_attribute(id) ON DELETE SET NULL,   -- type='category'
    tag                  TEXT         NOT NULL DEFAULT '',       -- comma-separated labels (e.g. ทดสอบ, 1, 2)
    supplier_sku         TEXT         NOT NULL DEFAULT '',       -- supplier-side SKU (v1 code_supplier)
    note                 TEXT         NOT NULL DEFAULT '',       -- admin note on product row (v1)
    is_active            BOOLEAN      NOT NULL DEFAULT TRUE,    -- sellable when TRUE
    deleted_at           TIMESTAMPTZ,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by           BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by           BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_product_list_sku    ON product_list (sku) WHERE deleted_at IS NULL;
CREATE INDEX idx_product_list_brand        ON product_list (product_brand_id)    WHERE product_brand_id IS NOT NULL;
CREATE INDEX idx_product_list_category     ON product_list (product_category_id) WHERE product_category_id IS NOT NULL;
CREATE INDEX idx_product_list_created_by   ON product_list (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_product_list_updated_by   ON product_list (updated_by) WHERE updated_by IS NOT NULL;
