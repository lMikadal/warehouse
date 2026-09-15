-- source: v1 order_purchase_files (renamed)
--   - gallery for purchase_order header attachments
--   - system_file_id replaces raw file TEXT column (files managed centrally)
--   - sort_order: gallery display order (lowest = cover)
--   - purpose on system_file: 'purchase_order_attachment'
CREATE TABLE purchase_order_file (
    id                 BIGSERIAL    PRIMARY KEY,              -- surrogate PK
    purchase_order_id  BIGINT       NOT NULL REFERENCES purchase_order(id) ON DELETE CASCADE, -- parent PO
    system_file_id    BIGINT       NOT NULL REFERENCES system_file(id)   ON DELETE RESTRICT, -- stored file reference
    sort_order         INTEGER      NOT NULL DEFAULT 0,       -- gallery display order (lowest = cover)
    deleted_at         TIMESTAMPTZ,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by         BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by         BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_purchase_order_file_order_file
    ON purchase_order_file (purchase_order_id, system_file_id)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_purchase_order_file_order_sort
    ON purchase_order_file (purchase_order_id, sort_order)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_purchase_order_file_file
    ON purchase_order_file (system_file_id);

CREATE INDEX idx_purchase_order_file_created_by
    ON purchase_order_file (created_by) WHERE created_by IS NOT NULL;

CREATE INDEX idx_purchase_order_file_updated_by
    ON purchase_order_file (updated_by) WHERE updated_by IS NOT NULL;
