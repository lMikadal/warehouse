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
│   │   │   ├── _admin_shared.js
│   │   │   ├── admin_menu.js
│   │   │   ├── admin_menu_language.js
│   │   │   ├── admin_permission.js
│   │   │   ├── admin_menu_permission.js
│   │   │   ├── admin_role.js
│   │   │   ├── admin_role_language.js
│   │   │   ├── admin_role_permission.js
│   │   │   ├── admin_user.js
│   │   │   ├── website_language.js
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

### Enums

Shared cross-module types live in [`design/schema/_enum_shared.sql`](../../design/schema/_enum_shared.sql):

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

### Hierarchy and sort

**Self-FK tree tables** (nav, warehouse layout, attribute trees, …) use **all three** together:

| Column | Type | Role |
|--------|------|------|
| `parent_id` | `BIGINT` NULL, self-FK `ON DELETE RESTRICT` | Direct parent (`NULL` = root) |
| `tree_path` | `LTREE NOT NULL` | Materialized path for ancestor/descendant queries |
| `sort_order` | `INTEGER NOT NULL` | Sibling order under the same parent |

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

**Warehouse child quotas** ([`warehouse_condition`](../../design/schema/warehouse_condition.sql)) — per parent node × child `warehouse_list_type`:

| Stored | Role |
|--------|------|
| `amount` | Max child nodes of this type creatable under the parent warehouse |
| `amount_active` | Max child nodes of this type that may be active at a given time |

Derived at query time (do not add columns): inactive = `amount - amount_active`; empty slots = count child `warehouse_list` rows of matching `type` where `capacity` > stock occupancy (`SUM(remain_quantity)` from `product_item_stock` per child).

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

## Dev Bar (design-only testing panel)

Every `design/pages/*.html` page **must** include `dev-bar.js` and call `devBar.mount()` at the end of its init script. The bar is a fixed amber-accented strip at the bottom of the viewport — visible only in the prototype, never copied to `frontend/`.

### Load order

Add after the last component script (toast, modal, sidebar, layout …):

```html
<script src="../js/components/dev-bar.js"></script>
```

### API

```js
devBar.mount({
  // required — only toast types this page can emit in real UX
  toasts: [
    { type: 'success', label: 'Success: saved', msg: 'Operation completed successfully.' },
    { type: 'error', label: 'Error: forbidden', msgKey: 'error.forbidden' },
    { type: 'warning', label: 'Warning: confirm', msg: 'Check this before proceeding.' },
  ],
  // optional — page-specific controls
  actions: [
    // flat button
    { label: 'Reset store', fn: function () { store.reset(); location.reload(); } },

    // labelled group
    {
      group: 'Status',
      items: [
        { label: 'pending',     fn: function () { /* set state */ } },
        { label: 'in_progress', fn: function () { /* set state */ } },
        { label: 'completed',   fn: function () { /* set state */ } },
      ],
    },
  ],
});
```

- `toasts`: array of `{ type, label?, msgKey?, msg? }` — `type` is `success` | `error` | `warning` | `info`; use `msgKey` for i18n copy when available, else `msg`
- If `toasts` is omitted or empty, the Toast section is hidden (no default all-four strip)
- Page `actions` appear after a separator when both sections exist. Collapse state is persisted per-browser via `localStorage`

### Login page — quick login

On `login.html` the dev bar's `actions` list all active `admin_user` rows as one-click login buttons (username + type label). Clicking one calls `auth.login(username, _demo_password)` then `auth.resolveLandingPath()` — no password typing needed for UI testing.

### Rules

- Every new page gets `devBar.mount()` with a `toasts` array listing **only** toast types that page can emit (audit mutation/error paths before adding a page)
- Page actions must use `store.*` calls only; no real API calls
- Never include `dev-bar.js` in `frontend/` — it is prototype tooling only
- Use `group` + `items` when there are multiple related states to switch between (e.g. order status variants); use flat `{ label, fn }` for one-off actions

## UX patterns (design)

These rules apply to every page and component in `design/`.

### Feedback — always show a result

| Trigger | UI response |
|---------|-------------|
| Successful create / update / delete | `toast.show(msg, 'success')` |
| Validation or logic error | `toast.show(msg, 'error')` or inline error under the field |
| Destructive action (delete) | Confirm modal before executing; success toast after |
| Network / async mock delay | Disable the submit button during the action; re-enable on finish |

Never mutate data silently. Every `store.create / update / delete` call must be followed by a visible feedback signal.

### Loading & empty states

- Tables / lists with no rows: show an empty-state message (not a blank white area)
- If a mock async delay is simulated, disable the triggering button and show a brief loading label
- Skeleton placeholders are optional for design but preferred over blank flicker

### Error copy (i18n keys)

Error messages live in `js/i18n/th.js` + `en.js`, not hardcoded in pages. Pattern:

```js
// In i18n dictionaries:
"error.required": "กรุณากรอกข้อมูลให้ครบถ้วน" / "Please fill in all required fields."
"error.notFound":  "ไม่พบข้อมูล" / "Record not found."

// In page script:
toast.show(i18n.t("error.required"), "error");
```

### Forms

- Every text-like input has an i18n placeholder (`data-i18n-placeholder` + fallback `placeholder`); placeholder is a hint, not a label substitute
- Every `type="password"` uses `.password-field` + `passwordToggle.bind(form)` (`js/components/password-toggle.js`) with Lucide `eye` / `eye-off`
- Required fields: red `*` in `.form-field__required` after the label; keep HTML `required`
- On submit/save: empty required fields show `error.required` (or field-specific key) in `.form-field__error` inside `.form-field__error-slot` (fixed `min-height` — errors must not shift inputs); focus first invalid field; optional `.form-field--invalid` for red input border
- Inline field errors on blur (not only on submit)
- Disable submit button while processing to prevent double-submit
- Clear field errors when the user starts typing again
- Form-level banners are for auth/server failures — not for empty required fields

### Toast

- `js/components/toast.js` — `toast.show(msg, type)` where `type` is `success` | `error` | `warning` | `info`
- Card layout: theme surface + left accent border + Lucide type icon + message + dismiss (`toast.close` i18n)
- Fixed top-right stack; slide-in from right; auto-dismiss ~4s; close button dismisses immediately
- Icons: `circle-check`, `circle-alert`, `triangle-alert`, `info`, `x` in `assets/icons/`

## Do not

- Connect real DB or Redis
- Edit `frontend/` or `backend/` from this skill
- Add heavy business logic beyond demo CRUD
- Introduce a framework or package manager under `design/`
- Use non-Lucide icon libraries or emoji as UI icons
- Include `dev-bar.js` in `frontend/` — it is design-only tooling
