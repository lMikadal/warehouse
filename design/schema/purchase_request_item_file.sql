-- source: v1 order_ticket_items.image_url[] → normalized via website_file
--   - gallery for purchase_request_item (intended for type='new'; enforced by application)
--   - sort_order: gallery display order (lowest = cover)
--   - purpose on website_file: 'purchase_request_item_image'
CREATE TABLE purchase_request_item_file (
    id                        BIGSERIAL    PRIMARY KEY,              -- surrogate PK
    purchase_request_item_id  BIGINT       NOT NULL REFERENCES purchase_request_item(id) ON DELETE CASCADE, -- parent request line
    website_file_id           BIGINT       NOT NULL REFERENCES website_file(id)   ON DELETE RESTRICT, -- stored file reference
    sort_order                INTEGER      NOT NULL DEFAULT 0,       -- gallery display order (lowest = cover)
    deleted_at                TIMESTAMPTZ,
    created_at                TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by                BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_purchase_request_item_file_item_file
    ON purchase_request_item_file (purchase_request_item_id, website_file_id)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_purchase_request_item_file_item_sort
    ON purchase_request_item_file (purchase_request_item_id, sort_order)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_purchase_request_item_file_file
    ON purchase_request_item_file (website_file_id);

CREATE INDEX idx_purchase_request_item_file_created_by
    ON purchase_request_item_file (created_by) WHERE created_by IS NOT NULL;

CREATE INDEX idx_purchase_request_item_file_updated_by
    ON purchase_request_item_file (updated_by) WHERE updated_by IS NOT NULL;
