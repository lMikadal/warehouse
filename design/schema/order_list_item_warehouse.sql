-- source: pick-location breakdown for order_list_item (checked qty per warehouse_list node)
--   - one row per pick location per order line
--   - amount_checked only; order_list_item.amount_checked = SUM(amount_checked) maintained by app
CREATE TABLE order_list_item_warehouse (
    id                      BIGSERIAL            PRIMARY KEY,              -- surrogate PK
    order_list_item_id      BIGINT               NOT NULL REFERENCES order_list_item(id) ON DELETE CASCADE, -- parent order line
    warehouse_list_id       BIGINT               NOT NULL REFERENCES warehouse_list(id) ON DELETE RESTRICT, -- pick location (warehouse/zone/shelf/rack/bin)
    amount_checked          NUMERIC(15,4)        NOT NULL DEFAULT 0,       -- verified qty from this location
    deleted_at              TIMESTAMPTZ,
    created_at              TIMESTAMPTZ          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMPTZ          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by              BIGINT               REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by              BIGINT               REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_order_list_item_warehouse_item_location
    ON order_list_item_warehouse (order_list_item_id, warehouse_list_id)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_order_list_item_warehouse_item ON order_list_item_warehouse (order_list_item_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_order_list_item_warehouse_list ON order_list_item_warehouse (warehouse_list_id)  WHERE deleted_at IS NULL;
CREATE INDEX idx_order_list_item_warehouse_created_by ON order_list_item_warehouse (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_order_list_item_warehouse_updated_by ON order_list_item_warehouse (updated_by) WHERE updated_by IS NOT NULL;
