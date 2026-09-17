# Phase: Product attribute APIs (category / brand / car)

Three REST resources over `product_attribute` — `/api/v1/product/categories`, `/brands`, `/cars`.

## Phase checklist

- [x] Shared `internal/module/product` repository (languages, category `brand_ids`, tree paths)
- [x] Routes registered on `/product` in `cmd/server/main.go`
- [x] Category `PATCH /move` + validation (depth, children)
- [x] Car `PATCH /move` + `validateCarParent` (brand/model/engine)
- [x] Brand/car `PATCH /reorder`
- [x] Postman folder **Product** in `document/postman/postman.json`
- [x] Unit tests for category and car parent validation

## Required checklist

- [x] `GET` list in tree DFS order; `page`/`limit` on flattened rows
- [x] `PATCH /:id` partial update including `is_active`
- [x] Soft delete + relation cleanup for brand/category
- [ ] Manual smoke with dev seed `14_product_demo.sql` after `make backend-seed-dev`
