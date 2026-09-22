-- +goose Up
-- +goose StatementBegin
-- source: design/schema/purchase_request.sql, purchase_request_item.sql,
--         purchase_request_customer.sql, purchase_request_item_file.sql,
--         purchase_request_item_reject.sql
-- purchase_request_item_type already exists (20260918180000_purchase_order_module.sql).

CREATE TYPE purchase_request_status AS ENUM (
    'draft', 'pending', 'approved', 'received', 'completed', 'cancelled', 'rejected'
);

CREATE TYPE purchase_request_item_reject_status AS ENUM ('pending', 'approved', 'cancelled');
CREATE TYPE purchase_request_item_reject_type   AS ENUM ('change', 'wait', 'stop', 'reject');

CREATE TABLE purchase_request (
    id                        BIGSERIAL               PRIMARY KEY,
    sku                       VARCHAR(50)             NOT NULL,
    status                    purchase_request_status NOT NULL DEFAULT 'draft',
    setting_sale_channel_id   BIGINT                  REFERENCES setting_sale_channel(id) ON DELETE SET NULL,
    setting_payment_method_id BIGINT                  REFERENCES setting_payment_method(id) ON DELETE SET NULL,
    total_qty                 INTEGER                 NOT NULL DEFAULT 0,
    total_deposit_old         NUMERIC(15,4)           NOT NULL DEFAULT 0,
    total_deposit_new         NUMERIC(15,4)           NOT NULL DEFAULT 0,
    total_deposit             NUMERIC(15,4)           NOT NULL DEFAULT 0,
    note                      TEXT                    NOT NULL DEFAULT '',
    deleted_at                TIMESTAMPTZ,
    created_at                TIMESTAMPTZ             NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                TIMESTAMPTZ             NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                BIGINT                  REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by                BIGINT                  REFERENCES admin_user(id) ON DELETE SET NULL,
    CONSTRAINT uq_purchase_request_sku UNIQUE (sku)
);

CREATE INDEX idx_purchase_request_status         ON purchase_request (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_purchase_request_channel        ON purchase_request (setting_sale_channel_id) WHERE setting_sale_channel_id IS NOT NULL;
CREATE INDEX idx_purchase_request_payment_method ON purchase_request (setting_payment_method_id) WHERE setting_payment_method_id IS NOT NULL;
CREATE INDEX idx_purchase_request_created_at     ON purchase_request (created_at DESC);
CREATE INDEX idx_purchase_request_created_by     ON purchase_request (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_purchase_request_updated_by     ON purchase_request (updated_by) WHERE updated_by IS NOT NULL;

CREATE TABLE purchase_request_customer (
    purchase_request_id BIGINT       NOT NULL REFERENCES purchase_request(id) ON DELETE CASCADE,
    member_user_id      BIGINT       REFERENCES member_user(id) ON DELETE SET NULL,
    sku                 VARCHAR(255) NOT NULL DEFAULT '',
    name                VARCHAR(255) NOT NULL DEFAULT '',
    tel                 VARCHAR(100) NOT NULL DEFAULT '',
    email               VARCHAR(255) NOT NULL DEFAULT '',
    date_receive        TIMESTAMPTZ,
    PRIMARY KEY (purchase_request_id)
);

CREATE INDEX idx_purchase_request_customer_user ON purchase_request_customer (member_user_id) WHERE member_user_id IS NOT NULL;

CREATE TABLE purchase_request_item (
    id                          BIGSERIAL                  PRIMARY KEY,
    purchase_request_id         BIGINT                     NOT NULL REFERENCES purchase_request(id) ON DELETE CASCADE,
    status                      purchase_request_status    NOT NULL DEFAULT 'pending',
    type                        purchase_request_item_type NOT NULL,
    product_item_id             BIGINT                     REFERENCES product_item(id) ON DELETE SET NULL,
    name                        VARCHAR(255),
    product_attribute_brand_id  BIGINT                     REFERENCES product_attribute(id) ON DELETE SET NULL,
    product_attribute_model_id  BIGINT                     REFERENCES product_attribute(id) ON DELETE SET NULL,
    product_attribute_engine_id BIGINT                     REFERENCES product_attribute(id) ON DELETE SET NULL,
    identification_number       VARCHAR(255)               NOT NULL DEFAULT '',
    qty_sell                    INTEGER                    NOT NULL DEFAULT 1,
    qty_reorder                 INTEGER                    NOT NULL DEFAULT 0,
    deposit                     NUMERIC(15,4)              NOT NULL DEFAULT 0,
    unit                        product_unit               NOT NULL DEFAULT 'piece',
    note                        TEXT                       NOT NULL DEFAULT '',
    deleted_at                  TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ                NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMPTZ                NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  BIGINT                     REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by                  BIGINT                     REFERENCES admin_user(id) ON DELETE SET NULL,
    CONSTRAINT chk_purchase_request_item_catalog CHECK (type <> 'catalog' OR product_item_id IS NOT NULL),
    CONSTRAINT chk_purchase_request_item_custom  CHECK (type <> 'custom'  OR (name IS NOT NULL AND length(btrim(name)) > 0))
);

CREATE INDEX idx_purchase_request_item_request    ON purchase_request_item (purchase_request_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_purchase_request_item_status     ON purchase_request_item (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_purchase_request_item_product    ON purchase_request_item (product_item_id) WHERE product_item_id IS NOT NULL;
CREATE INDEX idx_purchase_request_item_engine     ON purchase_request_item (product_attribute_engine_id) WHERE product_attribute_engine_id IS NOT NULL;
CREATE INDEX idx_purchase_request_item_created_by ON purchase_request_item (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_purchase_request_item_updated_by ON purchase_request_item (updated_by) WHERE updated_by IS NOT NULL;

CREATE TABLE purchase_request_item_file (
    id                       BIGSERIAL   PRIMARY KEY,
    purchase_request_item_id BIGINT      NOT NULL REFERENCES purchase_request_item(id) ON DELETE CASCADE,
    system_file_id           BIGINT      NOT NULL REFERENCES system_file(id) ON DELETE RESTRICT,
    sort_order               INTEGER     NOT NULL DEFAULT 0,
    deleted_at               TIMESTAMPTZ,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by               BIGINT      REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by               BIGINT      REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_purchase_request_item_file_item_file
    ON purchase_request_item_file (purchase_request_item_id, system_file_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_purchase_request_item_file_item_sort
    ON purchase_request_item_file (purchase_request_item_id, sort_order) WHERE deleted_at IS NULL;
CREATE INDEX idx_purchase_request_item_file_file       ON purchase_request_item_file (system_file_id);
CREATE INDEX idx_purchase_request_item_file_created_by ON purchase_request_item_file (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_purchase_request_item_file_updated_by ON purchase_request_item_file (updated_by) WHERE updated_by IS NOT NULL;

CREATE TABLE purchase_request_item_reject (
    id                       BIGSERIAL                           PRIMARY KEY,
    purchase_request_item_id BIGINT                              NOT NULL REFERENCES purchase_request_item(id) ON DELETE CASCADE,
    status                   purchase_request_item_reject_status  NOT NULL DEFAULT 'pending',
    type                     purchase_request_item_reject_type    NOT NULL,
    note                     TEXT                                NOT NULL DEFAULT '',
    date                     TIMESTAMPTZ,
    product_item_id          BIGINT                              REFERENCES product_item(id) ON DELETE SET NULL,
    deleted_at               TIMESTAMPTZ,
    created_at               TIMESTAMPTZ                         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at               TIMESTAMPTZ                         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by               BIGINT                              REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by               BIGINT                              REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_purchase_request_item_reject_item       ON purchase_request_item_reject (purchase_request_item_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_purchase_request_item_reject_status     ON purchase_request_item_reject (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_purchase_request_item_reject_product    ON purchase_request_item_reject (product_item_id) WHERE product_item_id IS NOT NULL;
CREATE INDEX idx_purchase_request_item_reject_created_by ON purchase_request_item_reject (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_purchase_request_item_reject_updated_by ON purchase_request_item_reject (updated_by) WHERE updated_by IS NOT NULL;

-- Close the FKs left dangling by 20260918180000_purchase_order_module.sql.
ALTER TABLE purchase_order
    ADD CONSTRAINT fk_purchase_order_request
    FOREIGN KEY (purchase_request_id) REFERENCES purchase_request(id) ON DELETE SET NULL;

ALTER TABLE purchase_order_item
    ADD CONSTRAINT fk_purchase_order_item_request_item
    FOREIGN KEY (purchase_request_item_id) REFERENCES purchase_request_item(id) ON DELETE SET NULL;

-- Line type guards carried over from v1 order_purchase_items.
ALTER TABLE purchase_order_item
    ADD CONSTRAINT chk_purchase_order_item_catalog CHECK (type <> 'catalog' OR product_item_id IS NOT NULL),
    ADD CONSTRAINT chk_purchase_order_item_custom  CHECK (type <> 'custom'  OR (name IS NOT NULL AND length(btrim(name)) > 0));
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE purchase_order_item DROP CONSTRAINT IF EXISTS chk_purchase_order_item_custom;
ALTER TABLE purchase_order_item DROP CONSTRAINT IF EXISTS chk_purchase_order_item_catalog;
ALTER TABLE purchase_order_item DROP CONSTRAINT IF EXISTS fk_purchase_order_item_request_item;
ALTER TABLE purchase_order DROP CONSTRAINT IF EXISTS fk_purchase_order_request;

DROP TABLE IF EXISTS purchase_request_item_reject CASCADE;
DROP TABLE IF EXISTS purchase_request_item_file CASCADE;
DROP TABLE IF EXISTS purchase_request_item CASCADE;
DROP TABLE IF EXISTS purchase_request_customer CASCADE;
DROP TABLE IF EXISTS purchase_request CASCADE;

DROP TYPE IF EXISTS purchase_request_item_reject_type;
DROP TYPE IF EXISTS purchase_request_item_reject_status;
DROP TYPE IF EXISTS purchase_request_status;
-- +goose StatementEnd
