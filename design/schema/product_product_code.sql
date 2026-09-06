-- source: v1 product_product_code_factory + product_product_code_other merged + v2 v2_product_product_codes
--   - code_type: factory | other (replaces two separate tables)
--   - sku replaces "code" column name (v2 naming)
CREATE TYPE product_product_code_type AS ENUM ('factory', 'other');

CREATE TABLE product_product_code (
    id                  BIGSERIAL                   PRIMARY KEY,              -- surrogate PK
    product_product_id  BIGINT                      NOT NULL REFERENCES product_product(id) ON DELETE CASCADE, -- parent product
    code_type           product_product_code_type   NOT NULL,                 -- factory | other
    sku                 VARCHAR(255)                NOT NULL,                 -- alternate/supplier code
    deleted_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ                 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ                 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by          BIGINT                      REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by          BIGINT                      REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_product_product_code_product ON product_product_code (product_product_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_product_product_code_sku     ON product_product_code (sku) WHERE deleted_at IS NULL;
CREATE INDEX idx_product_product_code_created_by ON product_product_code (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_product_product_code_updated_by ON product_product_code (updated_by) WHERE updated_by IS NOT NULL;
