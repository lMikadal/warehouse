-- source: v2 v2_order_order_claim_reason_language (module setting)
CREATE TABLE setting_claim_reason_language (
    setting_claim_reason_id  BIGINT       NOT NULL REFERENCES setting_claim_reason(id) ON DELETE CASCADE, -- parent reason
    locale                   VARCHAR(10)  NOT NULL REFERENCES website_language(locale) ON DELETE RESTRICT, -- translation locale
    name                     TEXT         NOT NULL,                -- reason display name
    created_at               TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at               TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (setting_claim_reason_id, locale),
    CONSTRAINT uq_setting_claim_reason_language_locale UNIQUE (setting_claim_reason_id, locale)
);

CREATE INDEX idx_setting_claim_reason_language_locale ON setting_claim_reason_language (locale);
