-- +goose Up
-- +goose StatementBegin
-- source: design/schema/member_*.sql

CREATE TYPE member_address_type AS ENUM ('tax', 'doc', 'financial');

CREATE TABLE member_setting_credit (
    id          BIGSERIAL    PRIMARY KEY,              -- surrogate PK
    sku         VARCHAR(100),                           -- optional code
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,   -- whether row is selectable
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_member_setting_credit_sku
    ON member_setting_credit (sku)
    WHERE sku IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_member_setting_credit_active
    ON member_setting_credit (id)
    WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX idx_member_setting_credit_created_by ON member_setting_credit (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_member_setting_credit_updated_by ON member_setting_credit (updated_by) WHERE updated_by IS NOT NULL;

CREATE TABLE member_setting_credit_language (
    member_setting_credit_id  BIGINT       NOT NULL REFERENCES member_setting_credit(id) ON DELETE CASCADE, -- parent credit type
    locale                    VARCHAR(10)  NOT NULL REFERENCES system_language(locale) ON DELETE RESTRICT, -- translation locale
    name                      VARCHAR(255) NOT NULL,                -- display name
    created_at                TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (member_setting_credit_id, locale),
    CONSTRAINT uq_member_setting_credit_language_locale UNIQUE (member_setting_credit_id, locale)
);

CREATE INDEX idx_member_setting_credit_language_locale ON member_setting_credit_language (locale);

CREATE TABLE member_setting_group (
    id          BIGSERIAL    PRIMARY KEY,              -- surrogate PK
    sku         VARCHAR(100),                           -- optional code
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,   -- whether row is selectable
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_member_setting_group_sku
    ON member_setting_group (sku)
    WHERE sku IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_member_setting_group_active
    ON member_setting_group (id)
    WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX idx_member_setting_group_created_by ON member_setting_group (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_member_setting_group_updated_by ON member_setting_group (updated_by) WHERE updated_by IS NOT NULL;

CREATE TABLE member_setting_group_language (
    member_setting_group_id  BIGINT       NOT NULL REFERENCES member_setting_group(id) ON DELETE CASCADE, -- parent group type
    locale                   VARCHAR(10)  NOT NULL REFERENCES system_language(locale) ON DELETE RESTRICT, -- translation locale
    name                     VARCHAR(255) NOT NULL,                -- display name
    created_at               TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at               TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (member_setting_group_id, locale),
    CONSTRAINT uq_member_setting_group_language_locale UNIQUE (member_setting_group_id, locale)
);

CREATE INDEX idx_member_setting_group_language_locale ON member_setting_group_language (locale);

CREATE TABLE member_setting_business (
    id          BIGSERIAL    PRIMARY KEY,              -- surrogate PK
    sku         VARCHAR(100),                           -- business group code (A01, U01)
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,   -- whether row is selectable
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_member_setting_business_sku
    ON member_setting_business (sku)
    WHERE sku IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_member_setting_business_active
    ON member_setting_business (id)
    WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX idx_member_setting_business_created_by ON member_setting_business (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_member_setting_business_updated_by ON member_setting_business (updated_by) WHERE updated_by IS NOT NULL;

CREATE TABLE member_setting_business_language (
    member_setting_business_id  BIGINT       NOT NULL REFERENCES member_setting_business(id) ON DELETE CASCADE, -- parent business group
    locale                      VARCHAR(10)  NOT NULL REFERENCES system_language(locale) ON DELETE RESTRICT, -- translation locale
    name                        VARCHAR(255) NOT NULL,                -- display name
    created_at                  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (member_setting_business_id, locale),
    CONSTRAINT uq_member_setting_business_language_locale UNIQUE (member_setting_business_id, locale)
);

CREATE INDEX idx_member_setting_business_language_locale ON member_setting_business_language (locale);

CREATE TABLE member_setting_relation (
    id          BIGSERIAL PRIMARY KEY,              -- surrogate PK
    credit_id   BIGINT NOT NULL REFERENCES member_setting_credit(id)   ON DELETE RESTRICT, -- payment format
    group_id    BIGINT NOT NULL REFERENCES member_setting_group(id)    ON DELETE RESTRICT, -- pricing group
    business_id BIGINT NOT NULL REFERENCES member_setting_business(id) ON DELETE RESTRICT, -- business group
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,    -- whether combo is selectable
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  BIGINT REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by  BIGINT REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_member_setting_relation_combo
    ON member_setting_relation (credit_id, group_id, business_id)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_member_setting_relation_credit   ON member_setting_relation (credit_id)   WHERE deleted_at IS NULL;
CREATE INDEX idx_member_setting_relation_group    ON member_setting_relation (group_id)    WHERE deleted_at IS NULL;
CREATE INDEX idx_member_setting_relation_business ON member_setting_relation (business_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_member_setting_relation_active   ON member_setting_relation (id)          WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX idx_member_setting_relation_created_by ON member_setting_relation (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_member_setting_relation_updated_by ON member_setting_relation (updated_by) WHERE updated_by IS NOT NULL;

CREATE TABLE member_tier (
    id              BIGSERIAL    PRIMARY KEY,              -- surrogate PK
    system_file_id BIGINT       REFERENCES system_file(id) ON DELETE RESTRICT, -- tier badge or thumbnail (purpose: member_tier_badge)
    parent_id       BIGINT       REFERENCES member_tier(id) ON DELETE RESTRICT, -- parent tier in hierarchy
    tree_path       LTREE        NOT NULL,                 -- LTREE path for subtree queries
    sort_order      INTEGER      NOT NULL DEFAULT 0,       -- sibling display order
    is_default      BOOLEAN      NOT NULL DEFAULT FALSE,   -- fallback tier when none assigned
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,    -- whether tier is selectable
    purchase_start  NUMERIC(15,4) NOT NULL DEFAULT 0,       -- default min purchase amount threshold
    purchase_end    NUMERIC(15,4) NOT NULL DEFAULT 0,       -- default max purchase amount threshold
    discount        NUMERIC(15,4) NOT NULL DEFAULT 0,       -- default discount value
    discount_type   discount_unit NOT NULL DEFAULT 'percent', -- default discount unit
    type            member_tier_relation_type NOT NULL DEFAULT 'all', -- default product scope
    is_promotion    BOOLEAN      NOT NULL DEFAULT FALSE,   -- default: count promotional products
    deleted_at      TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by  BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_member_tier_tree_path ON member_tier USING GIST (tree_path);
CREATE UNIQUE INDEX uq_member_tier_tree_path
    ON member_tier (tree_path)
    WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_member_tier_one_default
    ON member_tier ((TRUE))
    WHERE deleted_at IS NULL AND is_default = TRUE;
CREATE INDEX idx_member_tier_parent_sort
    ON member_tier (parent_id, sort_order)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_member_tier_active_sort ON member_tier (sort_order) WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX idx_member_tier_file        ON member_tier (system_file_id) WHERE system_file_id IS NOT NULL;
CREATE INDEX idx_member_tier_created_by  ON member_tier (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_member_tier_updated_by  ON member_tier (updated_by) WHERE updated_by IS NOT NULL;

CREATE TABLE member_tier_language (
    member_tier_id  BIGINT       NOT NULL REFERENCES member_tier(id) ON DELETE CASCADE, -- parent tier
    locale          VARCHAR(10)  NOT NULL REFERENCES system_language(locale) ON DELETE RESTRICT, -- translation locale
    name            VARCHAR(255) NOT NULL,                -- tier display name
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (member_tier_id, locale),
    CONSTRAINT uq_member_tier_language_locale UNIQUE (member_tier_id, locale)
);

CREATE INDEX idx_member_tier_language_locale ON member_tier_language (locale);

CREATE TABLE member_tier_attribute (
    member_tier_id        BIGINT NOT NULL REFERENCES member_tier(id)         ON DELETE CASCADE, -- tier default rule
    product_attribute_id  BIGINT NOT NULL REFERENCES product_attribute(id)  ON DELETE CASCADE, -- brand or category attribute
    PRIMARY KEY (member_tier_id, product_attribute_id)
);

CREATE INDEX idx_member_tier_attribute_attr ON member_tier_attribute (product_attribute_id);

CREATE TABLE member_tier_relation (
    id                         BIGSERIAL                      PRIMARY KEY,              -- surrogate PK
    member_tier_id             BIGINT                         NOT NULL REFERENCES member_tier(id)             ON DELETE CASCADE, -- owning tier
    member_setting_relation_id BIGINT                         NOT NULL REFERENCES member_setting_relation(id) ON DELETE RESTRICT, -- profile combo this rule applies to
    purchase_start             NUMERIC(15,4)                  NOT NULL DEFAULT 0,       -- min purchase amount threshold
    purchase_end               NUMERIC(15,4)                  NOT NULL DEFAULT 0,       -- max purchase amount threshold
    discount                   NUMERIC(15,4)                  NOT NULL DEFAULT 0,       -- discount value
    discount_type              discount_unit NOT NULL DEFAULT 'percent', -- percent or fixed baht
    type                       member_tier_relation_type      NOT NULL DEFAULT 'all',   -- product scope (all, brand, category, etc.)
    is_promotion               BOOLEAN                        NOT NULL DEFAULT FALSE,   -- skip promotion stacking when true
    deleted_at                 TIMESTAMPTZ,
    created_at                 TIMESTAMPTZ                    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                 TIMESTAMPTZ                    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                 BIGINT                         REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by                 BIGINT                         REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_member_tier_relation_tier_combo
    ON member_tier_relation (member_tier_id, member_setting_relation_id)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_member_tier_relation_tier       ON member_tier_relation (member_tier_id)             WHERE deleted_at IS NULL;
CREATE INDEX idx_member_tier_relation_setting    ON member_tier_relation (member_setting_relation_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_member_tier_relation_created_by ON member_tier_relation (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_member_tier_relation_updated_by ON member_tier_relation (updated_by) WHERE updated_by IS NOT NULL;

CREATE TABLE member_tier_relation_attribute (
    member_tier_relation_id  BIGINT NOT NULL REFERENCES member_tier_relation(id)  ON DELETE CASCADE, -- tier relation rule
    product_attribute_id     BIGINT NOT NULL REFERENCES product_attribute(id)     ON DELETE CASCADE, -- brand or category attribute
    PRIMARY KEY (member_tier_relation_id, product_attribute_id)
);

CREATE INDEX idx_member_tier_relation_attribute_attr ON member_tier_relation_attribute (product_attribute_id);


CREATE TABLE member_user (
    id                      BIGSERIAL            PRIMARY KEY,              -- surrogate PK
    sku                     VARCHAR(100),                                   -- optional member code
    member_tier_id          BIGINT               REFERENCES member_tier(id) ON DELETE SET NULL, -- assigned pricing tier
    type                    member_user_type     NOT NULL DEFAULT 'person', -- person or company/entity
    setting_prefix_id       BIGINT               REFERENCES setting_prefix(id) ON DELETE SET NULL, -- name or title prefix
    name                    VARCHAR(255)         NOT NULL,                 -- member display name
    store_name              VARCHAR(255),                                   -- trade name for legal entities
    tax_number              VARCHAR(50),                                    -- tax ID
    branch                  entity_branch,                                    -- HQ vs branch
    branch_name             VARCHAR(255),                                   -- branch label when type is branch
    tel                     VARCHAR(50),                                    -- contact phone
    email                   VARCHAR(255),                                   -- contact email
    address                 TEXT,                                           -- primary street address
    website_province_id     BIGINT               REFERENCES system_province(id) ON DELETE SET NULL, -- province FK
    website_district_id     BIGINT               REFERENCES system_district(id) ON DELETE SET NULL, -- district FK
    website_sub_district_id BIGINT               REFERENCES system_sub_district(id) ON DELETE SET NULL, -- sub-district FK
    postcode                VARCHAR(20),                                    -- primary postal code
    system_file_id         BIGINT               REFERENCES system_file(id) ON DELETE RESTRICT, -- profile or avatar (purpose: member_avatar)
    note                    TEXT,                                           -- free-form admin notes
    is_active               BOOLEAN              NOT NULL DEFAULT TRUE,   -- whether member account is active
    deleted_at              TIMESTAMPTZ,
    created_at              TIMESTAMPTZ          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMPTZ          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by              BIGINT               REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by              BIGINT               REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_member_user_sku          ON member_user (sku) WHERE sku IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_member_user_tier               ON member_user (member_tier_id) WHERE member_tier_id IS NOT NULL;
CREATE INDEX idx_member_user_setting_prefix     ON member_user (setting_prefix_id) WHERE setting_prefix_id IS NOT NULL;
CREATE INDEX idx_member_user_type_active        ON member_user (type, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_member_user_file               ON member_user (system_file_id) WHERE system_file_id IS NOT NULL;
CREATE INDEX idx_member_user_province           ON member_user (website_province_id) WHERE website_province_id IS NOT NULL;
CREATE INDEX idx_member_user_district           ON member_user (website_district_id) WHERE website_district_id IS NOT NULL;
CREATE INDEX idx_member_user_sub_district       ON member_user (website_sub_district_id) WHERE website_sub_district_id IS NOT NULL;
CREATE INDEX idx_member_user_created_by         ON member_user (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_member_user_updated_by         ON member_user (updated_by) WHERE updated_by IS NOT NULL;


CREATE TABLE member_address (
    id                       BIGSERIAL             PRIMARY KEY,              -- surrogate PK
    member_user_id           BIGINT                NOT NULL REFERENCES member_user(id)    ON DELETE CASCADE, -- owning member
    type                     member_address_type   NOT NULL,                 -- tax, doc, or financial address
    member_type              member_user_type      NOT NULL DEFAULT 'person', -- person or company on this address
    setting_prefix_id        BIGINT                REFERENCES setting_prefix(id) ON DELETE SET NULL, -- name prefix on this address
    name                     VARCHAR(255),                                    -- contact or entity name
    store_name               VARCHAR(255),                                    -- trade name on this address
    tax_number               VARCHAR(50),                                     -- tax ID for this address
    branch                   entity_branch,                                     -- HQ vs branch
    branch_name              VARCHAR(255),                                    -- branch label
    address                  TEXT,                                            -- street address text
    website_province_id      BIGINT                REFERENCES system_province(id) ON DELETE SET NULL, -- province FK
    website_district_id      BIGINT                REFERENCES system_district(id) ON DELETE SET NULL, -- district FK
    website_sub_district_id  BIGINT                REFERENCES system_sub_district(id) ON DELETE SET NULL, -- sub-district FK
    postcode                 VARCHAR(20),                                     -- postal code
    tel                      VARCHAR(50),                                     -- phone on this address
    email                    VARCHAR(255),                                    -- email on this address
    credit_limit             NUMERIC(15,4),                                   -- credit ceiling for financial address
    credit_date              INTEGER,                                         -- credit term in days
    relationship             VARCHAR(255),                                    -- relationship to account holder
    is_same_information      BOOLEAN               NOT NULL DEFAULT FALSE,   -- copy from member primary info
    deleted_at               TIMESTAMPTZ,
    created_at               TIMESTAMPTZ           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at               TIMESTAMPTZ           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by               BIGINT                REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by               BIGINT                REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_member_address_user          ON member_address (member_user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_member_address_type          ON member_address (member_user_id, type) WHERE deleted_at IS NULL;
CREATE INDEX idx_member_address_member_type   ON member_address (member_user_id, member_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_member_address_prefix        ON member_address (setting_prefix_id) WHERE setting_prefix_id IS NOT NULL;
CREATE INDEX idx_member_address_province      ON member_address (website_province_id) WHERE website_province_id IS NOT NULL;
CREATE INDEX idx_member_address_district      ON member_address (website_district_id) WHERE website_district_id IS NOT NULL;
CREATE INDEX idx_member_address_sub_district  ON member_address (website_sub_district_id) WHERE website_sub_district_id IS NOT NULL;
CREATE INDEX idx_member_address_created_by    ON member_address (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_member_address_updated_by    ON member_address (updated_by) WHERE updated_by IS NOT NULL;

CREATE TABLE member_user_setting (
    member_user_id               BIGINT NOT NULL REFERENCES member_user(id)              ON DELETE CASCADE, -- member
    member_setting_relation_id   BIGINT NOT NULL REFERENCES member_setting_relation(id) ON DELETE RESTRICT, -- profile combo
    PRIMARY KEY (member_user_id, member_setting_relation_id)
);

CREATE INDEX idx_member_user_setting_relation ON member_user_setting (member_setting_relation_id);

CREATE TABLE member_user_owner (
    member_user_id  BIGINT NOT NULL REFERENCES member_user(id) ON DELETE CASCADE, -- member account
    admin_user_id   BIGINT NOT NULL REFERENCES admin_user(id)  ON DELETE CASCADE, -- managing admin user
    PRIMARY KEY (member_user_id, admin_user_id)
);

CREATE INDEX idx_member_user_owner_admin ON member_user_owner (admin_user_id);

CREATE TABLE member_file (
    id              BIGSERIAL    PRIMARY KEY,              -- surrogate PK
    member_user_id  BIGINT       NOT NULL REFERENCES member_user(id)  ON DELETE CASCADE, -- owning member
    system_file_id BIGINT       NOT NULL REFERENCES system_file(id)   ON DELETE RESTRICT, -- stored file reference
    sort_order      INTEGER      NOT NULL DEFAULT 0,       -- document display order
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by      BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by      BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_member_file_user_file
    ON member_file (member_user_id, system_file_id)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_member_file_user_sort
    ON member_file (member_user_id, sort_order)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_member_file_file        ON member_file (system_file_id);
CREATE INDEX idx_member_file_created_by  ON member_file (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_member_file_updated_by  ON member_file (updated_by) WHERE updated_by IS NOT NULL;

CREATE TABLE member_discount (
    id              BIGSERIAL            PRIMARY KEY,              -- surrogate PK
    member_user_id  BIGINT               NOT NULL REFERENCES member_user(id)            ON DELETE CASCADE, -- member receiving discount
    member_credit_id BIGINT              REFERENCES member_setting_credit(id) ON DELETE SET NULL, -- credit type context (optional)
    product_item_id BIGINT              NOT NULL REFERENCES product_item(id)    ON DELETE RESTRICT, -- SKU or product item
    minimum_qty     NUMERIC(15,4)        NOT NULL DEFAULT 0,       -- min quantity to apply
    discount        NUMERIC(15,4)        NOT NULL DEFAULT 0,       -- discount value
    discount_type   discount_unit NOT NULL DEFAULT 'percent', -- percent or fixed baht
    date_start      DATE,                                           -- valid-from date
    date_end        DATE,                                           -- valid-until date
    is_active       BOOLEAN              NOT NULL DEFAULT TRUE,   -- whether rule is enforced
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by      BIGINT               REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by      BIGINT               REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_member_discount_user_credit_item
    ON member_discount (member_user_id, member_credit_id, product_item_id)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_member_discount_user        ON member_discount (member_user_id)   WHERE deleted_at IS NULL;
CREATE INDEX idx_member_discount_credit      ON member_discount (member_credit_id) WHERE member_credit_id IS NOT NULL;
CREATE INDEX idx_member_discount_item        ON member_discount (product_item_id)  WHERE deleted_at IS NULL;
CREATE INDEX idx_member_discount_date_end    ON member_discount (date_end)        WHERE date_end IS NOT NULL;
CREATE INDEX idx_member_discount_created_by  ON member_discount (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_member_discount_updated_by  ON member_discount (updated_by) WHERE updated_by IS NOT NULL;

CREATE TABLE member_history (
    id             BIGSERIAL    PRIMARY KEY,              -- surrogate PK
    member_user_id BIGINT       NOT NULL REFERENCES member_user(id) ON DELETE CASCADE, -- member this event belongs to
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by     BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL -- admin who recorded the event
);

CREATE INDEX idx_member_history_user ON member_history (member_user_id, created_at DESC);

CREATE TABLE member_history_language (
    member_history_id  BIGINT       NOT NULL REFERENCES member_history(id) ON DELETE CASCADE, -- parent history entry
    locale             VARCHAR(10)  NOT NULL REFERENCES system_language(locale) ON DELETE RESTRICT, -- translation locale
    title              VARCHAR(255) NOT NULL DEFAULT '',                -- event title
    description        TEXT         NOT NULL DEFAULT '',                -- event detail text
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (member_history_id, locale),
    CONSTRAINT uq_member_history_language_locale UNIQUE (member_history_id, locale)
);

CREATE INDEX idx_member_history_language_locale ON member_history_language (locale);

-- ponytail: dev seed 10 may reference relation ids before member wave; clear orphans before FK
UPDATE setting_sale_channel
SET member_setting_relation_id = NULL
WHERE member_setting_relation_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM member_setting_relation r
    WHERE r.id = setting_sale_channel.member_setting_relation_id AND r.deleted_at IS NULL
  );

ALTER TABLE setting_sale_channel
  ADD CONSTRAINT fk_setting_sale_channel_member_setting_relation
  FOREIGN KEY (member_setting_relation_id) REFERENCES member_setting_relation(id) ON DELETE SET NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE setting_sale_channel DROP CONSTRAINT IF EXISTS fk_setting_sale_channel_member_setting_relation;
DROP TABLE IF EXISTS member_history_language CASCADE;
DROP TABLE IF EXISTS member_history CASCADE;
DROP TABLE IF EXISTS member_discount CASCADE;
DROP TABLE IF EXISTS member_file CASCADE;
DROP TABLE IF EXISTS member_user_owner CASCADE;
DROP TABLE IF EXISTS member_user_setting CASCADE;
DROP TABLE IF EXISTS member_address CASCADE;
DROP TABLE IF EXISTS member_user CASCADE;
DROP TABLE IF EXISTS member_tier_relation_attribute CASCADE;
DROP TABLE IF EXISTS member_tier_relation CASCADE;
DROP TABLE IF EXISTS member_tier_attribute CASCADE;
DROP TABLE IF EXISTS member_tier_language CASCADE;
DROP TABLE IF EXISTS member_tier CASCADE;
DROP TABLE IF EXISTS member_setting_relation CASCADE;
DROP TABLE IF EXISTS member_setting_business_language CASCADE;
DROP TABLE IF EXISTS member_setting_business CASCADE;
DROP TABLE IF EXISTS member_setting_group_language CASCADE;
DROP TABLE IF EXISTS member_setting_group CASCADE;
DROP TABLE IF EXISTS member_setting_credit_language CASCADE;
DROP TABLE IF EXISTS member_setting_credit CASCADE;
DROP TYPE IF EXISTS member_address_type;
-- +goose StatementEnd
