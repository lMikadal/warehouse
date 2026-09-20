-- +goose Up
ALTER TYPE order_list_item_status ADD VALUE 'cancelled';
ALTER TYPE order_list_item_status ADD VALUE 'rejected';

-- +goose Down
-- Postgres cannot remove enum values; no-op.
