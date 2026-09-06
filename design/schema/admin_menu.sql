-- source: v1 admin_menus (UUID→BIGSERIAL)
--   - restored: created_by, updated_by (v1 had them; v2 dropped)
--   - merged:   is_superadmin + is_dialog → is_superadmin_only + is_dialog (v2 naming)
--   - name moved to admin_menu_language for i18n (v2 inlined — reverted)
--   - tree: parent_id + tree_path + sort_order (drag-reorder + LTREE queries)
CREATE TABLE admin_menu (
    id               BIGSERIAL    PRIMARY KEY,
    parent_id        BIGINT       REFERENCES admin_menu(id) ON DELETE RESTRICT,
    tree_path        LTREE        NOT NULL,
    module           VARCHAR(100) NOT NULL,
    path             VARCHAR(255),
    icon             VARCHAR(100),
    sort_order       INTEGER      NOT NULL DEFAULT 100,
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
    is_superadmin_only BOOLEAN    NOT NULL DEFAULT FALSE,
    is_dialog        BOOLEAN      NOT NULL DEFAULT FALSE,
    deleted_at       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by       BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by       BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_admin_menu_tree_path USING GIST ON admin_menu (tree_path);
CREATE UNIQUE INDEX uq_admin_menu_tree_path
    ON admin_menu (tree_path)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_admin_menu_parent_sort ON admin_menu (parent_id, sort_order) WHERE deleted_at IS NULL;
CREATE INDEX idx_admin_menu_module      ON admin_menu (module)      WHERE deleted_at IS NULL;
CREATE INDEX idx_admin_menu_created_by  ON admin_menu (created_by)  WHERE created_by IS NOT NULL;
CREATE INDEX idx_admin_menu_updated_by  ON admin_menu (updated_by)  WHERE updated_by IS NOT NULL;
