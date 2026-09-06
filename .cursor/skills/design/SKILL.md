---
name: design
description: >-
  Build Warehouse app HTML/CSS/JS prototypes with local mock DB (seed, store,
  realtime), blue-white theme, light/dark mode, th/en i18n, and responsive
  layouts. Use when working under design/, creating mockups, pages, seed data,
  schema SQL, or demo CRUD without a real database.
---

# Design (customer prototype)

Warehouse app prototype for customer demos — change data locally without a build or a real DB.

## Scope

- Work in `design/**`
- Read `design/schema/**` so seed/store fields match real schema
- Do **not** touch `frontend/`, `backend/`, or call a real API
- When behavior/knowledge changes → update `document/checklist/design/` and `document/knowledge/design.md` (see `.cursor/rules/document.mdc`)

## Shared principles

1. **Warehouse app** — Everything is about the Warehouse app (users, products, orders, …); do not ship a generic off-domain template
2. **Reusable + maintainable** — Share UI in `js/components/`, name clearly, avoid duplication
3. **Strong security** — No real passwords/secrets in seed; do not inject unsanitized user HTML; mock only — no live DB
4. **Responsive** — mobile / tablet / computer / computer-wide (breakpoints below)
5. **Theme: blue + white** — White background (light) + blue accent; tokens in `css/style.css`
6. **Light + dark mode** — Toggleable; default from `prefers-color-scheme`; persist in `localStorage`; paired light/dark tokens
7. **i18n: th + en** — Dictionaries in `js/i18n/`; language switcher; default `th`; do not hardcode a single language in UI
8. **Icons: Lucide SVG** — From [Lucide](https://lucide.dev/icons/); store under `assets/icons/`; no emoji-as-UI-icons or other packs

### Breakpoints (mobile-first)

| Name | Width | Notes |
|------|-------|-------|
| mobile | &lt; 640px | base |
| tablet | ≥ 640px | |
| computer | ≥ 1024px | desktop |
| computer-wide | ≥ 1440px | wide |

### Theme tokens

| Token | Role |
|-------|------|
| `--color-primary` | Primary blue |
| `--color-primary-foreground` | Text on primary |
| `--color-background` | Surface (light = white, dark = dark) |
| `--color-foreground` | Text on surface |
| `--color-muted` | Muted surface / soft borders |

- Light: white surface + clear blue; Dark: dark surface + blue with enough contrast
- Toggle with `data-theme="light|dark"` on `html` (same as frontend)
- Theme toggle in the shell; light/dark hex pairs live in one place in `style.css`

### i18n (design)

- `js/i18n/th.js`, `js/i18n/en.js`, `js/i18n/i18n.js`
- UI chrome (labels, buttons, nav) lives in dictionaries — not in SQL
- Stored multilingual content uses `*_language` tables (see Schema naming); pick rows by current locale
- Load i18n before page scripts

### Icons (design)

- Source: [Lucide icons](https://lucide.dev/icons/) only
- Path: `design/assets/icons/<lucide-name>.svg` (kebab-case, e.g. `sun.svg`, `languages.svg`)
- Use `<img src="assets/icons/….svg">` for simple assets; inline the same SVG markup when color must follow theme (`currentColor` + CSS)
- Keep Lucide stroke defaults; theme via CSS so light/dark stays readable
- No npm icon packages, icon font CDNs, or emoji for chrome/actions

## Project structure (required)

```
warehouse/
├── design/
│   ├── index.html
│   ├── pages/
│   │   ├── dashboard.html
│   │   ├── products.html
│   │   ├── product-approval.html
│   │   ├── users.html
│   │   └── orders.html
│   ├── schema/
│   │   ├── product_item.sql
│   │   ├── product_item_language.sql
│   │   └── ...
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── i18n/
│   │   │   ├── th.js
│   │   │   ├── en.js
│   │   │   └── i18n.js
│   │   ├── seed/
│   │   │   ├── product_item.js
│   │   │   ├── product_item_language.js
│   │   │   └── index.js
│   │   ├── store.js
│   │   ├── realtime.js
│   │   └── components/
│   │       ├── sidebar.js
│   │       ├── modal.js
│   │       └── toast.js
│   └── assets/
│       ├── images/
│       └── icons/
└── README.md
```

Add new pages under `pages/` with the same pattern. Add matching seed files and schema SQL when new entities appear.

## Layer roles

| Path | Role |
|------|------|
| `pages/*.html` | One screen per file — load `style.css` + shared scripts |
| `css/style.css` | Shared CSS + variables (`--color-primary`, `--spacing`, …) for fast theme tweaks |
| `js/seed/` | Initial mock data only — align shapes with `design/schema/` |
| `js/store.js` | Mock DB: init from seed, CRUD, persist `localStorage` |
| `js/realtime.js` | On store change → `BroadcastChannel` → other tabs re-render |
| `js/components/` | Reusable DOM (sidebar, modal, toast) — no framework |
| `assets/icons/` | Lucide SVGs only (`<lucide-name>.svg`) |
| `schema/*.sql` | Source of truth for data shape — read before seed/store; backend uses for migrations |

## Stack

- HTML + CSS + vanilla JS only
- No React, Next, bundler, npm, or backend API calls
- No PostgreSQL / Redis connection from design

## Mock DB flow

1. Page load → `store.init()` — load seed into `localStorage` if empty
2. Page uses `store.getAll` / `getById` / `create` / `update` / `delete`
3. Persist to `localStorage`
4. `realtime.broadcast()` → other tabs update

### Script load order (every page)

1. `js/i18n/th.js` + `en.js` + `i18n.js`
2. `js/seed/index.js`
3. `js/store.js`
4. `js/realtime.js`
5. `js/components/*.js` (sidebar, modal, toast)
6. Page-specific script (inline or `js/pages/<name>.js` if needed)

### Store API (keep small)

```js
store.init()
store.getAll(table)
store.getById(table, id)
store.create(table, row)
store.update(table, id, patch)
store.delete(table, id)
store.reset() // optional: clear localStorage and re-seed
```

### Realtime

- Channel name: one constant (e.g. `warehouse-design`)
- Payload: `{ type, table }` or full snapshot — keep listeners dumb: re-read from `store` and re-render

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
| PK: `id`; FK: `{referenced_table}_id` | `product_item_id` |
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

### Hierarchy and sort

**Self-FK tree tables** (nav, warehouse layout, attribute trees, …) use **all three** together:

| Column | Type | Role |
|--------|------|------|
| `parent_id` | `BIGINT` NULL, self-FK `ON DELETE RESTRICT` | Direct parent (`NULL` = root) |
| `tree_path` | `LTREE NOT NULL` | Materialized path for ancestor/descendant queries |
| `sort_order` | `INTEGER NOT NULL` | Sibling order under the same parent |

Examples: `admin_menu`, `warehouse_warehouse`, `product_attribute`, `member_tier`, `order_claim_reason`.

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
- Flat UI lists: `sort_order` only — e.g. `website_language`, `website_country`, `setting_bank`, `setting_payment_method`
- Language / junction / log / session tables: neither

### Audit columns

**Base tables** (e.g. `product_item`) — all five:

| Column | Role |
|--------|------|
| `created_at` | Row created |
| `updated_at` | Last update |
| `deleted_at` | Soft delete (`NULL` = active) |
| `created_by` | Creator user id |
| `updated_by` | Last updater user id |

**`*_language` tables** — timestamps only: `created_at`, `updated_at`. Do **not** add `deleted_at` / `created_by` / `updated_by`. Soft-delete the parent; drop a locale by deleting that language row.

### Multilingual content

- Do **not** use `name_th` / `name_en` on the base table
- Base = locale-neutral fields + full audit set
- Companion `{base}_language`: `id`, `{base}_id`, `locale`, translated columns, `created_at`, `updated_at`; unique `(parent_id, locale)`
- UI chrome → i18n dictionaries; stored translations → `*_language` rows filtered by current locale
- List/get on base tables: treat `deleted_at IS NULL` as active

## Schema sync

- Field names/types in seed must match `design/schema/` (e.g. `product_item.id`, `product_item_language.locale`)
- When schema changes → update seed + store usage in the same change
- Design never runs SQL against a live DB

## Page pattern

- Shared shell: sidebar + main + toast + language toggle + theme toggle
- Mobile-first across all four breakpoints; copy via i18n (`th`/`en`)
- Placeholder data realistic enough to demo CRUD
- Theme tweaks only via CSS variables (light/dark pairs) at the top of `style.css`

## Preview

Serve with HTTP (localStorage / BroadcastChannel work better than `file://`). From repo root:

```bash
make design-serve
```

## Handoff

| After | Next skill |
|-------|------------|
| Customer approves UI | `/frontend` — implement in Next.js |
| Schema in `design/schema/` is ready | `/backend` — migrations + API |

## Do not

- Connect real DB or Redis
- Edit `frontend/` or `backend/` from this skill
- Add heavy business logic beyond demo CRUD
- Introduce a framework or package manager under `design/`
- Use non-Lucide icon libraries or emoji as UI icons
