-- source: v1 product_items.image_url[] + image_cover_url → normalized via website_file
--   - sort_order: gallery display order (lowest = cover)
--   - purpose on website_file: 'product_item_image'
CREATE TABLE product_item_file (
    id                BIGSERIAL    PRIMARY KEY,              -- surrogate PK
    product_item_id   BIGINT       NOT NULL REFERENCES product_item(id) ON DELETE CASCADE, -- parent variant
    website_file_id   BIGINT       NOT NULL REFERENCES website_file(id)   ON DELETE RESTRICT, -- stored file reference
    sort_order        INTEGER      NOT NULL DEFAULT 0,       -- gallery display order (lowest = cover)
    deleted_at        TIMESTAMPTZ,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by        BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by        BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_product_item_file_item_file
    ON product_item_file (product_item_id, website_file_id)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_product_item_file_item_sort
    ON product_item_file (product_item_id, sort_order)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_product_item_file_file
    ON product_item_file (website_file_id);

CREATE INDEX idx_product_item_file_created_by
    ON product_item_file (created_by) WHERE created_by IS NOT NULL;

CREATE INDEX idx_product_item_file_updated_by
    ON product_item_file (updated_by) WHERE updated_by IS NOT NULL;
