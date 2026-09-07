-- source: tier-level default product scope (when member_tier.type != 'all')
-- junction: brand/category attributes for tier default rule (used when no member_tier_relation matches)
CREATE TABLE member_tier_attribute (
    member_tier_id        BIGINT NOT NULL REFERENCES member_tier(id)         ON DELETE CASCADE, -- tier default rule
    product_attribute_id  BIGINT NOT NULL REFERENCES product_attribute(id)  ON DELETE CASCADE, -- brand or category attribute
    PRIMARY KEY (member_tier_id, product_attribute_id)
);

CREATE INDEX idx_member_tier_attribute_attr ON member_tier_attribute (product_attribute_id);
