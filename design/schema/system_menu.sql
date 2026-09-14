-- Nav tree (backoffice). Name in system_menu_language.
CREATE TABLE system_menu (
    id               BIGSERIAL    PRIMARY KEY,
    icon             VARCHAR(100),
    module           VARCHAR(100) NOT NULL,
    path             VARCHAR(255),
    parent_id        BIGINT       REFERENCES system_menu(id) ON DELETE RESTRICT,
    tree_path        LTREE        NOT NULL,
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

CREATE INDEX idx_system_menu_tree_path USING GIST ON system_menu (tree_path);
CREATE UNIQUE INDEX uq_system_menu_tree_path
    ON system_menu (tree_path)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_system_menu_parent_sort ON system_menu (parent_id, sort_order) WHERE deleted_at IS NULL;
CREATE INDEX idx_system_menu_module      ON system_menu (module)      WHERE deleted_at IS NULL;
CREATE INDEX idx_system_menu_created_by  ON system_menu (created_by)  WHERE created_by IS NOT NULL;
CREATE INDEX idx_system_menu_updated_by  ON system_menu (updated_by)  WHERE updated_by IS NOT NULL;
