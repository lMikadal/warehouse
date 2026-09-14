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
2. `js/seed/website_language.js` → **`js/seed/_admin_shared.js`** (must load before any seed file that calls `ADMIN_SEED_SHARED`) → `website_*` geo seeds → `admin_*.js` → `setting_*` seeds → `member_setting_*` seeds (incl. `member_setting_relation.js`) → `member_tier*` seeds → `member_user*` (+ address/setting/owner/file/discount/history) seeds → `index.js`
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
- Menus with `path: "#"` may appear in the sidebar when permitted but cannot be login landing targets until wired to a real HTML page
- **Settings submenu** (7 leaves under **ตั้งค่า**, id 14): `pages/setting-bank.html` … `pages/setting-prefix.html` — flat-list CRUD via `module-registry.js`; permissions use `permModule: "setting"`; no import/export UI or permission actions on setting pages
- **Member settings** (nested under **สมาชิก → ตั้งค่า**, menu id 34): `pages/member-setting-credit.html` / `member-setting-group.html` are lookup CRUD via `memberSettingLangConfig`; `pages/member-setting-business.html` is a warehouse-style expandable list (`memberSettingBusinessPage`) — expand shows `member_setting_relation` rows (status, delete); **create/edit business modal** holds credit × group chip multi-selects (optional on create; edit prefill unique credits/groups then cartesian sync on save). Each **new** combo creates a `setting_sale_channel` row with `member_setting_relation_id`, `is_default: true`, and a composed th/en name (`อู่ · เงินสด · ราคาปลีก`). Optional unique `sku`; no `sort_order` on lookup tables.
- **Member tier** (`pages/member-tier.html`, menu id 35): split-pane UX — **left** tier form (badge image upload → `website_file` purpose `member_tier_badge`; preview in `sessionStorage` key `warehouse-design-file-data:{id}`; names + active only; `is_default` from seed/data, badge on cards only); **right** tier cards with green **+** opening a relation modal (`member-tier-modal` on the panel — `overflow: visible` on modal + content like `wh-picker-modal` so chip dropdowns are not clipped at the footer). Profile chip multi-select, cumulative purchase range, percent discount, compact scope radios, brand/category chip multi-select (changing scope clears attr chips when switching brand ↔ category or to/from **all**; keeps chips when toggling within the same kind, e.g. brand ↔ except_brand). Expandable cards list `member_tier_relation` rows in a table-style row (profile + credit badge, purchase range, discount label + badge, scope detail, promotion check, edit/delete on one line); edit relation reopens the same modal (`member-tier-modal--edit`: profile chip `#mt-rel-profiles` read-only; scope/brand/category chips stay interactive). Tier-level purchase/discount/scope stay in schema/seeds only (not on the left form). `chip-multi-select.js` + `member-setting-lib.js` combo labels. Medal placeholder.
- **Member list** (`pages/member-user.html` + `member-user-form.html`, menu id 36): custom list (not modal CRUD) — page header actions (export / import / add) like other CRUD pages; `crud-toolbar` filters (search, date from/to, business select, status button group); four stat cards with Lucide icons (`users`, `user-check`, `user-plus`, `coins`); header-sort table (name+SKU copy, tel, business badge, annual purchase placeholder `0`, last purchase empty, status switch, member since). Full-page form uses shared `form-search-select` for business, tier, prefix, geo cascade, and discount type; `supplier-form member-user-form` wrapper with aligned searchable-select/chip control styling; member modals use `member-user-form-modal supplier-form` for the same chrome. Maps v2 “information” fields onto `member_user`; tax / document / financial → `member_address`; business×credit×group cascade from `member_setting_relation` → `member_user_setting`; staff → `member_user_owner`; avatar `website_file` purpose `member_avatar`; documents `member_file` + purpose `member_document`; special discounts `member_discount` on edit tab **ส่วนลดพิเศษ** — per–credit-type sub-tabs, inner modes **รายการ** (committed discounts — excludes picker-session ids in `bulkDiscountRowIds`; read-only table + edit modal), **ราคาพิเศษ** (only rows added via **เพิ่มสินค้า** picker in the edit session — inline edit + bulk apply bar; **อัปเดตที่เลือก** saves selected rows, removes them from the session, switches to **รายการ**), **หมดอายุ** (expired rows — same inline edit table + bulk apply bar as **ราคาพิเศษ**, no import/add toolbar); discount UX is **percent (%)** only (no baht unit in UI/saves); toolbar import/export toasts; filters search/brand/date; paginated table with brand column; product picker modal (`crud-modal--wide`) with brand/search/pagination + header check-all — confirm adds bulk-session `member_discount` rows for **each** member credit sub-tab (not only the active credit); activity `member_history` + `_language`. Create layout 75/25 cards; edit has header + line tabs (info / **ประวัติการสั่งซื้อ** / discounts / files) and a credit/history/note panel. **Order history tab** reads `order_order` for the member joined to latest `order_payment` (KPI totals, category/brand/time SVG charts from `order_payment_item` lines, product carousel, paginated table with composite status: cancelled / success when `is_full` / pending / overdue when credit + past `credit_date` days from financial address). Seeds: `order_payment`, `order_payment_item`, `order_shipping`; `SEED_VERSION` `member-user-orders-1`. Sidebar **outstanding** tile sums unpaid credit payment balances. No `sort_order` → no drag-and-drop.
- **VAT** (`setting_vat`): singleton — one seed row, edit-only (`view` + `update` permissions; no create/delete); no `sort_order` → `sortable: false` (no drag-and-drop); `showSearch: false` / `showPagination: false` — table only, no toolbar search or pager
- If login still redirects to removed pages (e.g. `dashboard.html`): hard refresh (Ctrl+Shift+R) to bypass cached JS, or use dev-bar **Reset store** / bump `SEED_VERSION` so `store.init()` re-seeds
- Login page: full-bleed split on desktop (brand gradient panel + form column); mobile single card; fixed icon toolbar (lang/theme); leading field icons; placeholders, password eye toggle, required red `*`, under-field validation errors
- **Super Admin CRUD pages** (9 thin HTML wrappers + shared `js/components/crud-list.js` + `js/pages/module-registry.js`):
  - `pages/admin-menu.html` — menu tree (edit only)
  - `pages/admin-permission.html` — permission list (read-only; toggle `is_active`)
  - `pages/admin-language.html` — `website_language` CRUD
  - `pages/website-country.html` … `pages/website-sub-district.html` — geo hierarchy CRUD with `*_language` rows
  - `pages/admin-user.html` — `admin_user` CRUD (role/type/status filters; password toggle on form)
  - `pages/admin-role.html` — `admin_role` + `admin_role_language` CRUD; create/edit modal includes menu-grouped permission matrix (`js/components/role-permission-matrix.js`)
  - `pages/setting-bank.html` … `pages/setting-prefix.html` — setting module flat-list CRUD (`setting_*` + `*_language` where applicable)
  - `pages/member-setting-credit.html` / `member-setting-group.html` — member lookup CRUD (`memberSettingLangConfig`)
  - `pages/member-setting-business.html` — expandable business list + credit×group relations (`member-setting-lib.js`)
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

- Table `system_permission`: code `{module}.{type}.{action}`; actions `view|create|update|delete|import|export` (six rows per feature in seed)
- `is_active` on each permission row — frontend hides/disables action when false even if role grants it
- `permissions.can(code)`, `canAction(module, type, action)`, `listForPage()`, `applyActionButtons()`
- Sidebar visibility: leaf menu requires intersection of role grants with `system_menu_permission` for that menu (+ superadmin bypass); junction links all six actions per navigable leaf menu in seed
- **Role permission matrix** (`admin_role` form): groups leaf menus by root sidebar section (38 menus / 10 groups); columns = `view|create|update|delete|import|export`; source rows from `system_menu_permission`; save replaces `admin_role_permission` for the role; **super admin role id=1** locked read-only (all checked, disabled); other roles editable; **auto-view** — checking create/update/delete/import/export auto-checks view and blocks unchecking view while any sibling action remains checked; import/export assignable in matrix even when `system_permission.is_active` is false (runtime UI still respects `is_active`)
- Page buttons: `data-perm-module`, `data-perm-type`, `data-perm-action`

## Admin shell

Stitch-modern flush-left shell — visual target documented in [`design/reference/stitch-admin-shell/README.md`](../../design/reference/stitch-admin-shell/README.md).

- `js/nav.js` — `nav.resolve(path)`: menu `path` values in seed are relative to design root (e.g. `pages/admin-menu.html`); call before `location.replace` or sidebar `href` when the current page is under `pages/`
- `js/components/layout.js` — sidebar + header + content area; flat header (lang + theme); user + red logout icon in sidebar footer
- `js/components/sidebar.js` — tree from `system_menu` + `system_menu_language`, filtered by RBAC; **location module (map-pin, id 23):** after CMS children, inject active `location_location` rows as virtual sidebar links (`pages/location-location-view.html?id=`) — not stored in `system_menu`; `getBreadcrumb()` / `renderBreadcrumb()` plain-text trail; active leaf uses primary tint + inset ring; groups auto-expand only along the active page’s ancestor chain (not merely because a child has nested submenus); sidebar search expands all groups in the filtered tree so nested hits stay visible
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
- **Pagination:** every module table paginates (default **10** rows; options **10 / 25 / 50 / 100**; choice persisted in `sessionStorage`); bar sits **outside** the table card; page pills + prev/next; page resets on search, filter, or page-size change; opt out with `showPagination: false` (singleton **setting_vat**)
- **Search:** toolbar search on by default; opt out with `showSearch: false` — when search and all filters are off, toolbar row is omitted (**setting_vat**)
- **Column filters:** optional `columnFilters: [{ key, labelKey, ui?, optionI18nPrefix?, optionLabel?, optionValues? }]` — default `ui` is searchable dropdown in toolbar row 1 (after text search, before status filter); `ui: "buttonGroup"` renders segmented **All / options** on toolbar row 2 (same chrome as status filter); options from `optionValues` or unique sorted `listRows()` values; dropdown trigger label `{field}: {value}` via `crud.filterField`; `optionI18nPrefix` for enum labels (e.g. `action.view`); `optionLabel(value)` for FK display names or booleans; **admin_user** — type button group; **setting_payment_method** — `is_sale` / `is_purchase` button groups; **admin_permission** — module / type / action dropdowns; **geo** — province (country), district (country + province), sub-district (country + province + district; ancestor FKs denormalized in `geoConfig` `listRows`)
- **Status filter:** modules with `is_active` set `statusFilter: true` — toolbar segmented buttons **All / Active / Inactive**; filters before sort/pagination
- **Status switch:** modules with `statusSwitch: true` — inline toggle switch on status/default column; updates store on change (requires update permission); optional `statusSwitchField` (default `is_active`; **admin_language** uses `is_default`) and `statusSwitchExclusive: true` (only one default language); extra boolean columns can use `statusSwitchHtml(row, field, labelKey)` with `data-switch-field` — **setting_payment_method** toggles `is_sale` / `is_purchase`; **setting_claim_reason** toggles `is_claim` / `is_return` (`crud-list.js` `bindStatusSwitches` reads field per input)
- **Drag sort:** `sortable: true` **only** when the base table has `sort_order` in schema (see [`.cursor/rules/tables.mdc`](../../.cursor/rules/tables.mdc)); otherwise `sortable: false` — normal table, no grip column; when enabled: HTML5 native drag, drop reassigns `sort_order` in store; tree tables restrict drag to same `parent_id`; geo tables restrict to same parent FK; **disabled while a column header sort is active**
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
- Root list tables use `{module}_list` or `{module}_user`: `product_list`, `warehouse_list`, `supplier_user`, `member_user`
  Children drop the repetition: `product_item` (not `product_list_item`), `member_address` (not `member_user_address`)
- `check:skip-audit` comment in a file exempts it from audit-5 check (use for session/log/junction tables)
- **Column comments:** inline `--` on every non-audit column; English; audit skip sets per table kind (base five / language two / junction `created_at` only)

## File storage

All uploaded files go through [`website_file`](../../design/schema/website_file.sql). Do **not** use `image_url TEXT` or `image_url[]` in new schema.

| Case | Pattern | Examples |
|------|---------|----------|
| Single image (logo, avatar, slip) | `website_file_id BIGINT` FK on parent table | `product_attribute`, `member_user`, `setting_bank` |
| Multiple files / reorder | junction `{entity}_file` + `sort_order` | `product_item_file`, `member_file`, `purchase_order_file` |

- Gallery cover = row with lowest `sort_order` (tie-break `id`)
- `ON DELETE RESTRICT` on `website_file_id` — cannot delete a file still referenced
- API resolves `website_file_id` → signed/public URL from `object_key` at read time

**`website_file.purpose` values:**

| Purpose | Used by |
|---------|---------|
| `product_attribute_logo` | `product_attribute.website_file_id` |
| `member_avatar` | `member_user.website_file_id` |
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

### Product UI (design)

- **Attributes** (category / brand / car): custom split-pane in [`product-attribute.js`](../../design/js/pages/product-attribute.js) — tree nav + inline form; not `module-registry`. Categories link brands via `product_attribute_relation`. Car hierarchy uses `type_car` (brand → model → engine). Tree row spacing matches brand/car at rest; childless category roots still render an empty sub-list for DnD, but CSS collapses it until a row drag is in progress (`.attr-tree__nav:has(.is-dragging)`). Tree drag grip: **category** supports cross-parent reparent + sibling reorder (`parent_id`, `sort_order`, `tree_path`); drop on another root row or its empty sub-list adopts as child (`resolveCategoryDropTarget`); blocks root-with-children under another root — `productAttr.dragHasChildren`; **brand** sibling-only (`crud.dragSiblingOnly`); **car** sibling-only within same `type_car` + `parent_id` (`canReorderCarSiblings` — no cross-brand/model/engine reparent via drag). `is_stopped` column remains on schema/seed; not exposed on car attribute forms in design mockup.
- **Product list**: [`product-list.html`](../../design/pages/product-list.html) + [`product-list.js`](../../design/js/pages/product-list.js) — self-contained page script (does **not** load [`product-browse-lib.js`](../../design/js/product-browse-lib.js)); one table row per **`product_item`** (variant), joined to `product_list` + languages; filters (search, category + brand selects, status/new button groups); table columns include sortable **category** and **brand** from `product_attribute`; pagination via shared `crudList.renderPaginationBar`; car fitment + warehouse modals from store (`pl-detail-*`); row edit/delete + status switch; edit/add → [`product-list-form.html`](../../design/pages/product-list-form.html) + [`product-list-form.js`](../../design/js/pages/product-list-form.js).
- **Product form (design)**: URL `product-list-form.html` (create) or `?product_list_id=` (edit). Mock save writes `product_list` (`tag` from Data tab `plf-tag` only), `product_list_language`, `product_list_car`, `product_list_code`, `product_list_supplier`, `product_item` (variant **SKU** = list SKU prefix + editable suffix; barcode, **qrcode**, dimensions, `is_fake`, …; `is_stopped` preserved on save but not edited in section 2), and **`product_item_language`** names (th/en) from variant section 2. **Generate barcode / QR** buttons fill fields via mock generators + toast (design only). **Section 4** channel prices live on the variant **draft** (`channelPrices` + `removedChannelIds`): every active **default** `setting_sale_channel` is merged at **price 0** (including unsaved variants). VAT display/edit follows active **`setting_vat`** like section 3; inline edit / add / delete update draft only — **`product_item_price`** syncs on main form **Save** (`syncItemChannelPricesToStore`), not per-row store writes. **Data tab partners** (`draft.supplierIds` → `product_list_supplier` on Save) stay **linked** to **section 5 suppliers** on **every variant** (on load, union any variant `product_item_supplier` ids missing from `product_list_supplier` into `draft.supplierIds` so chips match existing rows): on load, union variant `product_item_supplier` ids missing from `product_list_supplier` into `draft.supplierIds`; add/remove on either side updates list chips and all variant `suppliers` draft rows (default cost/discount 0, type baht); deleting one variant’s supplier row removes the partner everywhere. Per-variant cost/discount edits stay on that variant’s draft only. **`product_item_supplier`** syncs on main form **Save** (`syncItemSuppliersToStore`), not per-row store writes. **Section 5 → คลังสินค้า** tab: cascade warehouse→zone→shelf→rack→bin + quantity per row on variant draft (`warehousePlacements`); inline selects/inputs use table control styling + `data-i18n-placeholder-select` / `data-i18n-placeholder-input` (same as lot add-lot; `render()` → `i18n.init` covers rows added later); **section 4 channel** and **section 5 supplier** inline edits and the **lot stock modal** use the same `.product-list-form__lot-edit-input` chrome (border/focus) as warehouse cascade rows; persists on main **Save** via `syncItemWarehousePlacementsToStore` (`product_item_warehouse.bin_id` + `product_item_stock.remain_quantity` mock). **Promotion** textarea in section 4 persists on main form save to `product_item.promotion`. **`setting_sale_channel`**: multiple rows may be **default** (`statusSwitchExclusive: false`). Gallery rows remain display-only. **History tab** (`productListForm.hist*` i18n): two sub-tabs (`data-plf-hist-tab` purchase / sales) reusing the lot-dialog styling (summary stat cards `product-list-form__lot-summary` + colored grouped table `product-list-form__lot-table`) — **read-only, no edit/delete/actions column**. Both sub-tabs share a **filter bar** (`.product-list-form__hist-filters`, controls carry `data-plf-hist-filter`) with a **3-view mode** (`day` = date range `type=date`, `month` = `type=month` range, `year` = year from/to selects from `historyDataYears()`), a **รหัสสินค้า** select (`product_item` variant → filters by `product_item_id`), and a **คู่ค้า/ลูกค้า** select (supplier / `member_name`). **Clear filters** (`data-plf-hist-clear`) resets that tab; **Export** (`data-plf-hist-export`) is a mock no-op that fires a `histExportSoon` toast. Filter state is per-tab (`historyState.purchase` / `.sales`, each `defaultHistoryFilters()` incl. `page`). Rows are grouped **by period** (`historyPeriodKey` slices ISO `ordered_at`; `historyPeriodLabel` for th/en) via `historyPurchaseGroups` / `historySalesGroups`; expand/collapse per period via `data-plf-hist-group`. **ประวัติซื้อ** derives from `purchase_order_item` → `purchase_order` scoped to this product's `product_item` ids; child metrics (received/net cost/cost per unit/sell via `stockTypeSellPrice`/profit) + a **5-card** summary (received / value / min cost·pc / max cost·pc / free total). **ประวัติขาย** derives from `order_order_item` → `order_order`; net sell = `price_per_unit − discount`, net cost = `historyItemAvgCost` (weighted avg purchase cost of the item), profit + profit% derived; **4-card** summary (sold / value / min sell·pc / max sell·pc). Both pagers reuse `crud-pagination` markup (page size **10 / 25 / 50 / 100**, `warehouse-design-page-size`). Seeds: `purchase_order`(+`_item`) and `order_order`(+`_item`) carry `ordered_at` spread across days/months/years so the 3 views + range filters are demonstrable. **Category** uses [`category-cascade-picker.js`](../../design/js/components/category-cascade-picker.js); **partners** use [`chip-multi-select.js`](../../design/js/components/chip-multi-select.js). Sidebar (status, summary, note) on **Data** tab only. **Pricing tab** — variant summary + five-section expanded body (section 1 images without header switch; **section 3** storefront follows active **`setting_vat`** (`exclude` = edit ex-VAT + live incl derived; `include` = edit incl + live ex derived); radios **กำหนดเอง / ตามสต็อก** — stock hides all storefront price fields (retail + wholesale; no copy buttons); save snapshots `vat_rate` + ex-VAT `price` / `price_wholesale`; **section 2** three inner panels — sales / **2.1** specs / **2.2** stock (stacked total stock + minimum; **ดูสต็อก** opens lot modal from `product_item_stock` — grouped table (PO/partner via `purchase_order_item`, bin SKU via placement), derived columns: **ทุนสุทธิ** = `quantity × cost_per_unit`, **ต้นทุนจริง/หน่วย** = `cost_per_unit − discount_per_unit`, **ต้นทุนจริง (รวม)** = `quantity × (cost − discount)`, **กำไร/หน่วย** = `sell_price − cost_per_unit`; sort active used lots with remain first then `created_at`, depleted last; pager page size **5 / 10** only (`warehouse-design-lot-page-size`); wide lot table scrolls horizontally inside the modal with a **sticky actions** column; partner + PO link in one column; lot footer **+** opens add-lot form + [`warehouse-bin-cascade-picker.js`](../../design/js/components/warehouse-bin-cascade-picker.js) (warehouse→bin, unused or same-item bins); `ensurePlacement` creates `product_item_warehouse` when needed; add-lot form uses **`crud-switch`** for **ใช้ล็อตนี้**, optional **คู่ค้า** below **วันที่รับ** (persists `supplier_user_id`), and **`crud-form__row`** pairs for order/free, received/remain, cost/discount; **`is_used`** toggled in row edit (at most one `true` per **`product_item_id`** in design store); inline edit + soft-delete on stock rows) — with required markers on variant official names, product code, and weight; derived stock total + incl-VAT displays read-only). Variant summary **ดูเพิ่มเติม** still opens warehouse bin placement dialog.
- **Product form (full)**: not built — stub page only.
| member (15) | setting+lang+relation, tier+lang+item+item_attribute, member+setting+owner+address+file+discount+history+lang | setting M2M replaces v2 self-FK; name/tel/email back on member row |
| supplier (4) | user, information, contact, bank | v2 had only supplier — information/contact/bank gaps restored; type information/tax_invoice/delivery |
| warehouse (3) | list+lang+condition | barcode/qrcode/rfid/capacity restored; occupancy from product_item_stock via product_item_warehouse.bin_id; condition: amount + amount_active (inactive/empty derived); **product_item_warehouse stores `bin_id` only** — path via `warehouse_list` tree; **one bin → one product_item** among active placements (`.cursor/rules/warehouse.mdc`); backend migration when APIs ship |
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
- Seed version key: `warehouse-design-seed-version` (must match `window.SEED_VERSION` in `js/seed/index.js`, currently `member-user-1`)
- `store.init()` re-seeds from `window.SEED` when version mismatches, `admin_user` is missing, legacy `admin_menu` paths still point at deleted pages (e.g. `dashboard.html`), or geo seed is expected in `window.SEED` but `website_country` is empty in the store
- **`pages/db.html`** must load the same geo seed scripts as module pages (`website_country.js` … `website_sub_district_language.js` after `_admin_shared.js`) so DB browser and reset store include geo tables
- Manual reset: DevTools → delete both keys above, or run `store.reset()` in the console
- Seed: `window.SEED` built from per-table files under `js/seed/` (`_admin_shared.js` first, then `website_*` + `admin_*.js`, `website_language.js`) merged by `index.js`
- **Geo demo seed** (`website_country` → `website_sub_district`): 2 countries (TH, SG), 13 provinces, 15 districts, 30 sub-districts — each level has th/en `*_language` rows; Chiang Rai province is inactive for status-filter testing
- Channel name: `warehouse-design`
- API: `store.init|getAll|getById|create|update|delete|reset`
- **Same-tab sidebar refresh:** after every `store` mutation, `store:change` CustomEvent fires on `document` (in addition to `BroadcastChannel`) so the sidebar re-renders in the active tab without reload

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

## Location UI (design)

- **List:** [`pages/location-location.html`](../../design/pages/location-location.html) — `module-registry` entry `location_location` via `settingLangConfig` (table + create/edit dialog on same page)
- **Detail stub:** [`pages/location-location-view.html`](../../design/pages/location-location-view.html?id=`) — coming soon placeholder; breadcrumb **สถานที่ > {name}**
- Seed: `location_location` (3 rows: 2 active, 1 inactive) + `location_location_language`
- Menu id 24 path → `pages/location-location.html`; sidebar injects active location names under **รายการ** (aligned with frontend V1 `AdminSidebar` map-pin injection)

## Supplier UI (design)

- **List:** [`pages/supplier-user.html`](../../design/pages/supplier-user.html) — `module-registry` entry `supplier_user`; Add/Edit navigate to form via `formHref` (no list modal)
- **Form:** [`pages/supplier-user-form.html`](../../design/pages/supplier-user-form.html) — tabs General (3× `supplier_information`), Contacts, Financial (`supplier_contact`, `supplier_bank`, credit on `supplier_user`)
- Seed: `supplier_user`, `supplier_information`, `supplier_contact`, `supplier_bank` (4 demo suppliers)
- Menu id 22 path → `pages/supplier-user.html`

## Sales order UI (design)

Sidebar group **Sales / ฝ่ายขาย** (`admin_menu` id 37). List screens have menu rows; form/payment sub-pages reuse the parent list path for active state and breadcrumbs (see `menuListPathForCurrentPage` in [`sidebar.js`](../../design/js/components/sidebar.js) — `*-form.html` → list, `order-order-payment.html` → `order-order.html`).

| Menu id | Path | Screen |
|--------|------|--------|
| 39 | `pages/order-store.html` | Store sales list |
| — | `pages/order-store-form.html` | Create/edit store order (no menu row) |
| 55 | `pages/order-order.html` | Picking slip list |
| — | `pages/order-order-form.html` | Pick / verify lines |
| — | `pages/order-order-payment.html` | Payment (counts as picking slip in nav) |
| 56 | `pages/order-store-claim.html` | Process claim / return |
| — | `pages/order-store-claim-form.html` | Claim line form |
| 57 | `pages/order-store-claim-list.html` | Claim / return list |

- **Script bundle:** [`order-html-shell.js`](../../design/js/pages/order-html-shell.js) + page JS; shared boot via `orderLib.mountAdminShell` / `mountAdminContent` → `layout.mount` (sidebar + header).
- **Permissions:** `data-perm-module="order"` + `data-perm-type` per screen; seed `admin_permission` types `order_store`, `order_order`, `order_store_claim`, `order_store_claim_list`.
- **Seed version:** `SEED_VERSION` in [`seed/index.js`](../../design/js/seed/index.js) includes sales menus — use Dev bar **Reset data** if sidebar entries are missing after pull.
- **Order SKU (store):** `PJB-YYYYMM-NNNN-SS` (e.g. `PJB-202603-0025-01`); collapsed family header shows `PJB-YYYYMM-NNNN`; expanded child rows show the same base + `-01`, `-02`, … by sibling order (`familyBaseSku` / `formatFamilySplitSku` in [`order-lib.js`](../../design/js/order-lib.js)). Child orders without sku get `nextFamilySplitSku(parent)` on first pending save, not `nextOrderSku`.
- **Layout/CSS:** All sales order pages (`body[data-perm-module="order"]`) use **full `admin-content` width** — no centered `1280px` cap on `.crud-page` or form shells (same feel as warehouse list). List pages use `crud-page` → `crud-toolbar` (search + `orderLib.toolbarDateFilterHtml` date placeholders + `toolbarSelectOpenHtml` filters) → optional `.order-store-status-filters` badge row → `crud-table-wrap` → `data-table crud-table` with pagination via [`crud-list.js`](../../design/js/components/crud-list.js) (`readStoredPageSize`, `renderPaginationBar`). Column alignment per [tables rule](../../.cursor/rules/tables.mdc). **Picking list** ([`order-order.js`](../../design/js/pages/order-order.js)) paginates parent orders before payment-row expand; expand uses `wh-expand-col` + chevrons like store sales. Row **การจัดการ** actions: green-outline `file-text.svg` (payment view) + primary or inert `pencil.svg` (start pick when `fulfill_status` is `pending` / `in_progress`; no bulk toolbar or row checkboxes). Icon modifiers: `.crud-icon-btn--success-outline`, `.crud-icon-btn--primary`, `.crud-icon-btn.is-inert` in [`style.css`](../../design/css/style.css).
- **Forms/payment/claim:** `crud-card` + sales BEM grids (`.order-store-form__grid`, …) in [`style.css`](../../design/css/style.css) (“Sales order flows” block); desktop two-column grids use **6fr / 4fr** (search + document panel). Inputs use shared `.form-field` markup + i18n placeholders ([forms rule](../../.cursor/rules/forms.mdc)); tel fields bind `tel-input.js` on store form. Toolbar helpers live on [`order-lib.js`](../../design/js/order-lib.js) (`toolbarDateFilterHtml`, `toolbarSelectOpenHtml`, `bindToolbarDateInput`, `paginateRows`).
- **Store order form** ([`order-store-form.js`](../../design/js/pages/order-store-form.js)): product browse **ราคาสุทธิ** and cart **ราคา/หน่วย** share `tieredUnitPriceHtml` (list + wholesale promo when `price_wholesale` applies); cart **ส่วนลด** uses [`order-cart.js`](../../design/js/order-cart.js) `lineTotalDiscount` (member + wholesale savings `(price − price_wholesale) × qty` when `amount_wholesale_price` met); browse price preview uses the same line qty as the cart when the item is already added. Stepped cards (customer → product search → document panel **6fr/4fr**); member picker + **`member_setting_credit` radios** (unique credits from `member_setting_relation` for the member’s business via `memberSettingLib.relationsForBusiness`; walk-in / no member → all active credits) + reset; product toolbar (search, category, **toggle filter row**: product brand / car model / fitment year / OEM code on `product_list` + `product_list_car`); after search, browse rows come from **[`product-browse-lib.js`](../../design/js/product-browse-lib.js)** `listRowsFromStore` + `filterBrowseRows` (same text/category matching as product list `listRows` / `filterRows`), then order-only filters (sellable, car/OEM toggles); table chrome matches product list (product cell + stock + tiered price + packaging + brand + warehouse **ดูเพิ่มเติม**, header sort, **`crud-list` pagination**, `pbl-detail-*` modals); **สินค้าทั้งหมด** tab adds row checkboxes + **เลือกทั้งหมด** / **เพิ่มที่เลือก** bulk add; **เทียบสินค้า** tab same table without bulk chrome, **+** opens compare modal (section heads, detail + qty, cancel/save); document panel collapsible header + dashed empty cart state. Lib loaded via [`order-html-shell.js`](../../design/js/pages/order-html-shell.js) only.
- **Product browse lib** ([`product-browse-lib.js`](../../design/js/product-browse-lib.js)): mirrors product list browse data + cell HTML for **order store form** search results only (not wired on [`product-list.html`](../../design/pages/product-list.html)).

## Next

- Add remaining CRUD screens under `pages/` with `data-perm-*` on actions
- Hand off approved UI to `/frontend`; schema-ready work to `/backend`
