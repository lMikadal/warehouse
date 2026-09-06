-- source: v1 supplier_banks (v2 had no equivalent — gap restored; needed for purchase-order payment)
CREATE TABLE supplier_bank (
    id                    BIGSERIAL    PRIMARY KEY,              -- surrogate PK
    supplier_supplier_id  BIGINT       NOT NULL REFERENCES supplier_supplier(id) ON DELETE CASCADE, -- owning supplier
    setting_bank_id       BIGINT       NOT NULL REFERENCES setting_bank(id)       ON DELETE RESTRICT, -- bank master reference
    name                  VARCHAR(255) NOT NULL,                 -- account holder name
    number                VARCHAR(100) NOT NULL,                 -- account number
    branch                VARCHAR(255),                          -- bank branch name
    is_active             BOOLEAN      NOT NULL DEFAULT TRUE,   -- whether account is usable
    is_default            BOOLEAN      NOT NULL DEFAULT FALSE,  -- preferred account for payments
    sort_order            INTEGER      NOT NULL DEFAULT 100,     -- display order among accounts
    deleted_at            TIMESTAMPTZ,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by            BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by            BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_supplier_bank_supplier     ON supplier_bank (supplier_supplier_id, sort_order) WHERE deleted_at IS NULL;
CREATE INDEX idx_supplier_bank_setting_bank ON supplier_bank (setting_bank_id);
CREATE INDEX idx_supplier_bank_created_by   ON supplier_bank (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_supplier_bank_updated_by   ON supplier_bank (updated_by) WHERE updated_by IS NOT NULL;
