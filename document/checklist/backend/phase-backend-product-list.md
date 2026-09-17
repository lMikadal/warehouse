# Phase: Product list API

Backend for **product_list** / **product_item** browse and aggregate saves.

## Phase checklist

- [x] `GET /product/items` browse + aggregates (stock, warehouses, cars)
- [x] `PATCH` / `DELETE /product/items/:id` (+ full item body on PATCH)
- [x] Modal helpers: warehouse placements, list cars
- [x] `GET/POST/PATCH/DELETE /product/lists` aggregate
- [x] History stub: `GET …/history/purchase` · `…/history/sales`
- [x] Unit tests (`list_validation_test.go`, item/list repos)
- [x] Postman **Product → Items (browse)** + **Lists (aggregate)**

## Required checklist

- [x] RBAC catalog prefix `/api/v1/product/lists` and `/api/v1/product/items`
- [x] Bin-only placements + one-bin-one-item validation
- [x] SKU uniqueness on save
- [x] VAT snapshot from `setting_vat` on list save
- [x] [`inventory-crud-mutation-apis.md`](inventory-crud-mutation-apis.md) ticks for `product_list` / `product_item`
- [ ] Integration smoke against dev DB (`14_product_demo.sql`)
