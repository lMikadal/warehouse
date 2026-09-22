-- source: v1 order_purchases (renamed; v2 had no equivalent)
--   - sku: PO number (null in draft; unique when set — replaces purchase_number)
--   - sku_draft: kept from v1 purchase_number_draft; drafts are referenced by number in the PO list before approval
--   - is_waiting: kept from v1; refill flag is orthogonal to status (a refill PO passes through every status)
--   - 12 workflow *_by/*_at columns removed: status transitions tracked in purchase_history instead
--   - pricing: vat_rate + discount (Σ line item discounts) + special_discount → total_price
--   - ordered_at: PO placement timestamp (v2 order_at)
--   - receive_partial: some lines receive_approved but not all; receive flow: completed → receive_partial → receive_completed
CREATE TYPE purchase_order_status AS ENUM (
    'draft', 'pending', 'paying', 'completed', 'receive_partial', 'receive_completed', 'rejected', 'cancelled'
);

CREATE TABLE purchase_order (
    id                  BIGSERIAL             PRIMARY KEY,              -- surrogate PK
    sku                 VARCHAR(50),          -- null until leaving draft
    sku_draft           VARCHAR(50),          -- draft PO number, assigned on create and kept after promotion
    is_waiting          BOOLEAN               NOT NULL DEFAULT FALSE, -- refill PO raised from a stock shortfall
    purchase_request_id BIGINT                REFERENCES purchase_request(id) ON DELETE SET NULL, -- source requisition
    supplier_user_id     BIGINT               REFERENCES supplier_user(id) ON DELETE SET NULL, -- supplier
    status              purchase_order_status NOT NULL DEFAULT 'draft', -- PO workflow state
    ordered_at          TIMESTAMPTZ           NOT NULL DEFAULT CURRENT_TIMESTAMP, -- PO placement timestamp
    vat_type            setting_vat_type      NOT NULL DEFAULT 'exclude', -- snapshot VAT treatment (see setting_vat)
    vat_rate            NUMERIC(5,2)          NOT NULL DEFAULT 0,       -- VAT rate snapshot
    discount            NUMERIC(15,4)         NOT NULL DEFAULT 0,       -- Σ line discounts (from purchase_order_item; maintained by app)
    special_discount    NUMERIC(15,4)         NOT NULL DEFAULT 0,       -- additional header discount
    total_price         NUMERIC(15,4)         NOT NULL DEFAULT 0,       -- final PO total
    note                TEXT                  NOT NULL DEFAULT '',      -- free-text notes
    deleted_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by          BIGINT                REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by          BIGINT                REFERENCES admin_user(id) ON DELETE SET NULL,
    CONSTRAINT uq_purchase_order_sku UNIQUE (sku),
    CONSTRAINT uq_purchase_order_sku_draft UNIQUE (sku_draft)
);

CREATE INDEX idx_purchase_order_status           ON purchase_order (status)              WHERE deleted_at IS NULL;
CREATE INDEX idx_purchase_order_request          ON purchase_order (purchase_request_id) WHERE purchase_request_id IS NOT NULL;
CREATE INDEX idx_purchase_order_supplier         ON purchase_order (supplier_user_id) WHERE supplier_user_id IS NOT NULL;
CREATE INDEX idx_purchase_order_created_by       ON purchase_order (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_purchase_order_updated_by       ON purchase_order (updated_by) WHERE updated_by IS NOT NULL;
