-- source: v1 supplier_suppliers + v2 v2_supplier_suppliers (UUID→BIGSERIAL)
--   - restored: credit_term, credit_term_note (v2 dropped — needed for purchase-order payment terms)
CREATE TABLE supplier_supplier (
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

CREATE UNIQUE INDEX uq_supplier_supplier_sku   ON supplier_supplier (sku) WHERE deleted_at IS NULL;
CREATE INDEX idx_supplier_supplier_active      ON supplier_supplier (is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_supplier_supplier_created_by  ON supplier_supplier (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_supplier_supplier_updated_by  ON supplier_supplier (updated_by) WHERE updated_by IS NOT NULL;
