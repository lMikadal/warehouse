# Phase: Design schema consolidation

Consolidate 180 tables from v1 + v2 (`backend/internal/infra/postgres/migrations/`) into ~78 clean SQL files under `design/schema/`, using v1+v2 as reference and redesigning with v2 direction (BIGSERIAL, LTREE, generic tables) while restoring features and constraints that v2 dropped.

## Phase checklist

- [x] List all v1 and v2 tables per module (admin/website/setting/product/member/supplier/warehouse/order/purchase)
- [x] Decide merge strategy: redesign using v1+v2 as reference, v2 direction (BIGSERIAL, LTREE)
- [x] Decide naming: `{module}_{entity}` singular, no `v2_` prefix, flat files under `schema/`
- [x] Write website module (10 files): `language`, `file`, country+lang, province+lang, district+lang, sub_district+lang
- [x] Write admin module (9 files): user, session, role, role_language, permission, role_permission, menu, menu_language, menu_permission
- [x] Refactor admin_user: `is_superadmin` → `type` enum (`superadmin`|`owner`|`manager`|`staff`, default `staff`); drop `admin_audit_log`
- [x] Write setting module (10 files): vat, sale_channel+language, bank+language, payment_method+language, code, claim_reason+language
- [x] Write location module (2 files): location_location+language (moved from setting; v1 location_locations)
- [x] Write product module (13 files): attribute+language+relation, product+language+code+car+supplier, item+language+price+stock+stop_log
- [x] Write member module (15 files): setting+language+relation, tier+language+item+item_attribute, member+setting+owner+address+file+discount+history+history_language
- [x] Write supplier module (4 files): supplier, address, contact, bank
- [x] Write warehouse module (3 files): warehouse+language+condition; drop capacity_used; occupancy from product_item_stock
- [x] Write purchase module (10 files): request+item+item_reject, order+item+item_reject+payment+file, history+history_language
- [x] Write order module (8 files): order, item, shipping, payment+method+item, claim+item
- [x] Move claim_reason+language from order → setting module (`setting_claim_reason`)
- [x] Add `design/schema/check.sh` (bash+grep, no deps) with 5 convention rules
- [x] Add `make design-schema-check` target

## Required checklist

Must pass before this phase is done:

- [x] `make design-schema-check` exits 0 (84 files, all rules green)
- [x] Every `*_language.sql` has `locale` column + UNIQUE constraint + no `deleted_at`
- [x] Every base entity table has all 5 audit columns (created_at/updated_at/deleted_at/created_by/updated_by)
- [x] All `REFERENCES <table>` targets have a matching `.sql` file
- [x] `purchase` module exists (v2 had none; sourced from v1)
- [x] `supplier_address`, `supplier_contact`, `supplier_bank` restored (v2 had none)
- [x] Tree tables use `parent_id` + `tree_path` + `sort_order` (self-FK trees only)
- [x] Geo split: `website_*` chain uses typed parent FK + `sort_order` (no `tree_path`)
- [x] Every non-audit column in `design/schema/*.sql` has an inline `--` comment (English)
