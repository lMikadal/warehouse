-- source: v1 product_product_language + v2 v2_product_product_language
--   - restored: sub_name, description (v2 dropped them)
CREATE TABLE product_list_language (
    product_list_id  BIGINT       NOT NULL REFERENCES product_list(id) ON DELETE CASCADE, -- parent product
    locale           VARCHAR(10)  NOT NULL REFERENCES system_language(locale) ON DELETE RESTRICT, -- th | en
    name             VARCHAR(255) NOT NULL,                 -- localized product name
    sub_name         VARCHAR(255),                          -- optional subtitle
    description      TEXT,                                  -- localized long description
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (product_list_id, locale),
    CONSTRAINT uq_product_list_language_locale UNIQUE (product_list_id, locale)
);

CREATE INDEX idx_product_list_language_locale ON product_list_language (locale);
