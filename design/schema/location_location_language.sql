-- source: v1 location_location_language (module location)
CREATE TABLE location_location_language (
    location_location_id  BIGINT       NOT NULL REFERENCES location_location(id) ON DELETE CASCADE, -- parent location
    locale                VARCHAR(10)  NOT NULL REFERENCES system_language(locale) ON DELETE RESTRICT, -- translation locale
    name                  VARCHAR(255) NOT NULL,                -- location display name
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (location_location_id, locale),
    CONSTRAINT uq_location_location_language_locale UNIQUE (location_location_id, locale)
);

CREATE INDEX idx_location_location_language_locale ON location_location_language (locale);
