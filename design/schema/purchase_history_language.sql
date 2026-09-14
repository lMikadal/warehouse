-- source: v1 order_history_language (renamed)
CREATE TABLE purchase_history_language (
    purchase_history_id  BIGINT       NOT NULL REFERENCES purchase_history(id) ON DELETE CASCADE, -- parent history event
    locale               VARCHAR(10)  NOT NULL REFERENCES system_language(locale) ON DELETE RESTRICT, -- translation locale
    title                VARCHAR(255) NOT NULL DEFAULT '', -- event title
    description          TEXT         NOT NULL DEFAULT '', -- event description
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (purchase_history_id, locale),
    CONSTRAINT uq_purchase_history_language_locale UNIQUE (purchase_history_id, locale)
);

CREATE INDEX idx_purchase_history_language_locale ON purchase_history_language (locale);
