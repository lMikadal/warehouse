-- source: v1 product_item_warehouses (UUID→BIGSERIAL)
--   - placement leaf: bin_id → warehouse_list (type=bin)
--   - warehouse / zone / shelf / rack path derived at read time via warehouse_list.parent_id walk
--   - stock_qty not stored; derive SUM(remain_quantity) from product_item_stock
--   - one active row per bin (one product_item per bin); same item may use many bins
CREATE TABLE product_item_warehouse (
    id                BIGSERIAL    PRIMARY KEY,              -- surrogate PK
    product_item_id   BIGINT       NOT NULL REFERENCES product_item(id)       ON DELETE CASCADE, -- parent variant
    bin_id            BIGINT       NOT NULL REFERENCES warehouse_list(id) ON DELETE RESTRICT, -- type=bin (placement anchor; unique among active rows)
    deleted_at        TIMESTAMPTZ,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by        BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by        BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_product_item_warehouse_item       ON product_item_warehouse (product_item_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_product_item_warehouse_bin_unique ON product_item_warehouse (bin_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_product_item_warehouse_created_by ON product_item_warehouse (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_product_item_warehouse_updated_by ON product_item_warehouse (updated_by) WHERE updated_by IS NOT NULL;
