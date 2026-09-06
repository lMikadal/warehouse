-- source: v1 supplier_addresses (v2 had no equivalent — gap restored; required for PO billing/shipping)
--   - renamed: supplier_address → supplier_information; type main/invoice/address → information/tax_invoice/delivery
--   - PK: (supplier_supplier_id, type) — one row per type per supplier
--   - website_province/district/sub_district: FK to website_* geo tables
--   - setting_prefix_id: FK to setting_prefix (replaces supplier_address_prefix enum)
CREATE TYPE supplier_information_type   AS ENUM ('information', 'tax_invoice', 'delivery');
CREATE TYPE supplier_information_branch AS ENUM ('headquarter', 'branch');

CREATE TABLE supplier_information (
    supplier_supplier_id     BIGINT                      NOT NULL REFERENCES supplier_supplier(id) ON DELETE CASCADE, -- owning supplier
    type                     supplier_information_type   NOT NULL,                 -- information, tax_invoice, or delivery
    setting_prefix_id        BIGINT                      REFERENCES setting_prefix(id) ON DELETE SET NULL, -- entity prefix
    name                     VARCHAR(255),                                         -- entity or contact name
    branch                   supplier_information_branch,                          -- HQ vs branch
    branch_name              VARCHAR(255),                                         -- branch label
    tax_number               VARCHAR(50),                                          -- tax ID
    address                  TEXT,                                                 -- street address text
    website_province_id      BIGINT                      REFERENCES website_province(id) ON DELETE SET NULL, -- province FK
    website_district_id      BIGINT                      REFERENCES website_district(id) ON DELETE SET NULL, -- district FK
    website_sub_district_id  BIGINT                      REFERENCES website_sub_district(id) ON DELETE SET NULL, -- sub-district FK
    postcode                 VARCHAR(20),                                          -- postal code
    tel                      VARCHAR(50),                                           -- phone
    email                    VARCHAR(255),                                         -- email
    is_same_information      BOOLEAN                     NOT NULL DEFAULT FALSE,    -- tax_invoice copies information row
    PRIMARY KEY (supplier_supplier_id, type)
);

CREATE INDEX idx_supplier_information_supplier  ON supplier_information (supplier_supplier_id);
CREATE INDEX idx_supplier_information_prefix    ON supplier_information (setting_prefix_id) WHERE setting_prefix_id IS NOT NULL;
CREATE INDEX idx_supplier_information_province  ON supplier_information (website_province_id)     WHERE website_province_id IS NOT NULL;
CREATE INDEX idx_supplier_information_district  ON supplier_information (website_district_id)     WHERE website_district_id IS NOT NULL;
CREATE INDEX idx_supplier_information_sub       ON supplier_information (website_sub_district_id) WHERE website_sub_district_id IS NOT NULL;
