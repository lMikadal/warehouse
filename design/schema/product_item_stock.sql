-- source: v1 product_item_stock + v2 v2_product_product_item_stocks
--   - restored: purchase_order_item_id FK (links stock lot to PO receive — enables FIFO/cost tracking)
--   - restored: cost_per_unit, discount_per_unit (lot-level costing; v2 lost this)
--   - restored: remain_quantity as NUMERIC (v2 used INTEGER — fractional units exist for weight/volume)
--   - restored: is_used (marks the single active stock lot per item; partial unique enforces one active lot)
--   - received_at: replaces v1 "receipted_at" (spelling fixed)
--   - qty columns use NUMERIC(15,4) for fractional unit support
--   - placement via product_item_warehouse (not warehouse_list directly)
--   - bin occupancy: SUM(remain_quantity) JOIN product_item_warehouse ON bin_id; compare to warehouse_list.capacity
CREATE TABLE product_item_stock (
    id                      BIGSERIAL     PRIMARY KEY,              -- surrogate PK
    product_item_id         BIGINT        NOT NULL REFERENCES product_item(id)              ON DELETE RESTRICT, -- stocked variant
    product_item_warehouse_id BIGINT      NOT NULL REFERENCES product_item_warehouse(id)   ON DELETE RESTRICT, -- item placement path
    purchase_order_item_id  BIGINT        REFERENCES purchase_order_item(id)             ON DELETE SET NULL, -- PO line that received this lot
    supplier_user_id        BIGINT        REFERENCES supplier_user(id)                   ON DELETE SET NULL, -- partner when lot not linked to PO line
    order_quantity          NUMERIC(15,4) NOT NULL DEFAULT 0,     -- ordered qty for this lot
    order_free_gift         NUMERIC(15,4) NOT NULL DEFAULT 0,     -- free-gift qty in this lot
    quantity                NUMERIC(15,4) NOT NULL DEFAULT 0,     -- total qty received in this lot
    remain_quantity         NUMERIC(15,4) NOT NULL DEFAULT 0,     -- qty still available
    cost_per_unit           NUMERIC(15,4) NOT NULL DEFAULT 0,   -- ex-VAT cost per unit for this lot
    discount_per_unit       NUMERIC(15,4) NOT NULL DEFAULT 0,   -- discount per unit at receipt
    vat_rate                NUMERIC(5,2)  NOT NULL DEFAULT 0,   -- VAT rate snapshot at receipt
    sell_price              NUMERIC(15,4) NOT NULL DEFAULT 0,   -- sell price snapshot at receipt
    is_used                 BOOLEAN       NOT NULL DEFAULT FALSE, -- TRUE = active lot for this item/placement
    received_at             TIMESTAMPTZ,                          -- when stock was received
    deleted_at              TIMESTAMPTZ,
    created_at              TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by              BIGINT        REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by              BIGINT        REFERENCES admin_user(id) ON DELETE SET NULL
);

-- only one active (is_used=TRUE) lot per item per placement
CREATE UNIQUE INDEX uq_product_item_stock_active
    ON product_item_stock (product_item_id, product_item_warehouse_id)
    WHERE is_used = TRUE AND deleted_at IS NULL;
CREATE INDEX idx_product_item_stock_item        ON product_item_stock (product_item_id)              WHERE deleted_at IS NULL;
CREATE INDEX idx_product_item_stock_placement   ON product_item_stock (product_item_warehouse_id)    WHERE deleted_at IS NULL;
CREATE INDEX idx_product_item_stock_po_item     ON product_item_stock (purchase_order_item_id) WHERE purchase_order_item_id IS NOT NULL;
CREATE INDEX idx_product_item_stock_supplier    ON product_item_stock (supplier_user_id) WHERE supplier_user_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_product_item_stock_created_by  ON product_item_stock (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_product_item_stock_updated_by  ON product_item_stock (updated_by) WHERE updated_by IS NOT NULL;
