-- +goose Up
-- +goose StatementBegin
-- source: design/schema/purchase_order_item.sql (old_qty, old_unit)
-- v1 order_purchase_items.old_qty/old_unit: a split line records how much it took off its parent
-- and in which unit, so revert-convert-unit can restore the parent exactly.

ALTER TABLE purchase_order_item
    ADD COLUMN old_qty  INTEGER,
    ADD COLUMN old_unit product_unit;

ALTER TABLE purchase_order_item
    ADD CONSTRAINT chk_purchase_order_item_old_qty CHECK (old_qty IS NULL OR old_qty >= 1),
    ADD CONSTRAINT chk_purchase_order_item_split
        CHECK ((parent_id IS NULL) OR (old_qty IS NOT NULL AND old_unit IS NOT NULL));
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE purchase_order_item
    DROP CONSTRAINT IF EXISTS chk_purchase_order_item_split,
    DROP CONSTRAINT IF EXISTS chk_purchase_order_item_old_qty;

ALTER TABLE purchase_order_item
    DROP COLUMN IF EXISTS old_unit,
    DROP COLUMN IF EXISTS old_qty;
-- +goose StatementEnd
