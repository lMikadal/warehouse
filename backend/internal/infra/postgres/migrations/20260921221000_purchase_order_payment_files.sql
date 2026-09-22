-- +goose Up
-- +goose StatementBegin
-- source: design/schema/purchase_order_payment.sql, purchase_order_file.sql,
--         purchase_order_item_file.sql, purchase_order.sql (sku_draft, is_waiting)

-- v1 order_purchases kept a draft document number and a refill flag; both are surfaced in the PO list.
ALTER TABLE purchase_order
    ADD COLUMN sku_draft  VARCHAR(50),
    ADD COLUMN is_waiting BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE purchase_order
    ADD CONSTRAINT uq_purchase_order_sku_draft UNIQUE (sku_draft);

CREATE INDEX idx_purchase_order_is_waiting ON purchase_order (is_waiting) WHERE is_waiting;

CREATE TABLE purchase_order_payment (
    id                        BIGSERIAL     PRIMARY KEY,
    purchase_order_id         BIGINT        NOT NULL REFERENCES purchase_order(id) ON DELETE CASCADE,
    setting_payment_method_id BIGINT        NOT NULL REFERENCES setting_payment_method(id) ON DELETE RESTRICT,
    supplier_bank_id          BIGINT        REFERENCES supplier_bank(id) ON DELETE SET NULL,
    vat_rate                  NUMERIC(5,2)  NOT NULL DEFAULT 0,
    discount                  NUMERIC(15,4) NOT NULL DEFAULT 0,
    total_price               NUMERIC(15,4) NOT NULL DEFAULT 0,
    note                      TEXT          NOT NULL DEFAULT '',
    system_file_id            BIGINT        REFERENCES system_file(id) ON DELETE RESTRICT,
    credit_term               INTEGER,
    paid_at                   TIMESTAMPTZ,
    deleted_at                TIMESTAMPTZ,
    created_at                TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                BIGINT        REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by                BIGINT        REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_purchase_order_payment_order      ON purchase_order_payment (purchase_order_id);
CREATE INDEX idx_purchase_order_payment_method     ON purchase_order_payment (setting_payment_method_id);
CREATE INDEX idx_purchase_order_payment_bank       ON purchase_order_payment (supplier_bank_id) WHERE supplier_bank_id IS NOT NULL;
CREATE INDEX idx_purchase_order_payment_file       ON purchase_order_payment (system_file_id) WHERE system_file_id IS NOT NULL;
CREATE INDEX idx_purchase_order_payment_created_by ON purchase_order_payment (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_purchase_order_payment_updated_by ON purchase_order_payment (updated_by) WHERE updated_by IS NOT NULL;

CREATE TABLE purchase_order_file (
    id                BIGSERIAL   PRIMARY KEY,
    purchase_order_id BIGINT      NOT NULL REFERENCES purchase_order(id) ON DELETE CASCADE,
    system_file_id    BIGINT      NOT NULL REFERENCES system_file(id) ON DELETE RESTRICT,
    sort_order        INTEGER     NOT NULL DEFAULT 0,
    deleted_at        TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by        BIGINT      REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by        BIGINT      REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_purchase_order_file_order_file
    ON purchase_order_file (purchase_order_id, system_file_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_purchase_order_file_order_sort
    ON purchase_order_file (purchase_order_id, sort_order) WHERE deleted_at IS NULL;
CREATE INDEX idx_purchase_order_file_file       ON purchase_order_file (system_file_id);
CREATE INDEX idx_purchase_order_file_created_by ON purchase_order_file (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_purchase_order_file_updated_by ON purchase_order_file (updated_by) WHERE updated_by IS NOT NULL;

CREATE TABLE purchase_order_item_file (
    id                     BIGSERIAL   PRIMARY KEY,
    purchase_order_item_id BIGINT      NOT NULL REFERENCES purchase_order_item(id) ON DELETE CASCADE,
    system_file_id         BIGINT      NOT NULL REFERENCES system_file(id) ON DELETE RESTRICT,
    sort_order             INTEGER     NOT NULL DEFAULT 0,
    deleted_at             TIMESTAMPTZ,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by             BIGINT      REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by             BIGINT      REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_purchase_order_item_file_item_file
    ON purchase_order_item_file (purchase_order_item_id, system_file_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_purchase_order_item_file_item_sort
    ON purchase_order_item_file (purchase_order_item_id, sort_order) WHERE deleted_at IS NULL;
CREATE INDEX idx_purchase_order_item_file_file       ON purchase_order_item_file (system_file_id);
CREATE INDEX idx_purchase_order_item_file_created_by ON purchase_order_item_file (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_purchase_order_item_file_updated_by ON purchase_order_item_file (updated_by) WHERE updated_by IS NOT NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS purchase_order_item_file CASCADE;
DROP TABLE IF EXISTS purchase_order_file CASCADE;
DROP TABLE IF EXISTS purchase_order_payment CASCADE;

DROP INDEX IF EXISTS idx_purchase_order_is_waiting;
ALTER TABLE purchase_order DROP CONSTRAINT IF EXISTS uq_purchase_order_sku_draft;
ALTER TABLE purchase_order
    DROP COLUMN IF EXISTS is_waiting,
    DROP COLUMN IF EXISTS sku_draft;
-- +goose StatementEnd
