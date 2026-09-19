-- +goose Up
ALTER TABLE product_item
    ADD COLUMN IF NOT EXISTS amount_price_wholesale INTEGER NOT NULL DEFAULT 0;

-- +goose Down
ALTER TABLE product_item
    DROP COLUMN IF EXISTS amount_price_wholesale;
