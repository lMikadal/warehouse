-- source: v1 setting_vat + v2 v2_setting_vat (UUID→BIGSERIAL)
--   - restored: vat_type (exclude|include) — v2 dropped it; needed for purchase-order total computation
--   - renamed:  order_vat → rate, order_vat_type → vat_type (dropped "order_" prefix on a settings table)
CREATE TYPE setting_vat_type AS ENUM ('exclude', 'include');

CREATE TABLE setting_vat (
    id          BIGSERIAL        PRIMARY KEY,              -- surrogate PK
    vat_type    setting_vat_type NOT NULL DEFAULT 'exclude', -- price includes VAT or not
    rate        NUMERIC(5,2)     NOT NULL DEFAULT 0,       -- VAT percentage e.g. 7.00
    is_active   BOOLEAN          NOT NULL DEFAULT TRUE,
    deleted_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  BIGINT           REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by  BIGINT           REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_setting_vat_active    ON setting_vat (created_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_setting_vat_created_by ON setting_vat (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_setting_vat_updated_by ON setting_vat (updated_by) WHERE updated_by IS NOT NULL;
