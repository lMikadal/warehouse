-- +goose Up
ALTER TABLE order_list
    ADD COLUMN vat_type setting_vat_type NOT NULL DEFAULT 'exclude',
    ADD COLUMN vat_rate NUMERIC(5,2) NOT NULL DEFAULT 0;

ALTER TABLE order_list_item
    ADD COLUMN vat_type setting_vat_type NOT NULL DEFAULT 'exclude',
    ADD COLUMN vat_rate NUMERIC(5,2) NOT NULL DEFAULT 0;

-- +goose Down
ALTER TABLE order_list_item
    DROP COLUMN IF EXISTS vat_rate,
    DROP COLUMN IF EXISTS vat_type;

ALTER TABLE order_list
    DROP COLUMN IF EXISTS vat_rate,
    DROP COLUMN IF EXISTS vat_type;
