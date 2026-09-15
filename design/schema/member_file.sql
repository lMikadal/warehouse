-- source: v1 member_member_files + v2 v2_member_members_upload_files
--   - sort_order: document display order (same pattern as product_item_file)
--   - display name from system_file.original_name (no local name column)
--   - purpose on system_file: 'member_document'
CREATE TABLE member_file (
    id              BIGSERIAL    PRIMARY KEY,              -- surrogate PK
    member_user_id  BIGINT       NOT NULL REFERENCES member_user(id)  ON DELETE CASCADE, -- owning member
    system_file_id BIGINT       NOT NULL REFERENCES system_file(id)   ON DELETE RESTRICT, -- stored file reference
    sort_order      INTEGER      NOT NULL DEFAULT 0,       -- document display order
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by      BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by      BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_member_file_user_file
    ON member_file (member_user_id, system_file_id)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_member_file_user_sort
    ON member_file (member_user_id, sort_order)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_member_file_file        ON member_file (system_file_id);
CREATE INDEX idx_member_file_created_by  ON member_file (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_member_file_updated_by  ON member_file (updated_by) WHERE updated_by IS NOT NULL;
