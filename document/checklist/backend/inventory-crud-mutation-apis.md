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
| `location_location` | TBD | active, reorder | [ ] | |
| `member_tier` | TBD | active, move | [ ] | Tree |
| `member_user` | TBD | active | [ ] | |
| `member_discount` | TBD | active | [ ] | |
| `member_setting_business` | TBD | active | [ ] | |
| `member_setting_credit` | TBD | active | [ ] | |
| `member_setting_group` | TBD | active | [ ] | |
| `member_setting_relation` | TBD | active | [ ] | |
| `product_list` | TBD | active | [ ] | No `sort_order` |
| `product_item` | TBD | active | [ ] | |
| `product_attribute` | TBD | active, move | [ ] | Tree; attribute UI may restrict drag scope |
| `supplier_user` | TBD | active | [ ] | No list `sort_order` |
| `supplier_bank` | TBD | active | [ ] | Reorder parent-scoped — see §D |
| `warehouse_list` | TBD | active, move | [ ] | Tree |
| `setting_bank` | TBD | active, reorder | [ ] | |
| `setting_code` | TBD | active, reorder | [ ] | |
| `setting_claim_reason` | TBD | active, reorder | [ ] | Extra switches `is_claim` / `is_return` on same row |
| `setting_payment_method` | TBD | active, reorder | [ ] | Extra switches `is_sale` / `is_purchase` |
| `setting_prefix` | TBD | active, reorder | [ ] | Reorder scoped by `type` |
| `setting_sale_channel` | TBD | active, reorder | [ ] | |
| `website_country` | TBD | active, reorder | [ ] | Geo root |
| `website_province` | TBD | active, reorder | [ ] | Scope: `website_country_id` |
| `website_district` | TBD | active, reorder | [ ] | Scope: `website_province_id` |
| `website_sub_district` | TBD | active, reorder | [ ] | Scope: `website_district_id` |

## B — Top-level list `sort_order` (flat `/reorder`)

| Table | Reorder scope | Status | Notes |
|-------|---------------|--------|-------|
| `location_location` | global | [ ] | |
| `setting_bank` | global | [ ] | |
| `setting_code` | global | [ ] | |
| `setting_claim_reason` | global | [ ] | |
| `setting_payment_method` | global | [ ] | |
| `setting_prefix` | per `type` | [ ] | |
| `setting_sale_channel` | global | [ ] | |
| `website_country` | global | [ ] | |
| `website_province` | `website_country_id` | [ ] | |
| `website_district` | `website_province_id` | [ ] | |
| `website_sub_district` | `website_district_id` | [ ] | |
| `website_language` | global | [ ] | No `is_active`; **`is_default`** exclusive toggle — see §D |
| `system_menu` | tree | [x] | Use **`/move`**, not `/reorder` |
| `warehouse_list` | tree | [ ] | Use **`/move`** |
| `product_attribute` | tree | [ ] | Use **`/move`** (sibling-only for some types in design) |
| `member_tier` | tree | [ ] | Use **`/move`** |

## C — `tree_path` (requires `PATCH /move`)

| Table | Status |
|-------|--------|
| `system_menu` | [x] |
| `warehouse_list` | [ ] |
| `product_attribute` | [ ] |
| `member_tier` | [ ] |

Shared logic: [`backend/internal/tree/`](../../../backend/internal/tree/).

## D — Exceptions (not top-level `/reorder` or not `is_active`)

| Table / field | Rule |
|---------------|------|
| `admin_user.status` | Enum lifecycle; list filter + partial `PATCH` on `status` |
| `admin_user_session.is_active` | Revoked by auth flows only |
| `website_language.is_default` | Exclusive boolean; partial `PATCH` + clear other rows |
| `*_file` (`product_item_file`, `member_file`, `purchase_order_file`, …) | Gallery `sort_order` on parent resource |
| `supplier_contact`, `supplier_bank` | `sort_order` under `supplier_user_id` |
| `order_payment_method` | Junction; validates linked `setting_payment_method.is_active` |
| Tables without list API yet | YAGNI — add mutations when the list module ships |

## Required checklist (this inventory)

- [x] Rule documented in `.cursor/rules/crud-mutations.mdc`
- [x] RBAC wave rows marked done in sections A–C
- [x] `internal/tree` helpers + tests
- [ ] Future backend phases: tick rows as modules land
