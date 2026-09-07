-- source: v1 product_item_warehouses (UUID→BIGSERIAL; shelfs_id → shelf_id)
--   - denormalized path FKs into warehouse_list (types: warehouse, zone, shelf, rack, bin)
--   - when warehouse_list is re-parented or reordered, app must refresh this path —
--     resolve from bin_id first (leaf anchor), walk parent_id chain to fill warehouse_id..bin_id
--   - stock_qty not stored; derive SUM(remain_quantity) from product_item_stock
CREATE TABLE product_item_warehouse (
    id                BIGSERIAL    PRIMARY KEY,              -- surrogate PK
    product_item_id   BIGINT       NOT NULL REFERENCES product_item(id)       ON DELETE CASCADE, -- parent variant
    warehouse_id      BIGINT       NOT NULL REFERENCES warehouse_list(id) ON DELETE RESTRICT, -- root type=warehouse
    zone_id           BIGINT       REFERENCES warehouse_list(id) ON DELETE RESTRICT, -- type=zone
    shelf_id          BIGINT       REFERENCES warehouse_list(id) ON DELETE RESTRICT, -- type=shelf
    rack_id           BIGINT       REFERENCES warehouse_list(id) ON DELETE RESTRICT, -- type=rack
    bin_id            BIGINT       REFERENCES warehouse_list(id) ON DELETE RESTRICT, -- type=bin (primary sync anchor)
    deleted_at        TIMESTAMPTZ,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by        BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by        BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_product_item_warehouse_item       ON product_item_warehouse (product_item_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_product_item_warehouse_bin        ON product_item_warehouse (bin_id) WHERE bin_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_product_item_warehouse_created_by ON product_item_warehouse (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_product_item_warehouse_updated_by ON product_item_warehouse (updated_by) WHERE updated_by IS NOT NULL;
