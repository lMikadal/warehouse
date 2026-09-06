-- source: v1 order_tickets (renamed: order_ticket → purchase_request for clarity)
--   - purchase_request = ใบขอซื้อ / internal requisition before a PO is raised
--   - image_url[] replaced by junction to website_file (see order_ticket_item_file concept)
--   - setting_sale_channel_id replaces setting_sale_platform_id (renamed)
--   - total_qty: count of non-deleted line items (maintained by application)
--   - customer snapshot → purchase_request_customer (1:1)
--   - approved_by/rejected_by/approved_at/rejected_at removed: status + purchase_history instead
CREATE TYPE purchase_request_status AS ENUM (
    'draft', 'pending', 'approved', 'received', 'completed', 'cancelled', 'rejected'
);

CREATE TABLE purchase_request (
    id                        BIGSERIAL               PRIMARY KEY,              -- surrogate PK
    sku                       VARCHAR(50)             NOT NULL,               -- request number (was ticket_number)
    status                    purchase_request_status NOT NULL DEFAULT 'draft', -- workflow state
    setting_sale_channel_id   BIGINT                  REFERENCES setting_sale_channel(id) ON DELETE SET NULL, -- sales channel
    setting_payment_method_id BIGINT                  REFERENCES setting_payment_method(id) ON DELETE SET NULL, -- preferred payment method
    total_qty                 INTEGER                 NOT NULL DEFAULT 0,       -- count of non-deleted line items
    total_deposit_old         NUMERIC(15,4)           NOT NULL DEFAULT 0,       -- deposit for existing-product lines
    total_deposit_new         NUMERIC(15,4)           NOT NULL DEFAULT 0,       -- deposit for new-product lines
    total_deposit             NUMERIC(15,4)           NOT NULL DEFAULT 0,       -- combined deposit total
    note                      TEXT                    NOT NULL DEFAULT '',      -- free-text notes
    deleted_at                TIMESTAMPTZ,
    created_at                TIMESTAMPTZ             NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                TIMESTAMPTZ             NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                BIGINT                  REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by                BIGINT                  REFERENCES admin_user(id) ON DELETE SET NULL,
    CONSTRAINT uq_purchase_request_sku UNIQUE (sku)
);

CREATE INDEX idx_purchase_request_status          ON purchase_request (status)   WHERE deleted_at IS NULL;
CREATE INDEX idx_purchase_request_channel         ON purchase_request (setting_sale_channel_id) WHERE setting_sale_channel_id IS NOT NULL;
CREATE INDEX idx_purchase_request_payment_method  ON purchase_request (setting_payment_method_id) WHERE setting_payment_method_id IS NOT NULL;
CREATE INDEX idx_purchase_request_created_by      ON purchase_request (created_by)  WHERE created_by IS NOT NULL;
CREATE INDEX idx_purchase_request_updated_by      ON purchase_request (updated_by)  WHERE updated_by IS NOT NULL;
