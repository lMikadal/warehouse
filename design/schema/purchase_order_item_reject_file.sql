-- source: v1 order_purchase_item_rejects.image_url[] → normalized via website_file
--   - gallery for purchase_order_item_reject (evidence photos)
--   - sort_order: gallery display order (lowest = cover)
--   - purpose on website_file: 'purchase_order_item_reject_image'
--   - v1 capped at 3 images; enforce in application (no DB cardinality check)
CREATE TABLE purchase_order_item_reject_file (
    id                              BIGSERIAL    PRIMARY KEY,              -- surrogate PK
    purchase_order_item_reject_id   BIGINT       NOT NULL REFERENCES purchase_order_item_reject(id) ON DELETE CASCADE, -- parent reject
    website_file_id                 BIGINT       NOT NULL REFERENCES website_file(id)   ON DELETE RESTRICT, -- stored file reference
    sort_order                      INTEGER      NOT NULL DEFAULT 0,       -- gallery display order (lowest = cover)
    deleted_at                      TIMESTAMPTZ,
    created_at                      TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                      TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                      BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by                      BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_purchase_order_item_reject_file_reject_file
    ON purchase_order_item_reject_file (purchase_order_item_reject_id, website_file_id)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_purchase_order_item_reject_file_reject_sort
    ON purchase_order_item_reject_file (purchase_order_item_reject_id, sort_order)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_purchase_order_item_reject_file_file
    ON purchase_order_item_reject_file (website_file_id);

CREATE INDEX idx_purchase_order_item_reject_file_created_by
    ON purchase_order_item_reject_file (created_by) WHERE created_by IS NOT NULL;

CREATE INDEX idx_purchase_order_item_reject_file_updated_by
    ON purchase_order_item_reject_file (updated_by) WHERE updated_by IS NOT NULL;
