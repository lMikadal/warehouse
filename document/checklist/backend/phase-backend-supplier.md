# Phase: Backend supplier module

## Phase checklist

- [x] Goose migration `supplier_user`, `supplier_information`, `supplier_contact`, `supplier_bank`
- [x] Module `internal/module/supplier` (list, aggregate get, create, patch, delete, nested contacts/banks)
- [x] Register `/api/v1/supplier/users` in `cmd/server/main.go` + `CatalogPermPages`
- [x] Dev seed `seeds/dev/11_supplier_demo.sql` (+ staff supplier permissions)
- [x] Postman `Supplier` folder in `document/postman/postman.json`

## Required checklist

- [x] `make backend-test` — package `supplier`
- [x] List supports `page`, `limit`, `search`, `is_active`, optional `sort`/`order`
- [x] Soft delete cascades contacts/banks; hard-delete `supplier_information`
- [x] `document/knowledge/backend.md` updated
