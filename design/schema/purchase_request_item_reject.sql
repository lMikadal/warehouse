-- source: v1 order_ticket_item_rejects (renamed)
-- check:skip-audit (append-only; no updated_at/deleted_at by design)
CREATE TYPE purchase_request_item_reject_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE purchase_request_item_reject_type   AS ENUM ('change', 'wait', 'stop', 'cancel');

CREATE TABLE purchase_request_item_reject (
    id                          BIGSERIAL                           PRIMARY KEY,              -- surrogate PK
    purchase_request_item_id    BIGINT                              NOT NULL REFERENCES purchase_request_item(id) ON DELETE CASCADE, -- parent request line
    status                      purchase_request_item_reject_status NOT NULL DEFAULT 'pending', -- reject workflow state
    type                        purchase_request_item_reject_type   NOT NULL,                 -- change/wait/stop/cancel action
    note                        TEXT                                NOT NULL DEFAULT '',      -- reject reason or notes
    date                        TIMESTAMPTZ,                                                  -- reject or follow-up date
    product_item_id             BIGINT                              REFERENCES product_item(id) ON DELETE SET NULL, -- substitute product when applicable
    created_at                  TIMESTAMPTZ                         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  BIGINT                              REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_at                  TIMESTAMPTZ                         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by                  BIGINT                              REFERENCES admin_user(id) ON DELETE SET NULL,
    deleted_at                  TIMESTAMPTZ
);

CREATE INDEX idx_purchase_request_item_reject_item   ON purchase_request_item_reject (purchase_request_item_id);
CREATE INDEX idx_purchase_request_item_reject_status ON purchase_request_item_reject (status);
CREATE INDEX idx_purchase_request_item_reject_product ON purchase_request_item_reject (product_item_id) WHERE product_item_id IS NOT NULL;
