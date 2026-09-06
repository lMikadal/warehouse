-- source: v1 warehouse_conditions (039_warehouse_warehouses.sql; UUID→BIGINT)
--   - per parent node × child type: quota for how many child nodes may exist
--   - amount: max child nodes of this type allowed under the parent
--   - amount_active: max active (usable) child nodes
--   - derived (not stored): inactive = amount - amount_active
--   - derived (not stored): empty slots = count child warehouse_warehouse rows of this type
--     where capacity > SUM(remain_quantity) from product_item_stock (per child id)
CREATE TABLE warehouse_condition (
    warehouse_warehouse_id  BIGINT         NOT NULL REFERENCES warehouse_warehouse(id) ON DELETE CASCADE, -- parent warehouse node
    type                    warehouse_type NOT NULL,  -- child node type this quota row applies to
    amount                  INTEGER        NOT NULL DEFAULT 0,  -- max child nodes of this type allowed
    amount_active           INTEGER        NOT NULL DEFAULT 0,  -- max active (usable) child nodes
    PRIMARY KEY (warehouse_warehouse_id, type)
);
