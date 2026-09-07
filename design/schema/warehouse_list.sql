-- source: v1 warehouse_warehouses + v2 v2_warehouse_warehouses (UUID→BIGSERIAL)
--   - tree: parent_id + tree_path + sort_order (LTREE + direct parent for drag-reorder)
--   - restored: barcode, qrcode, rfid (v2 dropped — needed for scan-in/scan-out)
--   - restored: capacity (v2 dropped); occupancy derived via product_item_warehouse.bin_id + product_item_stock — not stored
--   - restored: warehouse_condition (separate table; child-type quotas; inactive/empty derived at query time)
--   - removed:  shelf_maximum / rack_maximum / box_maximum columns (v2's premature optimization)
--   - spelling fixed: 'shelfs' → 'shelf' in enum
--   - created_by/updated_by FK restored (v2 had columns but no FK constraint)
CREATE TYPE warehouse_list_type AS ENUM ('warehouse', 'zone', 'shelf', 'rack', 'bin');

CREATE TABLE warehouse_list (
    id              BIGSERIAL              PRIMARY KEY,              -- surrogate PK
    type            warehouse_list_type NOT NULL,                 -- node kind: warehouse, zone, shelf, rack, bin
    sku             TEXT              NOT NULL,                 -- location code
    barcode         VARCHAR(255),                               -- barcode identifier
    qrcode          VARCHAR(255),                               -- QR code identifier
    rfid            VARCHAR(255),                               -- RFID tag identifier
    parent_id       BIGINT            REFERENCES warehouse_list(id) ON DELETE RESTRICT, -- parent node in hierarchy
    tree_path       LTREE             NOT NULL,                 -- LTREE path for subtree queries
    sort_order      INTEGER           NOT NULL DEFAULT 0,       -- sibling display order
    capacity        INTEGER           NOT NULL DEFAULT 0,       -- max storage units
    is_active       BOOLEAN           NOT NULL DEFAULT TRUE,    -- whether location is usable
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by      BIGINT            REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by      BIGINT            REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_warehouse_list_tree_path USING GIST ON warehouse_list (tree_path);
CREATE UNIQUE INDEX uq_warehouse_list_sku
    ON warehouse_list (sku)
    WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_warehouse_list_tree_path
    ON warehouse_list (tree_path)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_warehouse_list_parent_sort
    ON warehouse_list (parent_id, sort_order)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_warehouse_list_type_active
    ON warehouse_list (type, sort_order)
    WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX idx_warehouse_list_created_by ON warehouse_list (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_warehouse_list_updated_by ON warehouse_list (updated_by) WHERE updated_by IS NOT NULL;
