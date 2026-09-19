# Phase: Order compare (catalog special price)

## Phase checklist

- [x] Goose migration `discount_rule` from `design/schema/discount_rule.sql`
- [x] Module `internal/module/order` — `/api/v1/order/compares` (tree, rules, export, import)
- [x] `CatalogPermPages` + `perm_catalog_test` cases
- [x] Postman **Order → Compare (special price)**
- [x] `document/knowledge/backend.md` module note

## Required checklist

- [x] RBAC catalog `order.order_compare` — **view + update** only (205/207); POST `/import` → `.update`
- [x] No seed data in migration (schema only)
- [ ] Manual smoke after `make backend-migrate-up` with dev product + member seeds
