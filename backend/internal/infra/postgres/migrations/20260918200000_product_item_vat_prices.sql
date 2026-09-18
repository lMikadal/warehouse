-- +goose Up
ALTER TABLE product_item
    ADD COLUMN IF NOT EXISTS price_vat NUMERIC(15,4) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS price_wholesale_vat NUMERIC(15,4) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS vat_type setting_vat_type NOT NULL DEFAULT 'exclude';

UPDATE product_item pi
SET
    vat_type = COALESCE(
        (
            SELECT v.vat_type
            FROM setting_vat v
            WHERE v.deleted_at IS NULL AND v.is_active = TRUE
            ORDER BY v.id ASC
            LIMIT 1
        ),
        'exclude'::setting_vat_type
    ),
    price_vat = pi.price * (1 + pi.vat_rate / 100),
    price_wholesale_vat = pi.price_wholesale * (1 + pi.vat_rate / 100);

-- +goose Down
ALTER TABLE product_item
    DROP COLUMN IF EXISTS price_vat,
    DROP COLUMN IF EXISTS price_wholesale_vat,
    DROP COLUMN IF EXISTS vat_type;
