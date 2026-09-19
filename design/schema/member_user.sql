-- source: v1 member_members + v2 v2_member_members (UUID→BIGSERIAL; renamed member_member → member_user)
--   - restored: name, tel, email on the user row itself (v2 migration 216 moved them to address type='information')
--     rationale: listing customers should not require an address JOIN
--   - member_tier_id: FK to the assigned tier (optional)
--   - type: person (natural person) or company (legal entity)
--   - setting_prefix_id, store_name, tax_number: identity basics (prefix lookup in setting module)
--   - address + geo: primary address on user row (list/display without JOIN member_user_address)
--   - branch / branch_name: HQ vs branch distinction (v1 added in 183)
--   - image_url → system_file_id (purpose: member_avatar); documents stay in member_user_file

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
