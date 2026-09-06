-- source: v1 warehouse_warehouses + v2 v2_warehouse_warehouses (UUID→BIGSERIAL)
--   - tree: parent_id + tree_path + sort_order (LTREE + direct parent for drag-reorder)
--   - restored: code_barcode, code_qrcode, code_rfid (v2 dropped — needed for scan-in/scan-out)
--   - restored: capacity (v2 dropped); occupancy derived from product_item_stock.remain_quantity — not stored
--   - restored: warehouse_condition (separate table; child-type quotas; inactive/empty derived at query time)
--   - removed:  shelf_maximum / rack_maximum / box_maximum columns (v2's premature optimization)
--   - spelling fixed: 'shelfs' → 'shelf' in enum
--   - created_by/updated_by FK restored (v2 had columns but no FK constraint)
CREATE TYPE warehouse_type AS ENUM ('warehouse', 'zone', 'shelf', 'rack', 'bin');

CREATE TABLE warehouse_warehouse (
    id              BIGSERIAL         PRIMARY KEY,              -- surrogate PK
    type            warehouse_type    NOT NULL,                 -- node kind: warehouse, zone, shelf, rack, bin
    sku             TEXT              NOT NULL,                 -- location code
    code_barcode    VARCHAR(255),                               -- barcode identifier
    code_qrcode     VARCHAR(255),                               -- QR code identifier
    code_rfid       VARCHAR(255),                               -- RFID tag identifier
    parent_id       BIGINT            REFERENCES warehouse_warehouse(id) ON DELETE RESTRICT, -- parent node in hierarchy
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

CREATE INDEX idx_warehouse_warehouse_tree_path USING GIST ON warehouse_warehouse (tree_path);
CREATE UNIQUE INDEX uq_warehouse_warehouse_sku
    ON warehouse_warehouse (sku)
    WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_warehouse_warehouse_tree_path
    ON warehouse_warehouse (tree_path)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_warehouse_warehouse_parent_sort
    ON warehouse_warehouse (parent_id, sort_order)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_warehouse_warehouse_type_active
    ON warehouse_warehouse (type, sort_order)
    WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX idx_warehouse_warehouse_created_by ON warehouse_warehouse (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_warehouse_warehouse_updated_by ON warehouse_warehouse (updated_by) WHERE updated_by IS NOT NULL;
