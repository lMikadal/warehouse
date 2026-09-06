-- source: v2 v2_product_attribute_language (consolidates v1 brand/category/car_category language tables)
CREATE TABLE product_attribute_language (
    product_attribute_id  BIGINT       NOT NULL REFERENCES product_attribute(id) ON DELETE CASCADE, -- parent attribute
    locale                VARCHAR(10)  NOT NULL REFERENCES website_language(locale) ON DELETE RESTRICT, -- th | en
    name                  VARCHAR(255) NOT NULL,                 -- localized display name
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (product_attribute_id, locale),
    CONSTRAINT uq_product_attribute_language_locale UNIQUE (product_attribute_id, locale)
);

CREATE INDEX idx_product_attribute_language_locale ON product_attribute_language (locale);
