# Design knowledge

Customer-facing Warehouse prototype under `design/` — HTML/CSS/vanilla JS only. No bundler, no real DB, no API calls.

## Stack

| Piece | Approach |
|-------|----------|
| Markup | Static HTML (`index.html`, `pages/login.html`, `pages/dashboard.html`, …) |
| Styles | `css/style.css` with CSS variables |
| Scripts | Vanilla JS on `window` |
| Icons | Lucide SVG in `assets/icons/<name>.svg` ([lucide.dev/icons](https://lucide.dev/icons/)) |
| Mock DB | `js/seed/` → `js/store.js` → `localStorage` |
| Schema | `design/schema/*.sql` — `{module}_{entity}` snake_case (singular); files/seed keys match; translations in `*_language` |
| Cross-tab | `js/realtime.js` via `BroadcastChannel` |

## Preview

```bash
make design-serve
```

Open `http://localhost:8080/`. Prefer HTTP over `file://` so `localStorage` and `BroadcastChannel` behave correctly. Do not run raw `python -m http.server` when this target exists.

## Script load order (every page)

1. `js/i18n/th.js` + `en.js` + `i18n.js`
2. `js/seed/_admin_shared.js` + `admin_*.js` (one file per table) + `website_language.js` + `index.js`
3. `js/store.js`
4. `js/realtime.js` (dashboard pages)
5. `js/nav.js`
6. `js/auth.js` + `js/permissions.js`
7. `js/components/*` (toast, modal, sidebar, layout)
8. Page-specific script

## Auth (mock)

- Session key: `warehouse-design-session` (`js/auth.js`)
- Demo users in seed `admin_user` with `_demo_password` (prototype only — not in SQL schema)
- `admin` / `admin` → superadmin; `staff` / `staff` → limited staff role
- Login: `pages/login.html` → `auth.resolveLandingPath()` (first menu path, else dashboard if permitted)
- Login page: language + theme toolbar (same localStorage keys as shell); two-panel layout on desktop; placeholders, password eye toggle, required red `*`, under-field validation errors
- Dashboard pages call `auth.requireAuth()` then `permissions.guardPage(module, type)`

## Forms (design)

Standing rules — see `.cursor/rules/forms.mdc`:

| Rule | Design implementation |
|------|----------------------|
| Placeholder on every input | `data-i18n-placeholder` + fallback `placeholder` |
| Password visibility | `.password-field` + `passwordToggle.bind(form)` (`js/components/password-toggle.js`); Lucide `eye` / `eye-off` |
| Required mark | `.form-field__required` (red `*`) after label |
| Under-field errors | `.form-field__error` inside `.form-field__error-slot` (fixed height); `error.required` on empty submit; clear on input |

Reference implementation: `pages/login.html`.

## Permissions

- Table `admin_permission`: code `{module}.{type}.{action}`; actions `view|create|update|delete|import|export`
- `is_active` on each permission row — frontend hides/disables action when false even if role grants it
- `permissions.can(code)`, `canAction(module, type, action)`, `listForPage()`, `applyActionButtons()`
- Sidebar visibility: leaf menu requires `{parentModule}.{leafModule}.view` (+ superadmin bypass)
- Page buttons: `data-perm-module`, `data-perm-type`, `data-perm-action`

## Admin shell

- `js/nav.js` — `nav.resolve(path)`: menu `path` values in seed are relative to design root (e.g. `pages/dashboard.html`); call before `location.replace` or sidebar `href` when the current page is under `pages/`
- `js/components/layout.js` — sidebar + header + content area
- `js/components/sidebar.js` — tree from `admin_menu` + `admin_menu_language`, filtered by RBAC
- Responsive: sidebar drawer &lt; 1024px; sticky sidebar on desktop

## Dev bar (prototype only)

- `js/components/dev-bar.js` — each page declares `devBar.mount({ toasts, actions })`; list only toast types that page can emit (not a global four-type strip)
- Never shipped to `frontend/`; see `.cursor/skills/design/SKILL.md` for API

## Toast

- `js/components/toast.js` — `toast.show(msg, type)`; types `success` | `error` | `warning` | `info`
- Card-style toast: theme surface, colored left accent, Lucide type icon, message, dismiss button (`toast.close` i18n)
- Container fixed **top-right**; slide-in from right; auto-dismiss ~4s; manual close clears immediately
- Test via dev bar toast buttons on pages that declare `devBar.mount({ toasts: [...] })`

## Theme

- Toggle with `data-theme="light|dark"` on `<html>`
- Default from `prefers-color-scheme` when unset
- Persist key: `warehouse-design-theme`
- Tokens: `--color-primary`, `--color-primary-foreground`, `--color-background`, `--color-foreground`, `--color-muted`

## i18n

- Dictionaries: `js/i18n/th.js`, `js/i18n/en.js`
- API: `i18n.init()`, `i18n.t(key)`, `i18n.setLocale('th'|'en')`, `i18n.getLocale()`
- Default locale: `th`
- Persist key: `warehouse-design-locale`
- Mark copy with `data-i18n="key"` for automatic re-render on locale change
- UI chrome → dictionaries; stored multilingual fields → `{base}_language` rows (`locale` = `th` \| `en`)

## Schema naming

- Tables: `{module}_{entity}` English snake_case, singular (e.g. `product_item`); companion `product_item_language` for translations
- Same name for SQL table, `design/schema/<name>.sql`, and seed/store key
- Columns: English snake_case; FK `{referenced_table}_id`
- Base audit: `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`
- `*_language` audit: `created_at`, `updated_at` only (soft-delete / attribution on parent)
- PK: `id BIGSERIAL`
- **Self-FK tree tables** (`tree_path`): `parent_id` + `tree_path` (LTREE) + `sort_order`; examples: `admin_menu`, `warehouse_list`, `product_attribute`, `member_tier`
- **Geo chain** (`website_*`): `website_country` → `website_province` → `website_district` → `website_sub_district`; typed parent FK + `sort_order` only (not tree tables)
- **Not trees**: split-document `parent_id` only (`order_order`, `purchase_order_item`); flat lists `sort_order` only (`website_language`, `website_country`, `setting_bank`, `setting_claim_reason`, …)
- Money: `NUMERIC(15,4)` · Rate/percent: `NUMERIC(5,2)` · Quantities: `NUMERIC(15,4)` or `INTEGER`
- Root list tables use `{module}_list` or `{module}_user`: `product_list`, `warehouse_list`, `supplier_user`; `member_member` still repeats module
  Children drop the repetition: `product_item` (not `product_list_item`), `member_address` (not `member_member_address`)
- `check:skip-audit` comment in a file exempts it from audit-5 check (use for session/log/junction tables)
- **Column comments:** inline `--` on every non-audit column; English; audit skip sets per table kind (base five / language two / junction `created_at` only)

## File storage

All uploaded files go through [`website_file`](../../design/schema/website_file.sql). Do **not** use `image_url TEXT` or `image_url[]` in new schema.

| Case | Pattern | Examples |
|------|---------|----------|
| Single image (logo, avatar, slip) | `website_file_id BIGINT` FK on parent table | `product_attribute`, `member_member`, `setting_bank` |
| Multiple files / reorder | junction `{entity}_file` + `sort_order` | `product_item_file`, `member_file`, `purchase_order_file` |

- Gallery cover = row with lowest `sort_order` (tie-break `id`)
- `ON DELETE RESTRICT` on `website_file_id` — cannot delete a file still referenced
- API resolves `website_file_id` → signed/public URL from `object_key` at read time

**`website_file.purpose` values:**

| Purpose | Used by |
|---------|---------|
| `product_attribute_logo` | `product_attribute.website_file_id` |
| `member_avatar` | `member_member.website_file_id` |
| `member_tier_badge` | `member_tier.website_file_id` |
| `setting_bank_logo` | `setting_bank.website_file_id` |
| `setting_sale_channel_logo` | `setting_sale_channel.website_file_id` |
| `purchase_order_payment_proof` | `purchase_order_payment.website_file_id` |
| `product_item_image` | `product_item_file` (gallery) |
| `member_document` | `member_file` |
| `purchase_order_attachment` | `purchase_order_file` |

## Schema modules (89 files in `design/schema/`)

| Module | Tables | Key notes |
|--------|--------|-----------|
| website (10) | `language`, `file`, country+lang, province+lang, district+lang, sub_district+lang | locale registry; geo hierarchy via typed FK + sort_order (no LTREE) |
| admin (9) | user, session, role+lang, permission, role_permission, menu+lang+permission | `admin_permission.is_active` toggles UI actions; `admin_user.type`: `superadmin` \| `owner` \| `manager` \| `staff` |
| setting (12) | vat, sale_channel+lang, bank+lang, payment_method+lang, code, claim_reason+lang, prefix+lang | shared `setting_prefix` lookup (person \| company) replaces member/supplier prefix enums |
| location (2) | location+lang | custom named locations (v1 `location_locations`); split from setting module |
| product (16) | attribute+lang+relation, list+lang+code+car+supplier, item+lang+price+stock+stop_log+file+supplier+warehouse | product_list: tag/supplier_sku/note/is_new restored; car stop-sell on product_attribute.is_stopped not product_list_car; gallery via product_item_file |
| member (15) | setting+lang+relation, tier+lang+item+item_attribute, member+setting+owner+address+file+discount+history+lang | setting M2M replaces v2 self-FK; name/tel/email back on member row |
| supplier (4) | user, information, contact, bank | v2 had only supplier — information/contact/bank gaps restored; type information/tax_invoice/delivery |
| warehouse (3) | list+lang+condition | barcode/qrcode/rfid/capacity restored; occupancy from product_item_stock via product_item_warehouse.bin_id; condition: amount + amount_active (inactive/empty derived) |
| purchase (10) | request+item+item_reject, order+item+item_reject+payment+file, history+lang | entire module absent in v2; sourced from v1 |
| order (8) | order, item, shipping, payment+method+item, claim+item | v2 bill+order 1:1 merged; `is_payed` → `is_paid`; claim reasons in setting module |

## Schema validation

```bash
make design-schema-check   # bash + grep, no deps; exits 0 = all clear
```

Checks per file:
1. Filename matches `CREATE TABLE` name
2. Base entity tables have all 5 audit columns (skip: `check:skip-audit`, junction tables, `*_language`)
3. `*_language` tables have `locale` + UNIQUE constraint + no `deleted_at`
4. Every `REFERENCES <table>` has a matching `<table>.sql`
5. Every `tree_path` table has `parent_id` and `sort_order` (self-FK trees only)

## Icons

- Source: [Lucide](https://lucide.dev/icons/) only
- Files: `design/assets/icons/<lucide-name>.svg` (kebab-case)
- Prefer inline SVG + `currentColor` when the icon must follow theme; otherwise `<img>`
- No other icon packs, emoji chrome icons, or Lucide CDN scripts

## Store / realtime

- Store key: `warehouse-design-store`
- Seed version key: `warehouse-design-seed-version` (must match `window.SEED_VERSION` in `js/seed/index.js`, currently `admin-shell-9`)
- `store.init()` re-seeds from `window.SEED` when version mismatches or `admin_user` is missing (fixes stale empty localStorage from earlier prototypes)
- Manual reset: DevTools → delete both keys above, or run `store.reset()` in the console
- Seed: `window.SEED` built from per-table files under `js/seed/` (`_admin_shared.js`, `admin_*.js`, `website_language.js`) merged by `index.js`
- Channel name: `warehouse-design`
- API: `store.init|getAll|getById|create|update|delete|reset`

## Breakpoints (mobile-first)

| Name | Width |
|------|-------|
| mobile | &lt; 640px |
| tablet | ≥ 640px |
| computer | ≥ 1024px |
| computer-wide | ≥ 1440px |

## Docs

- Phase checklists: `document/checklist/design/`

## Next

- Add CRUD screens under `pages/` (products, orders, …) with `data-perm-*` on actions
- Hand off approved UI to `/frontend`; schema-ready work to `/backend`
