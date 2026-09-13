# Design — schema and data shape reference

Deep rules for `design/schema/*.sql`, seeds, and mock store keys. For prototype workflow and UX, see [`SKILL.md`](SKILL.md).

Paths below are relative to the repo root unless noted.

## Schema naming

Tables, columns, `design/schema/*.sql` filenames, and seed/store keys use the **same** English snake_case string.

### Tables

| Rule | Example |
|------|---------|
| `{module}_{entity}` snake_case, English only | `product_item` |
| Singular entity | `product_item` not `product_items` |
| No Thai / spaces / PascalCase | bad: `สินค้า`, `ProductItem` |
| Language companion = `{base}_language` | `product_item_language` |
| File = table name + `.sql` | `design/schema/product_item.sql` |
| Seed/store key = table name | `store.getAll('product_item')` |
| No bare unprefixed names | `item` alone is wrong |

**How to pick module / entity**

1. **Module** = domain bucket (maps to backend `internal/module/<domain>/`) — short English noun: `product`, `auth`, `order`
2. **Entity** = the thing stored — singular: `item`, `user`, `status`
3. If unsure: name the screen/domain first, then the row type → `product_item`
4. Prefer clear English words; abbreviations only when domain-standard (`sku`, `id`)

### Columns

| Rule | Example |
|------|---------|
| English snake_case | `sku`, `created_at` |
| PK: `id BIGSERIAL` (numeric surrogate; **not UUID**) | `id BIGSERIAL PRIMARY KEY` |
| FK: `{referenced_table}_id BIGINT` | `warehouse_list_id BIGINT` |
| Seed/store ids: plain numbers | `{ id: 1, warehouse_list_id: 3 }` |
| Booleans: `is_` / `has_` prefix | `is_active` |
| Timestamps: `*_at` | `created_at` |
| On `*_language`: `locale` (`th` \| `en`) + translated fields only | `locale`, `name`, `description` |

### Column comments

Every `CREATE TABLE` column gets a trailing inline `--` comment (English). **Skip audit columns** only:

| Table kind | No comment on |
|------------|---------------|
| Base entity | `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by` |
| `*_language` | `created_at`, `updated_at` |
| Junction (trace only) | `created_at` |
| `check:skip-audit` session | `created_at` |
| No audit columns | comment all columns |

Short business meaning; FKs note target; snapshots note “at order/PO time”. Multi-line `GENERATED` columns: comment on the first line. Do not comment `CREATE TYPE`, indexes, or constraints.

## Enums

Shared cross-module types live in [`design/schema/_enum_shared.sql`](../../../design/schema/_enum_shared.sql):

| Type | Values | Used for |
|------|--------|----------|
| `entity_branch` | `headquarter`, `branch` | member/supplier branch columns |
| `discount_unit` | `percent`, `baht` | discount_type columns |
| `claim_type` | `claim`, `return` | order/purchase claim headers and lines |
| `claim_item_status` | `confirmed`, `rejected` | per-line claim review |

**Type naming:** `{owning_table}_{column_name}` — e.g. `purchase_order_status`, `order_order_fulfill_status`, `warehouse_list_type`. Shared types are the exception.

**Status values:**

| Pattern | Example |
|---------|---------|
| In progress | `pending` → `in_progress` → terminal |
| Terminal (past participle) | `completed`, `cancelled`, `rejected` |
| Sub-outcome OK | `success`, `fail` on line/fulfill enums |
| Domain-specific OK | `paying`, `receive_partial`, `receive_completed` on PO workflow |

Avoid verb-base terminal states (`cancel`, `reject`) and inconsistent synonyms (`wait`, `waiting`, `process`) on `*_status` enums.

**Non-status renames (clarity):**

| Old | New | Context |
|-----|-----|---------|
| `new` / `old` | `catalog` / `custom` | purchase request line type |
| `general` / `legal` | `individual` / `company` | member type |
| `information` | `contact` | supplier information type |
| `reject` (resolution) | `accept_loss` | PO item reject resolution |

## Hierarchy and sort

**Self-FK tree tables** (nav, warehouse layout, attribute trees, …) use **all three** together:

| Column | Type | Role |
|--------|------|------|
| `parent_id` | `BIGINT` NULL, self-FK `ON DELETE RESTRICT` | Direct parent (`NULL` = root) |
| `tree_path` | `LTREE NOT NULL` | Materialized path for ancestor/descendant queries |
| `sort_order` | `INTEGER NOT NULL` | Sibling order under the same parent |

**`tree_path` label convention (seeds + backend):** dot-joined `n{id}` segments from root to self — e.g. id 7 with chain 2→6→7 → `n2.n6.n7`. Do not use module names in paths. Design seeds: `ADMIN_SEED_SHARED.assignTreePaths(defs)` in [`design/js/seed/_admin_shared.js`](../../../design/js/seed/_admin_shared.js).

Examples: `admin_menu`, `warehouse_list`, `product_attribute`, `member_tier`.

**Typed geo chain** (`website_*`) — one table per level, **typed parent FK** + `sort_order` only (flat lists; no `tree_path`):

| Table | Parent FK | List order |
|-------|-----------|------------|
| `website_country` | — (root) | `ORDER BY sort_order` |
| `website_province` | `website_country_id` | `ORDER BY sort_order` under country |
| `website_district` | `website_province_id` | `ORDER BY sort_order` under province |
| `website_sub_district` | `website_district_id` (+ `postcode`) | `ORDER BY sort_order` under district |

- Indexes: `(typed_parent_fk, sort_order)` on child levels; active `sort_order` lists

**Not tree tables** (do not add all three):

- Split-document self-FKs: `parent_id` only — e.g. `order_order`, `purchase_order_item`
- Flat UI lists: `sort_order` only — e.g. `website_language`, `website_country`, `setting_bank`, `setting_payment_method`, `setting_claim_reason`, `setting_prefix` (filter by `type`: `person` | `company`)
- Language / junction / log / session tables: neither

**Warehouse child quotas** ([`warehouse_condition`](../../../design/schema/warehouse_condition.sql)) — per parent node × child `warehouse_list_type`:

| Stored | Role |
|--------|------|
| `amount` | Max child nodes of this type creatable under the parent warehouse |
| `amount_active` | Max child nodes of this type that may be active at a given time |

Derived at query time (do not add columns): inactive = `amount - amount_active`; empty slots = count child `warehouse_list` rows of matching `type` where `capacity` > stock occupancy (`SUM(remain_quantity)` from `product_item_stock` per child).

## Audit columns

**Base tables** (e.g. `product_item`) — all five:

| Column | Role |
|--------|------|
| `created_at` | Row created |
| `updated_at` | Last update |
| `deleted_at` | Soft delete (`NULL` = active) |
| `created_by` | Creator user id |
| `updated_by` | Last updater user id |

**`*_language` tables** — timestamps only: `created_at`, `updated_at`. Do **not** add `deleted_at` / `created_by` / `updated_by`. Soft-delete the parent; drop a locale by deleting that language row.

## Multilingual content

- Do **not** use `name_th` / `name_en` on the base table
- Base = locale-neutral fields + full audit set
- Companion `{base}_language`: `id`, `{base}_id`, `locale`, translated columns, `created_at`, `updated_at`; unique `(parent_id, locale)`
- UI chrome → i18n dictionaries; stored translations → `*_language` rows filtered by current locale
- List/get on base tables: treat `deleted_at IS NULL` as active

## Schema sync

- Field names/types in seed must match `design/schema/` (e.g. `product_item.id`, `product_item_language.locale`)
- When schema changes → update seed + store usage in the same change
- Design never runs SQL against a live DB
