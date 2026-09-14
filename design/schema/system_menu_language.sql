CREATE TABLE system_menu_language (
    system_menu_id  BIGINT       NOT NULL REFERENCES system_menu(id) ON DELETE CASCADE,
    locale         VARCHAR(10)  NOT NULL REFERENCES system_language(locale) ON DELETE RESTRICT,
    name           VARCHAR(100) NOT NULL,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (system_menu_id, locale),
    CONSTRAINT uq_system_menu_language_locale UNIQUE (system_menu_id, locale)
);

CREATE INDEX idx_system_menu_language_locale ON system_menu_language (locale);
