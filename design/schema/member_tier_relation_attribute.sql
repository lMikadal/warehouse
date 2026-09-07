-- source: v1 member_tier_items_product_brands + member_tier_items_product_categories
--         + v2 v2_member_tiers_product_attributes merged (renamed)
-- junction: brand/category attributes for a per-combo tier rule override
CREATE TABLE member_tier_relation_attribute (
    member_tier_relation_id  BIGINT NOT NULL REFERENCES member_tier_relation(id)  ON DELETE CASCADE, -- tier relation rule
    product_attribute_id     BIGINT NOT NULL REFERENCES product_attribute(id)     ON DELETE CASCADE, -- brand or category attribute
    PRIMARY KEY (member_tier_relation_id, product_attribute_id)
);

CREATE INDEX idx_member_tier_relation_attribute_attr ON member_tier_relation_attribute (product_attribute_id);
