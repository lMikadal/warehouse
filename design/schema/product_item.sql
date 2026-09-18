-- source: v1 product_items + v2 v2_product_product_items (UUID→BIGSERIAL)
--   - restored: barcode, qrcode, weight/width/length/height (dimensions), minimum_stock, old_product_item_id, is_stopped, is_new
--   - restored: qty_per_unit (v2 has amount_per_unit — renamed for clarity)
--   - restored: is_fake (v1 product_items.is_fake — genuine vs compatible/fake)
--   - removed:  suffix_sku (design-time clutter)
--   - restored: promotion (v1 condition_promotion)
--   - type_price: manual | stock (v2 manual_price/last_price logic; shorter enum names)
--     manual = product_item.price; stock = product_item_stock.sell_price from oldest lot
--   - price/price_wholesale simplified to base prices; per-channel overrides in product_item_price (separate from type_price)
--   - gallery images: product_item_file (replaces v1 image_cover_url + image_url[])
CREATE TYPE product_unit           AS ENUM ('piece', 'box', 'set', 'roll', 'pair', 'bag', 'sheet', 'meter', 'liter', 'kg');
CREATE TYPE product_item_type_price AS ENUM ('manual', 'stock');

CREATE TABLE product_item (
    id                    BIGSERIAL               PRIMARY KEY,              -- surrogate PK
    product_list_id       BIGINT                  NOT NULL REFERENCES product_list(id) ON DELETE RESTRICT, -- parent product
    sku                   VARCHAR(255),                                    -- variant SKU (optional)
    barcode               VARCHAR(255),                                    -- scannable barcode
    qrcode                VARCHAR(255),                                    -- QR code value
    price                 NUMERIC(15,4)           NOT NULL DEFAULT 0,            -- ex-VAT base sell price
    price_wholesale       NUMERIC(15,4)           NOT NULL DEFAULT 0,            -- ex-VAT wholesale price
    vat_rate              NUMERIC(5,2)            NOT NULL DEFAULT 0,            -- VAT rate snapshot from setting_vat.rate at save time
    promotion             TEXT                    NOT NULL DEFAULT '',           -- promotion conditions (v1 condition_promotion)
    type_price            product_item_type_price NOT NULL DEFAULT 'manual', -- manual=set on item; stock=from first stock lot sell_price
    unit                  product_unit            NOT NULL DEFAULT 'piece',    -- sale unit of measure
    qty_per_unit          INTEGER                 NOT NULL DEFAULT 1,            -- pieces per sale unit
    weight                NUMERIC(15,4),           -- kg
    width                 NUMERIC(15,4),           -- cm
    length                NUMERIC(15,4),           -- cm
    height                NUMERIC(15,4),           -- cm
    minimum_stock         INTEGER                 NOT NULL DEFAULT 0,            -- reorder threshold
    old_product_item_id   BIGINT                  REFERENCES product_item(id) ON DELETE SET NULL,  -- alternate-SKU clone source variant
    is_new                BOOLEAN                 NOT NULL DEFAULT FALSE,        -- highlight as new variant (browse badge / filter)
    is_stopped            BOOLEAN                 NOT NULL DEFAULT FALSE,        -- stop selling this variant
    is_fake               BOOLEAN                 NOT NULL DEFAULT FALSE,        -- FALSE=genuine, TRUE=compatible/fake
    is_active             BOOLEAN                 NOT NULL DEFAULT TRUE,         -- sellable when TRUE
    deleted_at            TIMESTAMPTZ,
    created_at            TIMESTAMPTZ             NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ             NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by            BIGINT                  REFERENCES admin_user(id) ON DELETE SET NULL,
    updated_by            BIGINT                  REFERENCES admin_user(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_product_item_sku         ON product_item (sku) WHERE sku IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_product_item_product           ON product_item (product_list_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_product_item_old_item          ON product_item (old_product_item_id) WHERE old_product_item_id IS NOT NULL;
CREATE INDEX idx_product_item_is_new            ON product_item (is_new) WHERE is_new = TRUE AND deleted_at IS NULL;
CREATE INDEX idx_product_item_stopped           ON product_item (is_stopped) WHERE is_stopped = TRUE AND deleted_at IS NULL;
CREATE INDEX idx_product_item_created_by        ON product_item (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_product_item_updated_by        ON product_item (updated_by) WHERE updated_by IS NOT NULL;
