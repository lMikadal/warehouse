-- source: v1 supplier_suppliers + v2 v2_supplier_suppliers (UUID→BIGSERIAL)
--   - restored: credit_term, credit_term_note (v2 dropped — needed for purchase-order payment terms)
CREATE TABLE supplier_user (
    id                BIGSERIAL    PRIMARY KEY,              -- surrogate PK
    sku               VARCHAR(255) NOT NULL,                 -- supplier code
    credit_term       INTEGER,                               -- payment days
    credit_term_note  TEXT,                                  -- notes on payment terms
    is_active         BOOLEAN      NOT NULL DEFAULT TRUE,   -- whether supplier is active
    deleted_at        TIMESTAMPTZ,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by        BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by        BIGINT       REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_supplier_user_sku   ON supplier_user (sku) WHERE deleted_at IS NULL;
CREATE INDEX idx_supplier_user_active      ON supplier_user (is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_supplier_user_created_by  ON supplier_user (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_supplier_user_updated_by  ON supplier_user (updated_by) WHERE updated_by IS NOT NULL;
