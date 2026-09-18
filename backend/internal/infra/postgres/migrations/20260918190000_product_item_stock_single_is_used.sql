-- +goose Up
-- +goose StatementBegin
-- One active lot (is_used) per product_item across all placements.
UPDATE product_item_stock s
SET is_used = FALSE, updated_at = NOW()
WHERE s.is_used = TRUE
  AND s.deleted_at IS NULL
  AND s.id NOT IN (
    SELECT DISTINCT ON (product_item_id) id
    FROM product_item_stock
    WHERE is_used = TRUE AND deleted_at IS NULL
    ORDER BY product_item_id, id
  );

DROP INDEX IF EXISTS uq_product_item_stock_active;

CREATE UNIQUE INDEX uq_product_item_stock_active
    ON product_item_stock (product_item_id)
    WHERE is_used = TRUE AND deleted_at IS NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS uq_product_item_stock_active;

CREATE UNIQUE INDEX uq_product_item_stock_active
    ON product_item_stock (product_item_id, product_item_warehouse_id)
    WHERE is_used = TRUE AND deleted_at IS NULL;
-- +goose StatementEnd
