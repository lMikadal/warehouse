-- +goose Up
-- +goose StatementBegin
ALTER TABLE product_item RENAME COLUMN new_product_item_id TO old_product_item_id;
ALTER INDEX idx_product_item_new_item RENAME TO idx_product_item_old_item;

ALTER TABLE product_item ADD COLUMN is_new BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE product_item pi
SET is_new = pl.is_new
FROM product_list pl
WHERE pi.product_list_id = pl.id AND pi.deleted_at IS NULL;

ALTER TABLE product_list DROP COLUMN is_new;

CREATE INDEX idx_product_item_is_new ON product_item (is_new)
  WHERE is_new = TRUE AND deleted_at IS NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_product_item_is_new;

ALTER TABLE product_list ADD COLUMN is_new BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE product_list pl
SET is_new = EXISTS (
  SELECT 1 FROM product_item pi
  WHERE pi.product_list_id = pl.id AND pi.deleted_at IS NULL AND pi.is_new = TRUE
);

ALTER TABLE product_item DROP COLUMN is_new;

ALTER INDEX idx_product_item_old_item RENAME TO idx_product_item_new_item;
ALTER TABLE product_item RENAME COLUMN old_product_item_id TO new_product_item_id;
-- +goose StatementEnd
