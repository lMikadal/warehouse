-- source: v1 admin_menu_language (v2 inlined name → reverted to language table for i18n)
CREATE TABLE admin_menu_language (
    admin_menu_id  BIGINT       NOT NULL REFERENCES admin_menu(id) ON DELETE CASCADE, -- parent menu item
    locale         VARCHAR(10)  NOT NULL REFERENCES website_language(locale) ON DELETE RESTRICT, -- translation locale
    name           VARCHAR(100) NOT NULL,                -- nav label
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (admin_menu_id, locale),
    CONSTRAINT uq_admin_menu_language_locale UNIQUE (admin_menu_id, locale)
);

CREATE INDEX idx_admin_menu_language_locale ON admin_menu_language (locale);
