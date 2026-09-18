-- +goose Up
-- +goose StatementBegin
ALTER TABLE product_item_stock
    ADD COLUMN IF NOT EXISTS vat_type setting_vat_type NOT NULL DEFAULT 'exclude';

UPDATE product_item_stock s
SET
    vat_type = COALESCE(
        (
            SELECT v.vat_type
            FROM setting_vat v
            WHERE v.deleted_at IS NULL AND v.is_active = TRUE
            ORDER BY v.id
            LIMIT 1
        ),
        'exclude'::setting_vat_type
    ),
    vat_rate = COALESCE(
        NULLIF(s.vat_rate, 0),
        (
            SELECT v.rate
            FROM setting_vat v
            WHERE v.deleted_at IS NULL AND v.is_active = TRUE
            ORDER BY v.id
            LIMIT 1
        ),
        0
    );
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE product_item_stock DROP COLUMN IF EXISTS vat_type;
-- +goose StatementEnd
