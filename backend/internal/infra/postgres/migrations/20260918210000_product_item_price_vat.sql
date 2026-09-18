-- +goose Up
ALTER TABLE product_item_price
    ADD COLUMN vat_type setting_vat_type NOT NULL DEFAULT 'exclude',
    ADD COLUMN price_vat NUMERIC(15,4) NOT NULL DEFAULT 0;

UPDATE product_item_price
SET price_vat = ROUND(price * (1 + vat_rate / 100), 4)
WHERE price_vat = 0;

UPDATE product_item_price pip
SET vat_type = sv.vat_type
FROM (
    SELECT vat_type FROM setting_vat WHERE deleted_at IS NULL ORDER BY id ASC LIMIT 1
) sv
WHERE pip.vat_type = 'exclude';

-- +goose Down
ALTER TABLE product_item_price
    DROP COLUMN IF EXISTS price_vat,
    DROP COLUMN IF EXISTS vat_type;
