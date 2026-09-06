-- source: v1 product_item_stop_log (v2 had no equivalent — gap restored)
-- check:skip-audit (append-only event log; no update/delete semantics)
CREATE TABLE product_item_stop_log (
    id               BIGSERIAL    PRIMARY KEY,              -- surrogate PK
    product_item_id  BIGINT       NOT NULL REFERENCES product_item(id) ON DELETE CASCADE, -- affected item
    is_stopped       BOOLEAN      NOT NULL,   -- TRUE = stopped, FALSE = resumed
    note             TEXT,                                  -- optional reason or note
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by       BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL -- admin who toggled stop
);

CREATE INDEX idx_product_item_stop_log_item ON product_item_stop_log (product_item_id, created_at DESC);
