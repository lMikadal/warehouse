-- source: v1 supplier_contacts (v2 had no equivalent — gap restored)
CREATE TABLE supplier_contact (
    id                    BIGSERIAL    PRIMARY KEY,              -- surrogate PK
    supplier_user_id      BIGINT       NOT NULL REFERENCES supplier_user(id) ON DELETE CASCADE, -- owning supplier
    name                  VARCHAR(255) NOT NULL,                 -- contact person name
    email                 VARCHAR(255),                          -- contact email
    tel                   VARCHAR(50),                           -- contact phone
    position              VARCHAR(255),                          -- job title or role
    sort_order            INTEGER      NOT NULL DEFAULT 100,     -- display order among contacts
    deleted_at            TIMESTAMPTZ,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by            BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by            BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_supplier_contact_supplier  ON supplier_contact (supplier_user_id, sort_order) WHERE deleted_at IS NULL;
CREATE INDEX idx_supplier_contact_created_by ON supplier_contact (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_supplier_contact_updated_by ON supplier_contact (updated_by) WHERE updated_by IS NOT NULL;
