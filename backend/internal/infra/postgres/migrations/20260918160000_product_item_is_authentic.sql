-- +goose Up
ALTER TABLE product_item ADD COLUMN is_authentic BOOLEAN NOT NULL DEFAULT TRUE;
UPDATE product_item SET is_authentic = NOT is_fake;
ALTER TABLE product_item ALTER COLUMN is_authentic DROP DEFAULT;
ALTER TABLE product_item DROP COLUMN is_fake;

-- +goose Down
ALTER TABLE product_item ADD COLUMN is_fake BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE product_item SET is_fake = NOT is_authentic;
ALTER TABLE product_item ALTER COLUMN is_fake DROP DEFAULT;
ALTER TABLE product_item DROP COLUMN is_authentic;
