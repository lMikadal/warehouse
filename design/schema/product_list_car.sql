-- source: v1 product_product_car_categories + v2 v2_product_product_cars
--   - restored: explicit brand_id, model_id FKs (v2 only stored engine; brand/model recovered by LTREE walk — too slow for filter queries)
--   - restored: gear_type, year_start, year_end (fitment detail)
--   - removed:  is_stopped — use product_attribute.is_stopped on car brand/model instead
CREATE TYPE product_list_car_gear_type AS ENUM ('auto', 'manual', 'cvt', 'dct', 'other');

CREATE TABLE product_list_car (
    id                          BIGSERIAL             PRIMARY KEY,              -- surrogate PK
    product_list_id             BIGINT                NOT NULL REFERENCES product_list(id) ON DELETE CASCADE, -- parent product
    product_attribute_brand_id  BIGINT                REFERENCES product_attribute(id) ON DELETE RESTRICT,  -- type='car', type_car='brand'
    product_attribute_model_id  BIGINT                REFERENCES product_attribute(id) ON DELETE RESTRICT,  -- type='car', type_car='model'
    product_attribute_engine_id BIGINT                NOT NULL REFERENCES product_attribute(id) ON DELETE RESTRICT, -- type='car', type_car='engine'
    gear_type                   product_list_car_gear_type,                    -- transmission type
    year_start                  SMALLINT,                                       -- fitment year range start
    year_end                    SMALLINT,                                       -- fitment year range end
    deleted_at                  TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMPTZ           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  BIGINT                REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by                  BIGINT                REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_product_list_car_product  ON product_list_car (product_list_id)          WHERE deleted_at IS NULL;
CREATE INDEX idx_product_list_car_brand    ON product_list_car (product_attribute_brand_id)  WHERE product_attribute_brand_id IS NOT NULL;
CREATE INDEX idx_product_list_car_model    ON product_list_car (product_attribute_model_id)  WHERE product_attribute_model_id IS NOT NULL;
CREATE INDEX idx_product_list_car_engine   ON product_list_car (product_attribute_engine_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_product_list_car_created_by ON product_list_car (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_product_list_car_updated_by ON product_list_car (updated_by) WHERE updated_by IS NOT NULL;
