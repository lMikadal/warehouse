# Phase: Product list API

Backend for **product_list** / **product_item** browse and aggregate saves.

## Phase checklist

- [x] `GET /product/items` browse + aggregates (stock, warehouses, cars)
- [x] `PATCH` / `DELETE /product/items/:id` (+ full item body on PATCH)
- [x] Modal helpers: warehouse placements (`placement_id`, `bin_id`), list cars, item stock lots (`GET/POST/PATCH/DELETE …/items/:id/stocks`; create requires existing placement + rejects alternate SKU; `po_sku` on create; single `is_used` lot per `product_item`)
- [x] `GET/POST/PATCH/DELETE /product/lists` aggregate
- [x] History: `GET /product/items/:id/history/purchase|sales` + `GET /product/lists/:id/history/purchase|sales` (grouped day/month/year from stock / store-sales)
- [x] Unit tests (`list_validation_test.go`, item/list repos)
- [x] Postman **Product → Items (browse)** + **Lists (aggregate)**

## Required checklist

- [x] RBAC catalog prefix `/api/v1/product/lists` and `/api/v1/product/items`
- [x] Bin-only placements + one-bin-one-item validation
- [x] SKU uniqueness on save
- [x] VAT snapshot from `setting_vat` on list save (`vat_type`, `rate`, `price_vat`, `price_wholesale_vat` on `product_item`; `product_item_price` channel rows via `20260918210000_product_item_price_vat.sql`)
- [x] `amount_price_wholesale` on `product_item` (migration `20260920100000_product_item_amount_price_wholesale.sql`; aggregate `items[]` read/write)
- [x] [`inventory-crud-mutation-apis.md`](inventory-crud-mutation-apis.md) ticks for `product_list` / `product_item`
- [ ] Integration smoke against dev DB (`14_product_demo.sql`)
