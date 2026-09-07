-- source: v2 v2_product_attributes_attributes + v1 product_brands_product_categories
--   - use: allowed brand↔category pairs (build UI tree, validate sellable combos)
--   - pricing moved to discount_rule module
CREATE TABLE product_attribute_relation (
    product_attribute_id  BIGINT NOT NULL REFERENCES product_attribute(id) ON DELETE CASCADE, -- e.g. brand attribute
    related_id            BIGINT NOT NULL REFERENCES product_attribute(id) ON DELETE CASCADE, -- e.g. category attribute
    PRIMARY KEY (product_attribute_id, related_id)
);

CREATE INDEX idx_product_attribute_relation_related ON product_attribute_relation (related_id);
