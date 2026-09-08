# Design knowledge

Customer-facing Warehouse prototype under `design/` — HTML/CSS/vanilla JS only. No bundler, no real DB, no API calls.

## Visual / UX guidelines

**Source of truth:** [`design/design.json`](../../design/design.json) — tokens, breakpoints (incl. tablet portrait/landscape), layout patterns, components, UX rules. Reference page: `pages/login.html`.

Read `design.json` before building or restyling any page. CSS tokens live in `css/style.css`; the JSON documents the intended visual language and responsive behavior for agents and handoff.

## Stack

| Piece | Approach |
|-------|----------|
| Markup | Static HTML (`index.html`, `pages/login.html`, `pages/admin-*.html`, `pages/website-*.html`, …) |
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
2. `js/seed/website_language.js` → **`js/seed/_admin_shared.js`** (must load before any seed file that calls `ADMIN_SEED_SHARED`) → `website_*` geo seeds → `admin_*.js` → `index.js`
3. `js/store.js`
4. `js/realtime.js` (authenticated module pages)
5. `js/nav.js`
6. `js/auth.js` + `js/permissions.js`
7. `js/components/*` (toast, modal, sidebar, layout)
8. Page-specific script

## Auth (mock)

- Session key: `warehouse-design-session` (`js/auth.js`)
- Demo users in seed `admin_user` with `_demo_password` (prototype only — not in SQL schema)
- `admin` / `admin` → superadmin; `staff` / `staff` → limited staff role
- Login: `pages/login.html` → `auth.resolveLandingPath()` → `sidebar.getFirstPath()` (first **navigable** permitted sidebar leaf: real `path`, not `#` or dialog) → `nav.resolve()` once
- Menus with `path: "#"` may appear in the sidebar when permitted but cannot be login landing targets until wired to a real HTML page (admin user/role pages are wired)
- If login still redirects to removed pages (e.g. `dashboard.html`): hard refresh (Ctrl+Shift+R) to bypass cached JS, or use dev-bar **Reset store** / bump `SEED_VERSION` so `store.init()` re-seeds
- Login page: full-bleed split on desktop (brand gradient panel + form column); mobile single card; fixed icon toolbar (lang/theme); leading field icons; placeholders, password eye toggle, required red `*`, under-field validation errors
- **Super Admin CRUD pages** (9 thin HTML wrappers + shared `js/components/crud-list.js` + `js/pages/module-registry.js`):
  - `pages/admin-menu.html` — menu tree (edit only)
  - `pages/admin-permission.html` — permission list (read-only; toggle `is_active`)
  - `pages/admin-language.html` — `website_language` CRUD
  - `pages/website-country.html` … `pages/website-sub-district.html` — geo hierarchy CRUD with `*_language` rows
  - `pages/admin-user.html` — `admin_user` CRUD (role/type/status filters; password toggle on form)
  - `pages/admin-role.html` — `admin_role` + `admin_role_language` CRUD; create/edit modal includes menu-grouped permission matrix (`js/components/role-permission-matrix.js`)
- List + modal create/edit on the same page (no separate form HTML); delete uses confirm modal + toast
- **Modal / dialog design**: backdrop blur (`backdrop-filter: blur(4px)` + `rgb(15 23 42 / 0.45)`), panel elevated (`border-radius: 0.75rem`, `box-shadow`), structure = `modal__header` (border-bottom) → `modal__content` (padded) → `modal__footer` (border-top); close = Lucide `x.svg` ghost icon button; `is_active` checkbox in forms renders as `.crud-switch` (green, with thumb) inside `.form-field--switch` row; `name_th` + `name_en` auto-grouped in `.crud-form__row` (2-column grid, stacks on mobile); compact form spacing (`gap: 0.5rem`); modal widths via `--modal-max-width` — **36rem** base (generic + confirm), **42rem** CRUD form (`.crud-modal`), **56rem** role permission matrix (`.crud-modal--wide`); entry animation `modal-fade-in` (overlay) + `modal-scale-in` (panel)
- Module pages call `auth.requireAuth()` then `permissions.guardPage(module, type)`

## Forms (design)

Standing rules — see `.cursor/rules/forms.mdc`:

| Rule | Design implementation |
|------|----------------------|
| Placeholder on every input/select | Pattern: input `กรุณากรอก{label}`, select `กรุณาเลือก{label}`; **`type="search"`** → plain `search.placeholder` (`ค้นหา` / `Search`); keys via `data-i18n-placeholder-input` / `-select` or `i18n.fieldPlaceholder()` in CRUD |
| Password visibility | `.password-field` + `passwordToggle.bind(form)` (`js/components/password-toggle.js`); Lucide `eye` / `eye-off` |
| Required mark | `.form-field__required` (red `*`) after label |
| Under-field errors | `.form-field__error` inside `.form-field__error-slot` (fixed height); `error.required` on empty submit; clear on input |

Reference implementation: `pages/login.html`.

## Permissions

- Table `admin_permission`: code `{module}.{type}.{action}`; actions `view|create|update|delete|import|export`
- `is_active` on each permission row — frontend hides/disables action when false even if role grants it
- `permissions.can(code)`, `canAction(module, type, action)`, `listForPage()`, `applyActionButtons()`
- Sidebar visibility: leaf menu requires intersection of role grants with `admin_menu_permission` for that menu (+ superadmin bypass); junction links all six actions per navigable leaf menu in seed
- **Role permission matrix** (`admin_role` form): groups leaf menus by root sidebar section (38 menus / 10 groups); columns = `view|create|update|delete|import|export`; source rows from `admin_menu_permission`; save replaces `admin_role_permission` for the role; **super admin role id=1** locked read-only (all checked, disabled); other roles editable; **auto-view** — checking create/update/delete/import/export auto-checks view and blocks unchecking view while any sibling action remains checked; import/export assignable in matrix even when `admin_permission.is_active` is false (runtime UI still respects `is_active`)
- Page buttons: `data-perm-module`, `data-perm-type`, `data-perm-action`

## Admin shell

Stitch-modern flush-left shell — visual target documented in [`design/reference/stitch-admin-shell/README.md`](../../design/reference/stitch-admin-shell/README.md).

- `js/nav.js` — `nav.resolve(path)`: menu `path` values in seed are relative to design root (e.g. `pages/admin-menu.html`); call before `location.replace` or sidebar `href` when the current page is under `pages/`
- `js/components/layout.js` — sidebar + header + content area; flat header (lang + theme); user + red logout icon in sidebar footer
- `js/components/sidebar.js` — tree from `admin_menu` + `admin_menu_language`, filtered by RBAC; `getBreadcrumb()` / `renderBreadcrumb()` plain-text trail; active leaf uses primary tint + inset ring
- Responsive: sidebar drawer &lt; 1024px; sticky sidebar on desktop; sidebar username hidden on mobile (&lt; 640px)

### Shell surfaces

| Part | Treatment |
|------|-----------|
| Sidebar | Full viewport height; brand + search fixed; **nav scrolls**; footer pinned to bottom (user + logout) |
| Header | Same translucent panel as sidebar; plain breadcrumb; ghost lang + theme icons (no notifications) |
| Page | Dual radial blue wash on `.admin-layout` |

## Typography (admin shell)

CSS tokens in [`design/css/style.css`](../../design/css/style.css): `--text-xs` (0.75rem) through `--text-2xl` (1.25rem). Admin hierarchy:

| Area | Token | Notes |
|------|-------|-------|
| Breadcrumb ancestors | `--text-sm` | muted gray; link hover primary |
| Breadcrumb current (`h1`) | `--text-sm` / `--text-base` desktop | bold foreground |
| Sidebar brand | `--text-xl` bold | icon in primary-tint rounded square |
| Sidebar nav | `--text-sm` | min-height 2.75rem; sub-items with primary left rail |
| Table headers | `--text-xs` semibold | |
| Table body | `--text-base` | |
| Table meta columns | `--text-sm` | path, module, sort_order via `.data-table__cell--meta`; `updated_at` via `.data-table__cell--datetime` (nowrap) |

See `design/design.json` → `layout.adminShell.typography`.

## CRUD list tables

Shared engine: [`design/js/components/crud-list.js`](../../design/js/components/crud-list.js). Rules: [`.cursor/rules/tables.mdc`](../../.cursor/rules/tables.mdc).

- **Page header:** `.crud-page-header` above filter toolbar — `<h1>` title + optional `pageDescriptionKey` description (left); Export + Import (geo only, `canImport: true`) + Create buttons (right); Create `+` icon white on primary; toolbar keeps search + column filters + status filter; breadcrumb leaf uses `<span>` (page `<h1>` lives in content)
- **Table actions:** delete button trash icon uses error red (`#dc2626`) on all CRUD list pages
- **Pagination:** every module table paginates (default **10** rows; options **10 / 25 / 50 / 100**; choice persisted in `sessionStorage`); bar sits **outside** the table card; page pills + prev/next; page resets on search, filter, or page-size change
- **Column filters:** optional `columnFilters: [{ key, labelKey, optionI18nPrefix?, optionLabel? }]` — searchable dropdown per field in toolbar (after text search, before status filter); options from unique sorted `listRows()` values; trigger label `{field}: {value}` via `crud.filterField`; `optionI18nPrefix` for enum labels (e.g. `action.view`); `optionLabel(value)` for FK display names; **admin_permission** — module / type / action; **geo** — province (country), district (country + province), sub-district (country + province + district; ancestor FKs denormalized in `geoConfig` `listRows`)
- **Status filter:** modules with `is_active` set `statusFilter: true` — toolbar segmented buttons **All / Active / Inactive**; filters before sort/pagination
- **Status switch:** modules with `statusSwitch: true` — inline toggle switch on status/default column; updates store on change (requires update permission); optional `statusSwitchField` (default `is_active`; **admin_language** uses `is_default`) and `statusSwitchExclusive: true` (only one default language)
- **Drag sort:** modules with `sort_order` use `sortable: true` + HTML5 native drag — grip-vertical handle column; no `sort_order` field in table or form; drop reassigns `sort_order` in store immediately; tree tables restrict drag to same `parent_id`; geo tables restrict to same parent FK; **disabled while a column header sort is active**
- **Column header sort:** every data column header is clickable — cycle none → asc → desc → none; Lucide sort icons; compare by raw row field (string/number/boolean/ISO date); tree tables flatten to column order while sorted; clearing sort restores default order
- **Sort** (after filter, before slice): default when no header sort — tree tables → group by `parent_id`, sibling `sort_order` → `id`, DFS pre-order; flat with `sort_order` → `created_at`; else `created_at` → `id`
- **Empty state:** when filter/search yields no rows, table `<thead>` still renders column headers (sortable); empty message spans all columns in one `<tbody>` row (`.crud-empty`)
- **Last updated column:** read-only `updated_at` on admin menu, admin language, and all four geo tables — shared `updatedAtColumn` in `module-registry.js`; placed after status/default, before actions; formatted via `i18n.formatDateTime` per [`.cursor/rules/dates.mdc`](../../.cursor/rules/dates.mdc) (`09 ก.ย. 2569 12.30` / `09 Sep 2026 12.30`); sortable via header click

## Dev bar (prototype only)

- `js/components/dev-bar.js` — each page declares `devBar.mount({ toasts, actions })`; list only toast types that page can emit (not a global four-type strip)
- Never shipped to `frontend/`; see `.cursor/skills/design/SKILL.md` for API

## Toast

- `js/components/toast.js` — `toast.show(msg, type)`; types `success` | `error` | `warning` | `info`
- Card-style toast: theme surface, colored left accent, Lucide type icon, message, dismiss button (`toast.close` i18n)
- Container fixed **top-right**; slide-in from right; auto-dismiss ~4s; manual close clears immediately
- **CRUD success toasts** (via `crud-list.js`): `crud.created` (add), `crud.updated` (edit), `crud.reordered` (drag sort), `crud.statusChanged` (inline switch), `crud.deleted` (delete); warning `crud.dragSiblingOnly` for invalid drag scope
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
- **`tree_path` labels:** `n{id}` per segment from root to row (e.g. `n2.n6.n7`) — structural only; sibling display order uses `sort_order`. Seeds derive paths via `ADMIN_SEED_SHARED.assignTreePaths()` in [`design/js/seed/_admin_shared.js`](../../design/js/seed/_admin_shared.js)
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
- Seed version key: `warehouse-design-seed-version` (must match `window.SEED_VERSION` in `js/seed/index.js`, currently `geo-mock-1`)
- `store.init()` re-seeds from `window.SEED` when version mismatches, `admin_user` is missing, legacy `admin_menu` paths still point at deleted pages (e.g. `dashboard.html`), or geo seed is expected in `window.SEED` but `website_country` is empty in the store
- **`pages/db.html`** must load the same geo seed scripts as module pages (`website_country.js` … `website_sub_district_language.js` after `_admin_shared.js`) so DB browser and reset store include geo tables
- Manual reset: DevTools → delete both keys above, or run `store.reset()` in the console
- Seed: `window.SEED` built from per-table files under `js/seed/` (`_admin_shared.js` first, then `website_*` + `admin_*.js`, `website_language.js`) merged by `index.js`
- **Geo demo seed** (`website_country` → `website_sub_district`): 2 countries (TH, SG), 13 provinces, 15 districts, 30 sub-districts — each level has th/en `*_language` rows; Chiang Rai province is inactive for status-filter testing
- Channel name: `warehouse-design`
- API: `store.init|getAll|getById|create|update|delete|reset`

## Breakpoints (mobile-first)

Full definitions in [`design/design.json`](../../design/design.json) → `breakpoints`.

| Name | Rule |
|------|------|
| mobile | &lt; 640px |
| tabletPortrait | ≥ 640px and &lt; 1024px + `portrait` |
| tabletLandscape | ≥ 640px + `landscape` + max-height 900px |
| computer | ≥ 1024px |
| computerWide | ≥ 1440px — content max-width ~1280–1440px, centered |

## Docs

- Phase checklists: `document/checklist/design/`

## Next

- Add CRUD screens under `pages/` (products, orders, …) with `data-perm-*` on actions
- Hand off approved UI to `/frontend`; schema-ready work to `/backend`
