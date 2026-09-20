package product

// Storefront display price SQL (active setting_vat axis + optional stock lot sell_price).
// Used by product item browse and member user discount product_items filter.

const DisplayPriceVatJoin = `
LEFT JOIN LATERAL (
  SELECT v.vat_type
  FROM setting_vat v
  WHERE v.deleted_at IS NULL AND v.is_active = TRUE
  ORDER BY v.id ASC
  LIMIT 1
) vat ON TRUE`

const DisplayPriceManualSellSQL = `(CASE WHEN vat.vat_type = 'include' THEN i.price_vat ELSE i.price END)`

const DisplayPriceStockLotJoin = `
LEFT JOIN LATERAL (
  SELECT s.sell_price::float8 AS sell_price
  FROM product_item_stock s
  WHERE s.product_item_id = i.id AND s.deleted_at IS NULL AND s.is_used = TRUE
  ORDER BY s.received_at ASC NULLS LAST, s.id ASC
  LIMIT 1
) stock_px ON TRUE`

// DisplayPriceSellSQL is the unit sell price shown in browse lists and member discount "regular price".
var DisplayPriceSellSQL = `(CASE WHEN i.type_price = 'stock'::product_item_type_price THEN COALESCE(stock_px.sell_price, ` + DisplayPriceManualSellSQL + `) ELSE ` + DisplayPriceManualSellSQL + ` END)`
