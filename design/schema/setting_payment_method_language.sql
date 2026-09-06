-- source: v1 setting_payment_language + v1 setting_pay_language merged
CREATE TABLE setting_payment_method_language (
    setting_payment_method_id  BIGINT       NOT NULL REFERENCES setting_payment_method(id) ON DELETE CASCADE, -- parent method
    locale                     VARCHAR(10)  NOT NULL REFERENCES website_language(locale)    ON DELETE RESTRICT, -- translation locale
    name                       VARCHAR(255) NOT NULL,                -- payment method label
    created_at                 TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                 TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (setting_payment_method_id, locale),
    CONSTRAINT uq_setting_payment_method_language_locale UNIQUE (setting_payment_method_id, locale)
);

CREATE INDEX idx_setting_payment_method_language_locale ON setting_payment_method_language (locale);
