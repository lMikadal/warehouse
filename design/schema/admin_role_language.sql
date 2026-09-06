-- source: v1 admin_role_language (v2 inlined name → reverted to language table for i18n)
CREATE TABLE admin_role_language (
    admin_role_id  BIGINT       NOT NULL REFERENCES admin_role(id) ON DELETE CASCADE, -- parent role
    locale         VARCHAR(10)  NOT NULL REFERENCES website_language(locale) ON DELETE RESTRICT, -- translation locale
    name           VARCHAR(100) NOT NULL,                -- role display name
    description    TEXT,                                   -- optional role description
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (admin_role_id, locale),
    CONSTRAINT uq_admin_role_language_locale UNIQUE (admin_role_id, locale)
);

CREATE INDEX idx_admin_role_language_locale ON admin_role_language (locale);
