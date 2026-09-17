# Phase: Warehouse list + management (backend)

Goose schema (warehouse + product tables for stock aggregates), `/api/v1/warehouse/lists`, dev seeds.

## Phase checklist

- [x] Migrations `20260918130000_warehouse_module.sql`, `20260918140000_product_module.sql`
- [x] Dev seeds `dev/13_warehouse_list.sql`, `dev/14_product_demo.sql` (generator: `backend/scripts/gen-warehouse-product-dev-seed.js`)
- [x] Module `internal/module/warehouse` — list/get/tree/stats/create/patch/delete/reorder/move/conditions
- [x] Register `/warehouse` on RBAC group in `cmd/server/main.go`
- [x] `CatalogPermPages` entry for `warehouse.warehouse_list.*`
- [x] Postman folder **Warehouse** in `document/postman/postman.json`

## Required checklist

- [x] List: `type`, `parent_id`, `root_id`, `search`, `is_active`, `include=stats`; warehouse roots default `type=warehouse`
- [x] `GET …/:id/tree` with capacity aggregates (product stock join on bins)
- [x] Partial `PATCH` + zone `PATCH …/:id/conditions`
- [x] `PATCH /lists/reorder` and `PATCH /lists/move` → 204
- [x] Soft delete blocked when bin has `remain_quantity > 0`
- [x] `make backend-test`
- [x] `make backend-migrate-up` + `make backend-seed-dev` on local DB

## Out of scope

- Product module HTTP APIs (schema + seed only)
