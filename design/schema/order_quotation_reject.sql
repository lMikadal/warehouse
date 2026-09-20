-- Return-for-edit audit when superadmin sends a quotation back to draft.
CREATE TABLE order_quotation_reject (
    id                  BIGSERIAL                    PRIMARY KEY,
    order_quotation_id  BIGINT                       NOT NULL REFERENCES order_quotation(id) ON DELETE CASCADE,
    note                TEXT                         NOT NULL,
    status              order_quotation_status       NOT NULL,
    next_status         order_quotation_status       NOT NULL,
    created_by          BIGINT                       REFERENCES admin_user(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ                  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_quotation_reject_quote ON order_quotation_reject (order_quotation_id);
