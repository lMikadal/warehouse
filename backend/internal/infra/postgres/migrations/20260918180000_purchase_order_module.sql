-- +goose Up
-- +goose StatementBegin
-- source: design/schema/purchase_order.sql, purchase_order_item.sql (purchase_request FKs omitted until PR module)

CREATE TYPE purchase_order_status AS ENUM (
    'draft', 'pending', 'paying', 'completed', 'receive_partial', 'receive_completed', 'rejected', 'cancelled'
);

CREATE TYPE purchase_order_item_status AS ENUM (
    'pending', 'approved', 'rejected', 'receive_approved', 'receive_rejected'
);

CREATE TYPE purchase_request_item_type AS ENUM ('catalog', 'custom');

CREATE TABLE purchase_order (
    id                  BIGSERIAL             PRIMARY KEY,
    sku                 VARCHAR(50),
    purchase_request_id BIGINT,
    supplier_user_id    BIGINT                REFERENCES supplier_user(id) ON DELETE SET NULL,
    status              purchase_order_status NOT NULL DEFAULT 'draft',
    ordered_at          TIMESTAMPTZ           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    vat_type            setting_vat_type      NOT NULL DEFAULT 'exclude',
    vat_rate            NUMERIC(5,2)          NOT NULL DEFAULT 0,
    discount            NUMERIC(15,4)         NOT NULL DEFAULT 0,
    special_discount    NUMERIC(15,4)         NOT NULL DEFAULT 0,
    total_price         NUMERIC(15,4)         NOT NULL DEFAULT 0,
    note                TEXT                  NOT NULL DEFAULT '',
    deleted_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by          BIGINT                REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by          BIGINT                REFERENCES admin_user(id) ON DELETE SET NULL,
    CONSTRAINT uq_purchase_order_sku UNIQUE (sku)
);

CREATE INDEX idx_purchase_order_status     ON purchase_order (status)              WHERE deleted_at IS NULL;
CREATE INDEX idx_purchase_order_request    ON purchase_order (purchase_request_id) WHERE purchase_request_id IS NOT NULL;
CREATE INDEX idx_purchase_order_supplier   ON purchase_order (supplier_user_id)    WHERE supplier_user_id IS NOT NULL;
CREATE INDEX idx_purchase_order_created_by ON purchase_order (created_by)          WHERE created_by IS NOT NULL;
CREATE INDEX idx_purchase_order_updated_by ON purchase_order (updated_by)          WHERE updated_by IS NOT NULL;

CREATE TABLE purchase_order_item (
    id                          BIGSERIAL                    PRIMARY KEY,
    purchase_order_id           BIGINT                       NOT NULL REFERENCES purchase_order(id) ON DELETE CASCADE,
    purchase_request_item_id    BIGINT,
    parent_id                   BIGINT                       REFERENCES purchase_order_item(id) ON DELETE SET NULL,
    status                      purchase_order_item_status   NOT NULL DEFAULT 'pending',
    type                        purchase_request_item_type   NOT NULL,
    product_item_id             BIGINT                       REFERENCES product_item(id) ON DELETE SET NULL,
    name                        VARCHAR(255),
    product_attribute_brand_id  BIGINT                       REFERENCES product_attribute(id) ON DELETE SET NULL,
    product_attribute_model_id  BIGINT                       REFERENCES product_attribute(id) ON DELETE SET NULL,
    product_attribute_engine_id BIGINT                       REFERENCES product_attribute(id) ON DELETE SET NULL,
    identification_number       VARCHAR(255)                 NOT NULL DEFAULT '',
    qty                         INTEGER                      NOT NULL DEFAULT 1,
    free_gift                   INTEGER                      NOT NULL DEFAULT 0,
    unit                        product_unit                 NOT NULL DEFAULT 'piece',
    price_per_unit              NUMERIC(15,4)                NOT NULL DEFAULT 0,
    vat_rate                    NUMERIC(5,2)                 NOT NULL DEFAULT 0,
    discount                    NUMERIC(15,4)                NOT NULL DEFAULT 0,
    total_price                 NUMERIC(15,4)                NOT NULL DEFAULT 0,
    note                        TEXT                         NOT NULL DEFAULT '',
    deleted_at                  TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ                  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMPTZ                  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  BIGINT                       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by                  BIGINT                       REFERENCES admin_user(id) ON DELETE SET NULL,
    CONSTRAINT chk_purchase_order_item_discount CHECK (discount >= 0),
    CONSTRAINT chk_purchase_order_item_free_gift CHECK (free_gift >= 0)
);

CREATE INDEX idx_purchase_order_item_order   ON purchase_order_item (purchase_order_id)        WHERE deleted_at IS NULL;
CREATE INDEX idx_purchase_order_item_request ON purchase_order_item (purchase_request_item_id) WHERE purchase_request_item_id IS NOT NULL;
CREATE INDEX idx_purchase_order_item_parent  ON purchase_order_item (parent_id)                WHERE parent_id IS NOT NULL;
CREATE INDEX idx_purchase_order_item_product ON purchase_order_item (product_item_id)          WHERE product_item_id IS NOT NULL;
CREATE INDEX idx_purchase_order_item_status  ON purchase_order_item (status)                   WHERE deleted_at IS NULL;
CREATE INDEX idx_purchase_order_item_created_by ON purchase_order_item (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_purchase_order_item_updated_by ON purchase_order_item (updated_by) WHERE updated_by IS NOT NULL;

-- ponytail: clear orphan PO line refs until dev seed repopulates purchase_order_item rows
UPDATE product_item_stock SET purchase_order_item_id = NULL WHERE purchase_order_item_id IS NOT NULL;

ALTER TABLE product_item_stock
    ADD CONSTRAINT fk_product_item_stock_purchase_order_item
    FOREIGN KEY (purchase_order_item_id) REFERENCES purchase_order_item(id) ON DELETE SET NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE product_item_stock DROP CONSTRAINT IF EXISTS fk_product_item_stock_purchase_order_item;
DROP TABLE IF EXISTS purchase_order_item;
DROP TABLE IF EXISTS purchase_order;
DROP TYPE IF EXISTS purchase_order_item_status;
DROP TYPE IF EXISTS purchase_order_status;
DROP TYPE IF EXISTS purchase_request_item_type;
-- +goose StatementEnd
