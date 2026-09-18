-- source: v1 product_item_prices + v2 v2_product_product_item_prices
--   - price: ex-VAT unit price for this channel
--   - price_vat: incl-VAT unit price (snapshot at save, like product_item)
--   - vat_type: snapshot from setting_vat.vat_type at save time
--   - vat_rate: NUMERIC(5,2) snapshot of the VAT rate at price-setting time
--   - restored: created_at/updated_at (v2 dropped them)
CREATE TABLE product_item_price (
    product_item_id          BIGINT        NOT NULL REFERENCES product_item(id)          ON DELETE CASCADE, -- parent item
    setting_sale_channel_id  BIGINT        NOT NULL REFERENCES setting_sale_channel(id)  ON DELETE RESTRICT, -- sales channel
    price                    NUMERIC(15,4) NOT NULL DEFAULT 0, -- ex-VAT unit price for this channel
    price_vat                NUMERIC(15,4) NOT NULL DEFAULT 0, -- incl-VAT unit price for this channel
    vat_type                 setting_vat_type NOT NULL DEFAULT 'exclude', -- snapshot from setting_vat at save
    vat_rate                 NUMERIC(5,2)  NOT NULL DEFAULT 0,  -- VAT rate snapshot at price-setting time
    created_at               TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at               TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (product_item_id, setting_sale_channel_id)
);

CREATE INDEX idx_product_item_price_channel ON product_item_price (setting_sale_channel_id);
