-- source: v1 order_purchase_items (renamed)
--   - pricing: price_per_unit + vat_rate + discount + total_price (maintained by application)
--   - parent_id: self-FK for split lines (v1 order_purchase_items_parent)
--   - image_url[] removed → purchase_order_item_file (gallery)
--   - received_by/received_at removed: status + purchase_history instead
CREATE TYPE purchase_order_item_status AS ENUM (
    'pending', 'approved', 'rejected', 'receive_approved', 'receive_rejected'
);

CREATE TABLE purchase_order_item (
    id                           BIGSERIAL                    PRIMARY KEY,              -- surrogate PK
    purchase_order_id            BIGINT                       NOT NULL REFERENCES purchase_order(id) ON DELETE CASCADE, -- parent PO
    purchase_request_item_id     BIGINT                       REFERENCES purchase_request_item(id) ON DELETE SET NULL, -- source request line
    parent_id                    BIGINT                       REFERENCES purchase_order_item(id) ON DELETE SET NULL, -- split-line parent
    status                       purchase_order_item_status   NOT NULL DEFAULT 'pending', -- line receive/approval state
    type                         purchase_request_item_type   NOT NULL,                 -- new vs existing product
    product_item_id              BIGINT                       REFERENCES product_item(id) ON DELETE SET NULL, -- catalog product when type='old'
    name                         VARCHAR(255),                                          -- product name when type='new'
    product_attribute_brand_id   BIGINT                       REFERENCES product_attribute(id) ON DELETE SET NULL, -- brand attribute
    product_attribute_model_id   BIGINT                       REFERENCES product_attribute(id) ON DELETE SET NULL, -- model attribute
    product_attribute_engine_id  BIGINT                       REFERENCES product_attribute(id) ON DELETE SET NULL, -- engine attribute
    identification_number        VARCHAR(255)                 NOT NULL DEFAULT '',      -- VIN/chassis or part ID
    qty                          INTEGER                      NOT NULL DEFAULT 1,       -- ordered quantity
    free_gift                    INTEGER                      NOT NULL DEFAULT 0,       -- bonus quantity
    unit                         product_unit                 NOT NULL DEFAULT 'piece', -- measurement unit
    price_per_unit               NUMERIC(15,4)                NOT NULL DEFAULT 0,   -- unit price snapshot
    vat_rate                     NUMERIC(5,2)                 NOT NULL DEFAULT 0,   -- VAT rate snapshot
    discount                     NUMERIC(15,4)                NOT NULL DEFAULT 0,   -- line discount
    total_price                  NUMERIC(15,4)                NOT NULL DEFAULT 0,   -- line total price
    note                         TEXT                         NOT NULL DEFAULT '',      -- line notes
    deleted_at                   TIMESTAMPTZ,
    created_at                   TIMESTAMPTZ                  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                   TIMESTAMPTZ                  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                   BIGINT                       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by                   BIGINT                       REFERENCES admin_user(id) ON DELETE SET NULL,
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
