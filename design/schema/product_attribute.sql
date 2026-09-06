-- source: v2 v2_product_attributes (consolidates v1 product_brands/product_categories/product_car_categories)
--   - type discriminates: brand | category | car
--   - type_car discriminates car-attribute level: brand | model | engine (only when type='car')
--   - tree_path LTREE for hierarchy within each type
--   - is_stopped (car fitment): replaces v1 product_product_car_categories.is_stoped (spelling fixed)
--   - image_url → website_file_id (purpose: product_attribute_logo)
CREATE TYPE product_attribute_type     AS ENUM ('brand', 'category', 'car');
CREATE TYPE product_attribute_car_type AS ENUM ('brand', 'model', 'engine');

CREATE TABLE product_attribute (
    id          BIGSERIAL                   PRIMARY KEY,              -- surrogate PK
    type        product_attribute_type      NOT NULL,                 -- attribute kind: brand | category | car
    type_car    product_attribute_car_type,                           -- car sub-level when type='car': brand | model | engine
    website_file_id BIGINT                      REFERENCES website_file(id) ON DELETE RESTRICT, -- logo or icon (purpose: product_attribute_logo)
    parent_id   BIGINT                      REFERENCES product_attribute(id) ON DELETE RESTRICT, -- parent node in hierarchy
    tree_path   LTREE                       NOT NULL,                 -- materialized path for tree queries
    sort_order  INTEGER                     NOT NULL DEFAULT 0,       -- sibling display order
    is_active   BOOLEAN                     NOT NULL DEFAULT TRUE,    -- visible/selectable when TRUE
    is_stopped  BOOLEAN                     NOT NULL DEFAULT FALSE,   -- car brand/model stop-sell flag
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ                 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ                 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  BIGINT                      REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by  BIGINT                      REFERENCES admin_user(id) ON DELETE SET NULL,
    CONSTRAINT chk_product_attribute_type_car
        CHECK (type_car IS NULL OR type = 'car')
);

CREATE INDEX idx_product_attribute_tree_path USING GIST ON product_attribute (tree_path);
CREATE UNIQUE INDEX uq_product_attribute_tree_path
    ON product_attribute (tree_path)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_product_attribute_parent_sort
    ON product_attribute (parent_id, sort_order)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_product_attribute_type_active
    ON product_attribute (type, sort_order)
    WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX idx_product_attribute_file       ON product_attribute (website_file_id) WHERE website_file_id IS NOT NULL;
CREATE INDEX idx_product_attribute_created_by ON product_attribute (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_product_attribute_updated_by ON product_attribute (updated_by) WHERE updated_by IS NOT NULL;
