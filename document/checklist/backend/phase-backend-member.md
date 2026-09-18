# Phase: Backend member module

## Phase checklist

- [x] Goose migration `20260919100000_member_module.sql` (all `member_*` tables + `setting_sale_channel` FK)
- [x] Module `internal/module/member` (settings, relations, tiers, users + nested files/discounts/history)
- [x] Register `/api/v1/member/*` in `cmd/server/main.go`
- [x] Dev seed `seeds/dev/15_member_demo.sql`
- [x] Postman `Member` folder in `document/postman/postman.json`

## Required checklist

- [x] `make backend-test` — package `member`
- [x] Settings list: `page`, `limit`, `search`, `is_active`; th/en `names` on get/create/patch
- [x] Tier tree: list order, `PATCH /tiers/reorder`, `PATCH /tiers/move`, `is_default` exclusivity on patch
- [x] User aggregate get; list filters `business_id`, `member_tier_id`, `search`, `is_active`
- [x] History append-only (`POST` only)
- [x] `document/knowledge/backend.md` updated
