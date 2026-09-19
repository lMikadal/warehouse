-- source: v1 member_member_addresses + v2 v2_member_member_addresses (UUID→BIGSERIAL)
--   - type: tax | doc | financial (v1 naming; v2 also had 'information' type — absorbed into member_user.name/tel/email)
--   - member_type: person | company per address row (reuses member_user_type)
--   - website_province_id / website_district_id / website_sub_district_id: FK to website_* geo tables
--   - credit_limit, credit_date, relationship: financial address fields
--   - setting_prefix_id: FK to setting_prefix (replaces member_address_prefix enum)
CREATE TYPE member_address_type AS ENUM ('tax', 'doc', 'financial');

CREATE TABLE member_user_address (
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

CREATE INDEX idx_member_user_address_user          ON member_user_address (member_user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_member_user_address_type          ON member_user_address (member_user_id, type) WHERE deleted_at IS NULL;
CREATE INDEX idx_member_user_address_member_type   ON member_user_address (member_user_id, member_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_member_user_address_prefix        ON member_user_address (setting_prefix_id) WHERE setting_prefix_id IS NOT NULL;
CREATE INDEX idx_member_user_address_province      ON member_user_address (website_province_id) WHERE website_province_id IS NOT NULL;
CREATE INDEX idx_member_user_address_district      ON member_user_address (website_district_id) WHERE website_district_id IS NOT NULL;
CREATE INDEX idx_member_user_address_sub_district  ON member_user_address (website_sub_district_id) WHERE website_sub_district_id IS NOT NULL;
CREATE INDEX idx_member_user_address_created_by    ON member_user_address (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_member_user_address_updated_by    ON member_user_address (updated_by) WHERE updated_by IS NOT NULL;
