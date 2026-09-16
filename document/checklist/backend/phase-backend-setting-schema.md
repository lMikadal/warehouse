# Phase: Setting module schema + system_file

Goose schema for sidebar **ตั้งค่า** (7 leaves) and central upload metadata table. CRUD APIs are a follow-up phase.

## Phase checklist

- [x] Rename design `website_file` → `system_file` (+ `system_file_id` FKs)
- [x] MinIO in compose + `S3_*` env for backend
- [x] Goose: `20260317100000_system_file.sql`
- [x] Goose: `20260317110000_setting_module.sql` (deferred FK on `setting_sale_channel.member_setting_relation_id`)
- [x] Goose: `20260916100000_setting_vat_is_active.sql` (`setting_vat.is_active`)

## Required checklist

- [x] `make backend-migrate-up` applies on clean DB after prior waves
- [x] `make backend-test` passes
- [x] Setting CRUD handlers + Postman (CRUD wave)
- [x] Postgres seeds: init `09_setting_vat.sql`; dev `09_setting_vat.sql` + `10_setting_catalog.sql`

## Out of scope (this phase)

- Go upload API → MinIO
- Production frontend `/admin/setting/*` (see `phase-frontend-setting-crud.md`)
