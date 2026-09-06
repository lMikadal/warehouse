# Design knowledge

Customer-facing Warehouse prototype under `design/` — HTML/CSS/vanilla JS only. No bundler, no real DB, no API calls.

## Stack

| Piece | Approach |
|-------|----------|
| Markup | Static HTML (`index.html`, later `pages/*.html`) |
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
2. `js/seed/index.js`
3. `js/store.js`
4. `js/realtime.js`
5. `js/components/*` (when added)
6. Page-specific script

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
- **Self-FK tree tables** (`tree_path`): `parent_id` + `tree_path` (LTREE) + `sort_order`; examples: `admin_menu`, `warehouse_warehouse`, `product_attribute`, `member_tier`
- **Geo chain** (`website_*`): `website_country` → `website_province` → `website_district` → `website_sub_district`; typed parent FK + `sort_order` only (not tree tables)
- **Not trees**: split-document `parent_id` only (`order_order`, `purchase_order_item`); flat lists `sort_order` only (`website_language`, `website_country`, `setting_bank`, `setting_claim_reason`, …)
- Money: `NUMERIC(15,4)` · Rate/percent: `NUMERIC(5,2)` · Quantities: `NUMERIC(15,4)` or `INTEGER`
- Root entities may repeat module in name: `product_product`, `member_member`, `supplier_supplier`
  Children drop the repetition: `product_item` (not `product_product_item`), `member_address` (not `member_member_address`)
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

## Schema modules (87 files in `design/schema/`)

| Module | Tables | Key notes |
|--------|--------|-----------|
| website (10) | `language`, `file`, country+lang, province+lang, district+lang, sub_district+lang | locale registry; geo hierarchy via typed FK + sort_order (no LTREE) |
| admin (9) | user, session, role+lang, permission, role_permission, menu+lang+permission | `admin_user.type`: `superadmin` \| `owner` \| `manager` \| `staff` (default `staff`); `admin_role_id` for fine-grained permissions |
| setting (12) | vat, sale_channel+lang, bank+lang, payment_method+lang, code, claim_reason+lang, prefix+lang | shared `setting_prefix` lookup (person \| company) replaces member/supplier prefix enums |
| location (2) | location+lang | custom named locations (v1 `location_locations`); split from setting module |
| product (14) | attribute+lang+relation, product+lang+code+car+supplier, item+lang+price+stock+stop_log+file | product_product: tag/supplier_sku/note/is_new restored; car stop-sell on product_attribute.is_stopped not product_car; gallery via product_item_file |
| member (15) | setting+lang+relation, tier+lang+item+item_attribute, member+setting+owner+address+file+discount+history+lang | setting M2M replaces v2 self-FK; name/tel/email back on member row |
| supplier (4) | supplier, information, contact, bank | v2 had only supplier — information/contact/bank gaps restored; type information/tax_invoice/delivery |
| warehouse (3) | warehouse+lang+condition | barcode/qrcode/rfid/capacity restored; occupancy from product_item_stock; condition: amount + amount_active (inactive/empty derived) |
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
- Seed: `window.SEED` (currently `{}` until `design/schema/` entities exist)
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

- Add screens under `pages/` and shared UI in `js/components/`
- Add `design/schema/*.sql` then matching seed tables
- Hand off approved UI to `/frontend`; schema-ready work to `/backend`
