-- +goose Up
-- +goose StatementBegin
-- source: design/schema/purchase_order_item_reject.sql, purchase_order_item_reject_file.sql
-- v1 order_purchase_item_rejects: type_reject → resolution, status 'process' → 'in_progress',
-- note_type_reject → note_resolution, price_vat → vat_rate, image_url[] → *_file junction.

CREATE TYPE purchase_order_item_reject_type         AS ENUM ('overage', 'shortage', 'damaged', 'wrong', 'other');
CREATE TYPE purchase_order_item_reject_overage_type AS ENUM ('receive', 'return');
CREATE TYPE purchase_order_item_reject_resolution   AS ENUM ('claim', 'return', 'accept_loss');
CREATE TYPE purchase_order_item_reject_status       AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

CREATE TABLE purchase_order_item_reject (
    id                       BIGSERIAL                               PRIMARY KEY,
    purchase_order_id        BIGINT                                  REFERENCES purchase_order(id) ON DELETE SET NULL,
    purchase_order_item_id   BIGINT                                  NOT NULL REFERENCES purchase_order_item(id) ON DELETE CASCADE,
    purchase_request_item_id BIGINT                                  REFERENCES purchase_request_item(id) ON DELETE SET NULL,
    sku                      VARCHAR(50)                             NOT NULL,
    type                     purchase_order_item_reject_type         NOT NULL,
    overage_type             purchase_order_item_reject_overage_type,
    resolution               purchase_order_item_reject_resolution   NOT NULL DEFAULT 'claim',
    status                   purchase_order_item_reject_status       NOT NULL DEFAULT 'pending',
    qty                      INTEGER                                 NOT NULL,
    unit                     product_unit                            NOT NULL DEFAULT 'piece',
    price                    NUMERIC(15,4)                           NOT NULL DEFAULT 0,
    vat_rate                 NUMERIC(5,2)                            NOT NULL DEFAULT 0,
    note                     TEXT                                    NOT NULL DEFAULT '',
    note_resolution          TEXT                                    NOT NULL DEFAULT '',
    note_process             TEXT                                    NOT NULL DEFAULT '',
    created_at               TIMESTAMPTZ                             NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by               BIGINT                                  REFERENCES admin_user(id) ON DELETE SET NULL,
    CONSTRAINT uq_purchase_order_item_reject_sku UNIQUE (sku),
    CONSTRAINT chk_purchase_order_item_reject_qty CHECK (qty >= 0),
    CONSTRAINT chk_purchase_order_item_reject_overage
        CHECK ((type = 'overage') = (overage_type IS NOT NULL))
);

CREATE INDEX idx_purchase_order_item_reject_item       ON purchase_order_item_reject (purchase_order_item_id);
CREATE INDEX idx_purchase_order_item_reject_order      ON purchase_order_item_reject (purchase_order_id) WHERE purchase_order_id IS NOT NULL;
CREATE INDEX idx_purchase_order_item_reject_request    ON purchase_order_item_reject (purchase_request_item_id) WHERE purchase_request_item_id IS NOT NULL;
CREATE INDEX idx_purchase_order_item_reject_status     ON purchase_order_item_reject (status);
CREATE INDEX idx_purchase_order_item_reject_resolution ON purchase_order_item_reject (resolution);
CREATE INDEX idx_purchase_order_item_reject_created_at ON purchase_order_item_reject (created_at DESC);
CREATE INDEX idx_purchase_order_item_reject_created_by ON purchase_order_item_reject (created_by) WHERE created_by IS NOT NULL;

CREATE TABLE purchase_order_item_reject_file (
    id                            BIGSERIAL   PRIMARY KEY,
    purchase_order_item_reject_id BIGINT      NOT NULL REFERENCES purchase_order_item_reject(id) ON DELETE CASCADE,
    system_file_id                BIGINT      NOT NULL REFERENCES system_file(id) ON DELETE RESTRICT,
    sort_order                    INTEGER     NOT NULL DEFAULT 0,
    deleted_at                    TIMESTAMPTZ,
    created_at                    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                    BIGINT      REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by                    BIGINT      REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_purchase_order_item_reject_file_reject_file
    ON purchase_order_item_reject_file (purchase_order_item_reject_id, system_file_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_purchase_order_item_reject_file_reject_sort
    ON purchase_order_item_reject_file (purchase_order_item_reject_id, sort_order) WHERE deleted_at IS NULL;
CREATE INDEX idx_purchase_order_item_reject_file_file       ON purchase_order_item_reject_file (system_file_id);
CREATE INDEX idx_purchase_order_item_reject_file_created_by ON purchase_order_item_reject_file (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_purchase_order_item_reject_file_updated_by ON purchase_order_item_reject_file (updated_by) WHERE updated_by IS NOT NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS purchase_order_item_reject_file CASCADE;
DROP TABLE IF EXISTS purchase_order_item_reject CASCADE;

DROP TYPE IF EXISTS purchase_order_item_reject_status;
DROP TYPE IF EXISTS purchase_order_item_reject_resolution;
DROP TYPE IF EXISTS purchase_order_item_reject_overage_type;
DROP TYPE IF EXISTS purchase_order_item_reject_type;
-- +goose StatementEnd
