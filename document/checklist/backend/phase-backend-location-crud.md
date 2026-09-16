# Phase: Location CRUD (backend)

Goose schema + `/api/v1/location/locations` for sidebar **สถานที่ → รายการ** and dynamic nav labels.

## Phase checklist

- [x] Migration `20260918120000_location_module.sql` from `design/schema/location_*.sql`
- [x] Dev seed `dev/12_location_location.sql` (3 demo rows + languages)
- [x] Module `internal/module/location` — list/get/create/patch/delete/reorder
- [x] Register `/location` on RBAC group in `cmd/server/main.go`
- [x] `CatalogPermPages` entry for `location.location_location.*`
- [x] Postman folder **Location** in `document/postman/postman.json`

## Required checklist

- [x] List: `page`, `limit`, `search`, `is_active`, column sort; default `sort_order → created_at → id`
- [x] Partial `PATCH` with `{ "is_active" }` and th/en `names`
- [x] `PATCH /locations/reorder` → 204
- [x] Soft delete
- [x] `make backend-test` (location + rbac)
- [ ] Manual: migrate + `make backend-seed-dev` on local DB; CRUD as superadmin via Postman
