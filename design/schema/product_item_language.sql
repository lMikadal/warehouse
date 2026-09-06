-- source: v1 product_item_language + v2 v2_product_product_item_language
CREATE TABLE product_item_language (
    product_item_id  BIGINT       NOT NULL REFERENCES product_item(id) ON DELETE CASCADE, -- parent item
    locale           VARCHAR(10)  NOT NULL REFERENCES website_language(locale) ON DELETE RESTRICT, -- th | en
    name             VARCHAR(255) NOT NULL,                 -- localized variant name
    description      TEXT,                                  -- localized description
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (product_item_id, locale),
    CONSTRAINT uq_product_item_language_locale UNIQUE (product_item_id, locale)
);

CREATE INDEX idx_product_item_language_locale ON product_item_language (locale);
