-- source: v1 website_upload + v2 v2_upload_files merged (renamed website_file → system_file)
--   - unique on object_key restored (v2 had dropped it)
--   - created_by FK restored (v2 had no FK)
--   - updated_at / deleted_at added (v2 was append-only, design is full CRUD)
--   - all uploads reference this table; no image_url TEXT columns elsewhere
--   - purpose tags: product_attribute_logo, member_avatar, member_tier_badge,
--     setting_bank_logo, setting_sale_channel_logo, purchase_order_payment_proof,
--     product_item_image (gallery via product_item_file),
--     purchase_request_item_image (gallery via purchase_request_item_file),
--     purchase_order_item_image (gallery via purchase_order_item_file),
--     purchase_order_item_reject_image (gallery via purchase_order_item_reject_file),
--     member_document, purchase_order_attachment
CREATE TABLE system_file (
    id            BIGSERIAL    PRIMARY KEY,              -- surrogate PK
    bucket        TEXT         NOT NULL,                 -- object storage bucket
    object_key    TEXT         NOT NULL,                 -- unique key within bucket
    content_type  TEXT         NOT NULL,                 -- MIME type
    size_bytes    BIGINT       NOT NULL,                 -- file size
    purpose       TEXT         NOT NULL,                 -- usage tag; see file header for allowed values
    original_name TEXT         NOT NULL,                 -- client filename at upload
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at    TIMESTAMPTZ,
    created_by    BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by    BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    CONSTRAINT uq_system_file_object_key UNIQUE (object_key)
);

CREATE INDEX idx_system_file_purpose     ON system_file (purpose, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_system_file_created_by  ON system_file (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_system_file_updated_by  ON system_file (updated_by) WHERE updated_by IS NOT NULL;
