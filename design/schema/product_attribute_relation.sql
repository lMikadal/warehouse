-- source: v2 v2_product_attributes_attributes + v1 product_brands_product_categories
--   - restored: discount NUMERIC(15,4) + discount_type — v1 had per brand×category discount; v2 dropped it
--   - use: allowed brand↔category pairs; also stores per-pair discount for member tier pricing
CREATE TABLE product_attribute_relation (
    product_attribute_id  BIGINT                                      NOT NULL REFERENCES product_attribute(id) ON DELETE CASCADE, -- e.g. brand attribute
    related_id            BIGINT                                      NOT NULL REFERENCES product_attribute(id) ON DELETE CASCADE, -- e.g. category attribute
    discount              NUMERIC(15,4)                               NOT NULL DEFAULT 0, -- discount amount for this pair
    discount_type         discount_unit NOT NULL DEFAULT 'percent', -- percent | baht
    PRIMARY KEY (product_attribute_id, related_id)
);

CREATE INDEX idx_product_attribute_relation_related ON product_attribute_relation (related_id);
