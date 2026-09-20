-- +goose Up
ALTER TABLE order_shipping RENAME TO order_list_shipping;

-- +goose Down
ALTER TABLE order_list_shipping RENAME TO order_shipping;
