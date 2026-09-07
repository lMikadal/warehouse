-- source: new discount module (catalog special price UI)
--   - brand_attribute_id + category_attribute_id (nullable): product scope; NULL category = brand-level default
--   - member_setting_relation_id: business × group × credit combo (popup row)
--   - resolution: walk category ancestors (deepest first), then brand-level fallback; member_tier_relation overrides when matched
CREATE TABLE discount_rule (
    id                         BIGSERIAL                      PRIMARY KEY,              -- surrogate PK
    brand_attribute_id         BIGINT                         NOT NULL REFERENCES product_attribute(id)     ON DELETE CASCADE, -- brand scope (type=brand)
    category_attribute_id      BIGINT                         REFERENCES product_attribute(id)            ON DELETE CASCADE, -- category scope (type=category); NULL = all categories under brand
    member_setting_relation_id BIGINT                         NOT NULL REFERENCES member_setting_relation(id) ON DELETE RESTRICT, -- profile combo (business × group × credit)
    discount                   NUMERIC(15,4)                  NOT NULL DEFAULT 0,       -- discount value
    discount_type              discount_unit                  NOT NULL DEFAULT 'percent', -- percent or fixed baht
    deleted_at                 TIMESTAMPTZ,
    created_at                 TIMESTAMPTZ                    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                 TIMESTAMPTZ                    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                 BIGINT                         REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by                 BIGINT                         REFERENCES admin_user(id) ON DELETE SET NULL,
    CONSTRAINT chk_discount_rule_discount CHECK (discount >= 0)
);

CREATE UNIQUE INDEX uq_discount_rule_brand_combo
    ON discount_rule (brand_attribute_id, member_setting_relation_id)
    WHERE category_attribute_id IS NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX uq_discount_rule_brand_category_combo
    ON discount_rule (brand_attribute_id, category_attribute_id, member_setting_relation_id)
    WHERE category_attribute_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_discount_rule_brand     ON discount_rule (brand_attribute_id)         WHERE deleted_at IS NULL;
CREATE INDEX idx_discount_rule_category  ON discount_rule (category_attribute_id)      WHERE category_attribute_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_discount_rule_setting   ON discount_rule (member_setting_relation_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_discount_rule_created_by ON discount_rule (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_discount_rule_updated_by ON discount_rule (updated_by) WHERE updated_by IS NOT NULL;

-- ponytail: self-check — partial uniques prevent duplicate brand-level vs category-level rows per combo;
--   resolution walks category ancestors (deepest first), then brand-level (category IS NULL).
