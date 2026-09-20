-- +goose Up
DROP TABLE IF EXISTS order_list_print_log CASCADE;
DROP TYPE IF EXISTS order_list_print_kind;

-- +goose Down
CREATE TYPE order_list_print_kind AS ENUM ('picking_slip');

CREATE TABLE order_list_print_log (
    id BIGSERIAL PRIMARY KEY,
    order_list_id BIGINT NOT NULL REFERENCES order_list(id) ON DELETE CASCADE,
    kind order_list_print_kind NOT NULL DEFAULT 'picking_slip',
    printed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    printed_by BIGINT REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_order_list_print_log_order ON order_list_print_log (order_list_id, printed_at DESC);
