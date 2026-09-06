-- source: v1 order_ticket_item_rejects (renamed)
CREATE TYPE purchase_request_item_reject_status AS ENUM ('pending', 'approved', 'cancelled');
CREATE TYPE purchase_request_item_reject_type   AS ENUM ('change', 'wait', 'stop', 'reject');

CREATE TABLE purchase_request_item_reject (
    id                          BIGSERIAL                           PRIMARY KEY,              -- surrogate PK
    purchase_request_item_id    BIGINT                              NOT NULL REFERENCES purchase_request_item(id) ON DELETE CASCADE, -- parent request line
    status                      purchase_request_item_reject_status NOT NULL DEFAULT 'pending', -- reject workflow state
    type                        purchase_request_item_reject_type   NOT NULL,                 -- change/wait/stop/reject action
    note                        TEXT                                NOT NULL DEFAULT '',      -- reject notes
    date                        TIMESTAMPTZ,                                                  -- action timestamp
    product_item_id             BIGINT                              REFERENCES product_item(id) ON DELETE SET NULL, -- replacement product when type='change'
    deleted_at                  TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ                         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMPTZ                         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  BIGINT                              REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by                  BIGINT                              REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_purchase_request_item_reject_item    ON purchase_request_item_reject (purchase_request_item_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_purchase_request_item_reject_status  ON purchase_request_item_reject (status)                   WHERE deleted_at IS NULL;
CREATE INDEX idx_purchase_request_item_reject_product ON purchase_request_item_reject (product_item_id)          WHERE product_item_id IS NOT NULL;
CREATE INDEX idx_purchase_request_item_reject_created_by ON purchase_request_item_reject (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_purchase_request_item_reject_updated_by ON purchase_request_item_reject (updated_by) WHERE updated_by IS NOT NULL;
