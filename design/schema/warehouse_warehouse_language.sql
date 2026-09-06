-- source: v1 warehouse_warehouse_language + v2 v2_warehouse_warehouse_language
--   - locale FK restored (v2 used bare TEXT with no FK)
CREATE TABLE warehouse_warehouse_language (
    warehouse_warehouse_id  BIGINT       NOT NULL REFERENCES warehouse_warehouse(id) ON DELETE CASCADE, -- parent warehouse node
    locale                  VARCHAR(10)  NOT NULL REFERENCES website_language(locale) ON DELETE RESTRICT, -- translation locale
    name                    VARCHAR(255) NOT NULL,                -- location display name
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (warehouse_warehouse_id, locale),
    CONSTRAINT uq_warehouse_warehouse_language_locale UNIQUE (warehouse_warehouse_id, locale)
);

CREATE INDEX idx_warehouse_warehouse_language_locale ON warehouse_warehouse_language (locale);
