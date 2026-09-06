-- source: v1 order_ticket_items (renamed)
--   - type: new (requested item not yet in system) | old (existing product_item)
--   - brand/model/engine FKs to product_attribute (replaces product_car_categories FKs)
--   - store_data JSONB removed (was unstructured; explicit columns preferred)
--   - image_url[] removed → purchase_request_item_file (gallery for type='new')
--   - approved_by/rejected_by/approved_at/rejected_at removed: status + purchase_history instead
CREATE TYPE purchase_request_item_type AS ENUM ('new', 'old');

CREATE TABLE purchase_request_item (
    id                           BIGSERIAL                    PRIMARY KEY,              -- surrogate PK
    purchase_request_id          BIGINT                       NOT NULL REFERENCES purchase_request(id) ON DELETE CASCADE, -- parent request
    status                       purchase_request_status      NOT NULL DEFAULT 'pending', -- line workflow state
    type                         purchase_request_item_type   NOT NULL,                 -- new vs existing product
    product_item_id              BIGINT                       REFERENCES product_item(id) ON DELETE SET NULL,  -- when type='old'
    name                         VARCHAR(255),                -- when type='new'
    product_attribute_brand_id   BIGINT                       REFERENCES product_attribute(id) ON DELETE SET NULL, -- type='car', type_car='brand'
    product_attribute_model_id   BIGINT                       REFERENCES product_attribute(id) ON DELETE SET NULL, -- type='car', type_car='model'
    product_attribute_engine_id  BIGINT                       REFERENCES product_attribute(id) ON DELETE SET NULL, -- type='car', type_car='engine'
    identification_number        VARCHAR(255)                 NOT NULL DEFAULT '',      -- VIN/chassis or part ID
    qty_sell                     INTEGER                      NOT NULL DEFAULT 1,       -- quantity to sell
    qty_reorder                  INTEGER                      NOT NULL DEFAULT 0,       -- reorder quantity
    deposit                      NUMERIC(15,4)                NOT NULL DEFAULT 0,       -- line deposit amount
    unit                         product_unit                 NOT NULL DEFAULT 'piece', -- measurement unit
    note                         TEXT                         NOT NULL DEFAULT '',      -- line notes
    deleted_at                   TIMESTAMPTZ,
    created_at                   TIMESTAMPTZ                  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                   TIMESTAMPTZ                  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                   BIGINT                       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by                   BIGINT                       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_purchase_request_item_request  ON purchase_request_item (purchase_request_id)  WHERE deleted_at IS NULL;
CREATE INDEX idx_purchase_request_item_product   ON purchase_request_item (product_item_id)      WHERE product_item_id IS NOT NULL;
CREATE INDEX idx_purchase_request_item_engine    ON purchase_request_item (product_attribute_engine_id) WHERE product_attribute_engine_id IS NOT NULL;
CREATE INDEX idx_purchase_request_item_created_by ON purchase_request_item (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_purchase_request_item_updated_by ON purchase_request_item (updated_by) WHERE updated_by IS NOT NULL;
