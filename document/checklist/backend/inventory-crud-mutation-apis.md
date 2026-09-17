# Inventory: CRUD list mutation APIs

Per [`.cursor/rules/crud-mutations.mdc`](../../../.cursor/rules/crud-mutations.mdc). Mark `[x]` when the backend list module ships the required endpoints.

Legend: **active** = `?is_active=` + `PATCH { "is_active" }`; **reorder** = `PATCH /reorder`; **move** = `PATCH /move` (tree).

## A — Tables with `is_active`

| Table | API prefix (planned) | Mutations | Status | Notes |
|-------|----------------------|-----------|--------|-------|
| `system_menu` | `/system/menus` | active, move | [x] | RBAC wave |
| `system_permission` | `/system/permissions` | active only | [x] | Read-only list; `PATCH` body is `is_active` only |
| `admin_role` | `/admin/roles` | active | [x] | Partial `PATCH` with `{ "is_active" }` |
| `admin_user` | `/admin/users` | — | [x] | Uses **`status`** enum — `?status=` + `PATCH { "status" }`, not `is_active` |
| `admin_user_session` | — | — | — | Internal auth; no public toggle |
| `location_location` | `/location/locations` | active, reorder | [x] | Sidebar inject is frontend-only |
| `member_tier` | TBD | active, move | [ ] | Tree |
| `member_user` | TBD | active | [ ] | |
| `member_discount` | TBD | active | [ ] | |
| `member_setting_business` | TBD | active | [ ] | |
| `member_setting_credit` | TBD | active | [ ] | |
| `member_setting_group` | TBD | active | [ ] | |
| `member_setting_relation` | TBD | active | [ ] | |
| `product_list` | TBD | active | [ ] | No `sort_order` |
| `product_item` | TBD | active | [ ] | |
| `product_attribute` | `/product/categories`, `/brands`, `/cars` | active, reorder, move (categories + cars) | [x] | Three APIs; same table; type fixed per route |
| `supplier_user` | `/supplier/users` | active | [x] | No list `sort_order` |
| `supplier_bank` | TBD | active | [ ] | Reorder parent-scoped — see §D |
| `warehouse_list` | `/warehouse/lists` | active, move | [x] | Tree |
| `setting_bank` | `/setting/banks` | active, reorder | [x] | |
| `setting_code` | `/setting/codes` | active, reorder | [x] | |
| `setting_claim_reason` | `/setting/claim-reasons` | active, reorder | [x] | Extra switches `is_claim` / `is_return` on same row |
| `setting_payment_method` | `/setting/payment-methods` | active, reorder | [x] | Extra switches `is_sale` / `is_purchase` |
| `setting_prefix` | `/setting/prefixes` | active, reorder | [x] | Reorder scoped by `type` |
| `setting_sale_channel` | `/setting/sale-channels` | active, reorder | [x] | |
| `setting_vat` | `/setting/vat` | active only | [x] | Singleton; partial `PATCH` includes `is_active` (no list filter) |
| `system_country` | TBD | active, reorder | [x] | Geo root |
| `system_province` | TBD | active, reorder | [x] | Scope: `system_country_id` |
| `system_district` | TBD | active, reorder | [x] | Scope: `system_province_id` |
| `system_sub_district` | TBD | active, reorder | [x] | Scope: `system_district_id` |

## B — Top-level list `sort_order` (flat `/reorder`)

| Table | Reorder scope | Status | Notes |
|-------|---------------|--------|-------|
| `location_location` | global | [x] | |
| `setting_bank` | global | [x] | |
| `setting_code` | global | [x] | |
| `setting_claim_reason` | global | [x] | |
| `setting_payment_method` | global | [x] | |
| `setting_prefix` | per `type` | [x] | |
| `setting_sale_channel` | global | [x] | |
| `system_country` | global | [x] | |
| `system_province` | `system_country_id` | [x] | |
| `system_district` | `system_province_id` | [x] | |
| `system_sub_district` | `system_district_id` | [x] | |
| `system_language` | global | [x] | `is_active` + **`is_default`** exclusive + `/reorder` |
| `system_menu` | tree | [x] | Use **`/move`**, not `/reorder` |
| `warehouse_list` | tree | [x] | Use **`/move`** |
| `product_attribute` | tree | [x] | Categories **`/move`**; brand/car **`/reorder`** (sibling scope) |
| `member_tier` | tree | [ ] | Use **`/move`** |

## C — `tree_path` (requires `PATCH /move`)

| Table | Status |
|-------|--------|
| `system_menu` | [x] |
| `warehouse_list` | [x] |
| `product_attribute` | [x] |
| `member_tier` | [ ] |

Shared logic: [`backend/internal/tree/`](../../../backend/internal/tree/).

## D — Exceptions (not top-level `/reorder` or not `is_active`)

| Table / field | Rule |
|---------------|------|
| `admin_user.status` | Enum lifecycle; list filter + partial `PATCH` on `status` |
| `admin_user_session.is_active` | Revoked by auth flows only |
| `system_language.is_default` | Exclusive boolean; partial `PATCH` + clear other rows (with standard `is_active` on same resource) |
| `*_file` (`product_item_file`, `member_file`, `purchase_order_file`, …) | Gallery `sort_order` on parent resource |
| `supplier_contact`, `supplier_bank` | `sort_order` under `supplier_user_id` — **contact** reorder: `PATCH /supplier/users/:id/contacts/reorder` [x]; **bank** reorder: `PATCH /supplier/users/:id/banks/reorder` [x] |
| `order_payment_method` | Junction; validates linked `setting_payment_method.is_active` |
| Tables without list API yet | YAGNI — add mutations when the list module ships |

## Required checklist (this inventory)

- [x] Rule documented in `.cursor/rules/crud-mutations.mdc`
- [x] RBAC wave rows marked done in sections A–C
- [x] `internal/tree` helpers + tests
- [ ] Future backend phases: tick rows as modules land
