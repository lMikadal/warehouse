-- +goose Up
-- +goose StatementBegin
-- source: design/schema/purchase_claim.sql, purchase_claim_item.sql
-- claim_type and claim_item_status already exist (20260314100000_admin_rbac_wave.sql).

CREATE TYPE purchase_claim_status AS ENUM ('draft', 'success', 'cancelled');

CREATE TABLE purchase_claim (
    id                BIGSERIAL             PRIMARY KEY,
    sku               VARCHAR(50),
    purchase_order_id BIGINT                NOT NULL REFERENCES purchase_order(id) ON DELETE RESTRICT,
    type              claim_type            NOT NULL,
    status            purchase_claim_status NOT NULL DEFAULT 'draft',
    note              TEXT                  NOT NULL DEFAULT '',
    deleted_at        TIMESTAMPTZ,
    created_at        TIMESTAMPTZ           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by        BIGINT                REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by        BIGINT                REFERENCES admin_user(id) ON DELETE SET NULL,
    CONSTRAINT uq_purchase_claim_sku UNIQUE (sku)
);

CREATE INDEX idx_purchase_claim_order      ON purchase_claim (purchase_order_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_purchase_claim_status     ON purchase_claim (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_purchase_claim_created_by ON purchase_claim (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_purchase_claim_updated_by ON purchase_claim (updated_by) WHERE updated_by IS NOT NULL;

CREATE TABLE purchase_claim_item (
    id                            BIGSERIAL         PRIMARY KEY,
    purchase_claim_id             BIGINT            NOT NULL REFERENCES purchase_claim(id) ON DELETE CASCADE,
    purchase_order_item_reject_id BIGINT            NOT NULL REFERENCES purchase_order_item_reject(id) ON DELETE RESTRICT,
    amount                        NUMERIC(15,4)     NOT NULL DEFAULT 0,
    status                        claim_item_status,
    note                          TEXT              NOT NULL DEFAULT '',
    deleted_at                    TIMESTAMPTZ,
    created_at                    TIMESTAMPTZ       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                    TIMESTAMPTZ       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                    BIGINT            REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by                    BIGINT            REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_purchase_claim_item_claim_reject
    ON purchase_claim_item (purchase_claim_id, purchase_order_item_reject_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_purchase_claim_item_claim      ON purchase_claim_item (purchase_claim_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_purchase_claim_item_reject     ON purchase_claim_item (purchase_order_item_reject_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_purchase_claim_item_created_by ON purchase_claim_item (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_purchase_claim_item_updated_by ON purchase_claim_item (updated_by) WHERE updated_by IS NOT NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS purchase_claim_item CASCADE;
DROP TABLE IF EXISTS purchase_claim CASCADE;
DROP TYPE IF EXISTS purchase_claim_status;
-- +goose StatementEnd
