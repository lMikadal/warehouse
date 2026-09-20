-- Quotation attachments (max 5 enforced in API). purpose on system_file: order_quotation_attachment
CREATE TABLE order_quotation_file (
    id                 BIGSERIAL    PRIMARY KEY,
    order_quotation_id BIGINT       NOT NULL REFERENCES order_quotation(id) ON DELETE CASCADE,
    system_file_id     BIGINT       NOT NULL REFERENCES system_file(id) ON DELETE RESTRICT,
    sort_order         INTEGER      NOT NULL DEFAULT 0,
    deleted_at         TIMESTAMPTZ,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by         BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by         BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_order_quotation_file_quote_file
    ON order_quotation_file (order_quotation_id, system_file_id)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_order_quotation_file_quote_sort
    ON order_quotation_file (order_quotation_id, sort_order)
    WHERE deleted_at IS NULL;
