# Backend knowledge

Warehouse API under `backend/` — Go 1.27+, Echo v5, PostgreSQL (pgx), goose migrations, env via `caarlos0/env`.

## Layout (community + domains)

```
backend/
├── cmd/
│   ├── server/main.go     # composition root
│   └── seed/main.go       # init | bootstrap | dev SQL seeds
├── internal/
│   ├── api/               # V1Prefix, pagination, ListResponse, Audit embed
│   ├── auth/              # JWT, Bearer + RBAC middleware
│   ├── rbac/              # perm_catalog (wave + catalog route → permission code)
│   ├── config/
│   ├── log/               # slog Setup, Echo middleware, HTTPError
│   ├── infra/
│   │   ├── deps.go        # DB + optional Redis slot
│   │   ├── postgres/      # pool, migrations/, seeds/
│   │   └── redis/         # stub until Redis phase
│   ├── module/
│   │   ├── auth/          # login, refresh, logout, me
│   │   ├── health/
│   │   ├── system/        # system_menu, system_permission, system_language (locales)
│   │   ├── admin/         # users, roles
│   │   ├── setting/       # setting_* CRUD
│   │   ├── product/       # product_attribute (categories, brands, cars)
│   │   ├── supplier/      # supplier_user aggregate
│   │   └── member/        # member settings, tiers, users
│   └── server/
├── env.example
└── go.mod
```

Module path: `github.com/lMikadal/warehouse/backend`.

## Config (`env.example`)

| Variable | Purpose |
|----------|---------|
| `PORT` | HTTP port (default `1323`) |
| `APP_ENV` | `development` / `production` |
| `DATABASE_URL` | **Required** — PostgreSQL DSN |
| `REDIS_URL` | Optional — not connected until Redis phase |
| `DEFAULT_LOCALE` | Default `th` |
| `LOG_LEVEL` | `debug` / `info` / `warn` / `error` (default `info`) |
| `AUTO_MIGRATE` | Optional `true`/`false` — if unset: run goose `up` on server start when `APP_ENV=development` only |
| `JWT_SECRET` | **Required** — min 32 chars; HS256 access tokens |
| `JWT_ACCESS_TTL` | Access token lifetime (default `15m`) |
| `JWT_REFRESH_TTL` | Refresh token lifetime (default `168h`) |

Copy `backend/env.example` → `backend/.env` for local `make backend-dev` / `go run`. On startup, `config.Load` reads `backend/.env` and sets any keys not already present in the process environment (Docker Compose injects vars directly).

## Demo login (seeds)

After `make backend-seed-init`, `make backend-seed-bootstrap`, and (local dev only) `make backend-seed-dev`. Do not use default passwords in production.

| User | Password | Role | Notes |
|------|----------|------|--------|
| `admin` | `admin` | Super Admin (bootstrap) | `type=superadmin`; full nav |
| `staff` | `staff` | Staff (dev) | Design `staffAllowedCodes`; limited product/member/order/warehouse nav |
| `user_view` | `user_view` | Users viewer (dev) | `admin.admin_user.view` + address geo **view** only (country → sub-district); no geo create/update/delete. Re-apply dev seed after changing this row. |
| `user_edit` | `user_edit` | Users editor (dev) | view + create + update on admin users; no delete |
| `role_view` | `role_view` | Roles viewer (dev) | `admin.admin_role.view` only — roles nav; no role mutations |
| `menu_view` | `menu_view` | System menu viewer (dev) | `system.system_menu.view` — System → Menu nav; read-only API |
| `menu_edit` | `menu_edit` | System menu editor (dev) | menu view + create + update; no delete |
| `perm_view` | `perm_view` | System permission viewer (dev) | `system.system_permission.view` — System → Permission nav |

`backend-seed-dev` is refused when `APP_ENV=production` (`cmd/seed`). Dev SQL runs in order: `00_fix_geo_permission_codes.sql` (legacy `admin.website_*` → `admin.system_*` on ids 31–54) then `01_rbac_dev_fixtures.sql`. In Docker: `docker compose exec backend sh -c 'cd /app && go run ./cmd/seed dev'`.

## Logging

- **Setup:** [`internal/log`](../../backend/internal/log/) — `Setup(cfg)` after `config.Load` in `cmd/server` and `cmd/seed`; sets default `slog` handler.
- **Format:** human-readable **text** when `APP_ENV` is not `production`; **JSON** when `APP_ENV=production` (Docker/log aggregators).
- **HTTP:** `EchoMiddleware()` — `RequestID` + request log (`method`, `uri`, `status`, `latency`, `request_id`); skips `GET /api/v1/health`.
- **Errors:** handlers call `log.HTTPError(c, msg, err)` before returning **5xx**; do not log secrets or `Authorization` values.

Agent rule: [`.cursor/rules/logging.mdc`](../../.cursor/rules/logging.mdc).

## Auto-migrate on start

Before HTTP listen, [`cmd/server`](../../backend/cmd/server/main.go) may run goose `up` on [`internal/infra/postgres/migrations/`](../../backend/internal/infra/postgres/migrations/):

| Condition | Migrate on start? |
|-----------|-------------------|
| `APP_ENV=development` and `AUTO_MIGRATE` unset | Yes |
| `AUTO_MIGRATE=true` | Yes |
| `AUTO_MIGRATE=false` | No |
| `APP_ENV=production` (unset `AUTO_MIGRATE`) | No |

Seeds are **not** run on start — use `make backend-seed-init` then `make backend-seed-bootstrap` (and `make backend-seed-dev` locally). Manual migrate still works: `make backend-migrate-up`.

## API versioning

Public routes live under **`/api/v1`** by default (`internal/api.V1Prefix`, set at startup from env **`API_V1_PREFIX`** — default `/api/v1`, see `backend/env.example` and `infrastructure/env.example`).

## Health

| Method | Path | Auth | Response |
|--------|------|------|----------|
| `GET` | `/api/v1/health` | none | `200` `{"status":"ok"}` |

## Auth

Public:

| Method | Path | Body |
|--------|------|------|
| `POST` | `/api/v1/auth/login` | `{ "username", "password" }` → tokens + `user` |
| `POST` | `/api/v1/auth/refresh` | `{ "refresh_token" }` |
| `POST` | `/api/v1/auth/logout` | optional `{ "refresh_token" }` → `204` |

Bearer-only (session present; **no** route permission catalog):

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/api/v1/auth/me` | Current user profile |
| `GET` | `/api/v1/auth/nav` | Role-filtered sidebar tree + `landing_path` (first permitted leaf in DFS menu order). `is_dialog` rows still include `path` in JSON for client sidebar/breadcrumb active matching; `landing_path` skips dialog leaves. |
| `GET` | `/api/v1/auth/permissions` | Active permission codes for UI gating: `{ "codes": ["module.type.action", …] }` — superadmin gets all active codes; others from `admin_role_permission` |

Nav visibility (non-superadmin): leaf menus with a real `path` must have a **`system_menu_permission`** row to the menu’s **`system_permission`** row with `action = 'view'`; role must hold that code via `admin_role_permission`. Group rows (`path` empty) and leaves under **`is_superadmin_only`** still appear when the user has view on permitted descendants (e.g. `system.system_menu.view` → “เมนู” under “ผู้ดูแลระบบสูงสุด”). Implemented in [`MenuPermissionRepository.LoadMenuViewCodes`](../../backend/internal/module/system/menu_permission_repository.go) + [`NavService`](../../backend/internal/module/system/nav_service.go). No runtime `ViewPermissionCode` computation.

Login / refresh responses include `landing_path` (same resolver as `/auth/nav`).

Sessions stored in `admin_user_session` (hashed refresh token + access `jti`). Refresh rotates session row.

## Protected routes (RBAC)

Protected API groups require `Authorization: Bearer <access_token>` and RBAC permission code unless user `type` is `superadmin` (includes `/api/v1/system/*`, `/api/v1/admin/*`, `/api/v1/website/*`, …).

Permission codes: `{module}.{type}.{action}` — route → code mapping in [`internal/rbac/perm_catalog.go`](../../backend/internal/rbac/perm_catalog.go): **wave 1** four resources (`WavePermPages`) plus **catalog** resources as they ship (`CatalogPermPages`, e.g. `admin_language`, `supplier_user`, `member_tier`, **order** ten types `order_ticket` … `order_sales_claim` under `/api/v1/order/*`). Init seed rows in [`06_system_permission_catalog.sql`](../../backend/internal/infra/postgres/seeds/init/06_system_permission_catalog.sql) are **not** enough for runtime checks: each shipped API prefix must also appear in Go `CatalogPermPages`, or `RequirePermission` returns `403` **`no permission mapping`**. Regenerate SQL via [`frontend/scripts/lib/perm-catalog-seed.ts`](../../frontend/scripts/lib/perm-catalog-seed.ts) + `gen-system-*-seed.ts` (mirrors design `PERM_PAGES`). Agent checklist: [`.cursor/rules/permissions.mdc`](../../.cursor/rules/permissions.mdc).

## System menus

| Method | Path | Permission (non-superadmin) |
|--------|------|-----------------------------|
| `GET` | `/system/menus` | `system.system_menu.view` |
| `GET` | `/system/menus/permission-matrix` | `system.system_menu.view` — role edit UI: `{ "groups": [{ "root_id", "root_label", "rows": [{ "menu_id", "label", "permissions": { "view": id, … } }] }] }` (locale via `Accept-Language`; only permissions with `is_active = true` appear in `permissions`) |
| `POST` | `/system/menus` | `system.system_menu.create` |
| `PATCH` | `/system/menus/move` | `system.system_menu.update` |
| `PATCH` | `/system/menus/:id` | `system.system_menu.update` |
| `DELETE` | `/system/menus/:id` | `system.system_menu.delete` |

Query: `page`, `limit`, optional `search`, optional `is_active` (`true`|`false`), optional `sort` + `order` (`asc`|`desc`; columns: `label`, `module`, `path`, `is_active`, `updated_at`). Search/status filters keep matching rows plus ancestors, then default tree order; when `sort`/`order` are set, flat sort on the filtered set before pagination. List items include `names: { th, en }`, `tree_path`. Default order: DFS sibling `sort_order` → `id`.

## System permissions

| Method | Path | Permission |
|--------|------|------------|
| `GET` | `/system/permissions` | `system.system_permission.view` — query: `page`, `limit`, `search`, `module`, `type`, `action`, `is_active`, optional `sort`/`order` (whitelist: `code`, `module`, `type`, `action`, `is_active`, `created_at`, `updated_at`; default order `created_at ASC, id ASC`) |
| `GET` | `/system/permissions/filters` | `system.system_permission.view` — optional query `module`; response `{ "modules", "types", "actions" }` (distinct values from `system_permission`, non-deleted; `types` scoped when `module` set) |
| `PATCH` | `/system/permissions/:id` | `system.system_permission.update` (body: `{ "is_active" }` only) |

## Admin roles / users

| Resource | Paths | Prefix codes |
|----------|-------|--------------|
| Roles | `GET/POST /admin/roles`, `GET/PATCH/DELETE /admin/roles/:id` | `admin.admin_role.*` |
| Users | `GET/POST /admin/users`, `GET/PATCH/DELETE /admin/users/:id` | `admin.admin_user.*` |
| Users filters | `GET /admin/users/filters` | `admin.admin_user.view` — query: `search`, `page`, `limit`, optional `is_active`, optional `admin_role_id` (single-role label resolve); response `{ "roles": [{ "id", "name" }], "meta" }` for role combobox on user list/form without `admin.admin_role.view` |

Role write payloads include `names: { th, en }`, `permission_ids[]`. User passwords bcrypt-hashed; never returned in JSON.

Roles list accepts `?is_active=`, optional `sort`/`order` (`name`, `is_active`, `updated_at`; default `created_at ASC, id ASC`). Inline status switch: partial `PATCH /admin/roles/:id` with `{ "is_active": false }` only (other fields optional).

Users list accepts `?status=`, `?type=`, `?admin_role_id=` (not `is_active`), optional `sort`/`order` (`username`, `email`, `type`, `status`, `last_login_at`, `updated_at`; default `created_at ASC, id ASC`). Partial `PATCH` may set `{ "status": "inactive" }` among other fields. Optional `password_credit` / `password_discount` (plaintext, bcrypt-hashed server-side) apply only when the user’s effective `type` is `superadmin`; otherwise `400 validation_error`. Downgrading `type` away from `superadmin` clears `password_credit_hash` and `password_discount_hash`. Hashes are never returned in JSON.

## System languages (locale registry)

Table `system_language`: locale registry for `*_language` FKs; columns include `sort_order`, `is_active`, exclusive `is_default` (partial unique index requires active default). Renamed from `website_language` via migration `20260316100000_system_language_rename.sql`.

| Method | Path | Permission |
|--------|------|------------|
| `GET` | `/system/languages` | `admin.admin_language.view` — `page`, `limit`, `search`, optional `is_active`, optional `sort`/`order` |
| `GET` | `/system/languages/:id` | `admin.admin_language.view` |
| `POST` | `/system/languages` | `admin.admin_language.create` — `{ "locale", "name", "is_active"?, "is_default"? }` |
| `PATCH` | `/system/languages/reorder` | `admin.admin_language.update` — `{ "drag_id", "target_id" }` → `204` |
| `PATCH` | `/system/languages/:id` | `admin.admin_language.update` — partial `locale`, `name`, `is_active`, `is_default` |
| `DELETE` | `/system/languages/:id` | `admin.admin_language.delete` — soft delete |

Setting `is_default: true` clears other defaults and forces `is_active: true`. Deactivating the current default returns `409`. Handlers: [`internal/module/system/language_*.go`](../../backend/internal/module/system/).

Migration `20260315100000_website_language_is_active.sql` adds `is_active` (applied before table rename).

## System address geo (country → sub-district)

Tables: `system_country`, `system_province`, `system_district`, `system_sub_district` + `*_language` companions (migration `20260316200000_system_address_geo.sql`). List APIs join `Accept-Language` for display `name`; create/patch accept `names: { th, en }`. Reorder is sibling-scoped by typed parent FK (`system_country_id`, `system_province_id`, `system_district_id`). **List SQL** (WHERE, default/order-by, parent label subqueries): [`address_geo_list_sql.go`](../../backend/internal/module/system/address_geo_list_sql.go); CRUD/reorder stay in [`address_geo_repository.go`](../../backend/internal/module/system/address_geo_repository.go). Integration list tests: `go test -tags=integration ./internal/module/system/…` with `DATABASE_URL` set.

| Method | Path | Permission prefix |
|--------|------|-------------------|
| CRUD + list | `/system/countries`, `/provinces`, `/districts`, `/sub-districts` | `admin.system_country.*`, `admin.system_province.*`, … |
| Filters (parent lookup) | `GET /system/{resource}/filters?facet=countries\|provinces\|districts` | **Same** as list on `{resource}` (e.g. `GET /system/districts/filters` → `admin.system_district.view`) — query: `search`, `page`, `limit`, cascade `system_country_id` / `system_province_id` / `system_district_id`, optional `id` for label resolve; response `{ "items": [{ "id", "name" }], "meta" }` |
| Reorder | `PATCH …/reorder` | same module `.update` |

List filters: `search`, `is_active`, `page`, `limit`, `sort`/`order`; provinces+ add `system_country_id`; districts+ add `system_province_id`; sub-districts add `system_district_id` (and optional country filter via join). **Default list order** (no `sort`/`order`): countries by row `sort_order`; provinces/districts/sub-districts by immediate parent’s `sort_order`, then parent FK, then row `sort_order` → `created_at` → `id` (matches sibling-scoped reorder). Sub-district list/get SELECT puts `t.postcode` after `t.updated_at` so `scanGeoListRow` column order matches (id, sku, name, sort, active, updated, postcode, parent…).

## List mutations

Convention ([`.cursor/rules/crud-mutations.mdc`](../../.cursor/rules/crud-mutations.mdc)); per-table checklist: [`inventory-crud-mutation-apis.md`](../checklist/backend/inventory-crud-mutation-apis.md).

| Pattern | When | Endpoint |
|---------|------|----------|
| Active toggle | Column `is_active` on list table | `GET ?is_active=` + `PATCH /:id` `{ "is_active" }` |
| Flat drag sort | List table has `sort_order` (no tree) | `PATCH /reorder` `{ "drag_id", "target_id" }` → `204` |
| Tree drag sort | `parent_id` + `tree_path` | `PATCH /move` `{ "drag_id", "target_id", "zone" }` → `204` |

Helpers: [`internal/tree`](../../backend/internal/tree/) (`ApplyDrop`, `ReorderSiblings`, `RecomputePaths`, `PersistParentScopedSiblingReorder` for whitelisted parent-scoped child tables e.g. supplier contact/bank). HTTP: [`internal/httputil`](../../backend/internal/httputil/) (`PathID`, `PathIDValidation`, `ActorID`, `ReorderBody`) — use instead of per-module `pathID` / `actorID` copies. RBAC: `PATCH` on subpaths `/move` and `/reorder` maps to `{module}.{type}.update` via resource prefix match.

**Exceptions:** `admin_user` uses `status`; `system_permission` list is read-only but uses the same active patch shape; `system_language` also has exclusive `is_default`; nested rows and `*_file` galleries reorder on the parent API.

## Migrations and seeds

- **Goose:** `internal/infra/postgres/migrations/` — **schema only** ([migrations-seed.mdc](../../.cursor/rules/migrations-seed.mdc))
- **Seeds:** `seeds/init/` (catalog), `seeds/bootstrap/` (super admin), `seeds/dev/` (local RBAC fixtures; ids roles/users 2–8)

| Make target | Purpose |
|-------------|---------|
| `make backend-migrate-up` | Apply migrations manually (`DATABASE_URL`) |
| `make backend-seed-init` | Run init SQL |
| `make backend-seed-bootstrap` | Run bootstrap SQL (role/user 1) |
| `make backend-seed-dev` | Run dev fixtures (blocked in production) |
| `make backend-run` | `go run ./cmd/server` |
| `make backend-dev` | air |
| `make backend-test` | `go test ./...` |
| `make backend-file-cleanup` | `go run ./cmd/file-cleanup` — soft-delete unreferenced `system_file` rows + remove MinIO objects (default grace 1h; `-grace` flag) |

Wave 1 schema: shared enums, locale registry (`system_language` after rename), `system_*` menu/permission, `admin_*` identity/RBAC, `admin_user_session`.

**Object storage (dev):** Compose runs MinIO; backend receives `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `S3_REGION`, `S3_USE_SSL`, `S3_PUBLIC_BASE_URL` (browser URL for `<img src>`, e.g. `http://localhost:9002`; see [`infrastructure/env.example`](../../infrastructure/env.example)).

**Upload API:** `internal/module/system` — authed routes (Bearer only, no RBAC catalog row): `POST /api/v1/system/files` (multipart `file` + `purpose`), `GET/DELETE /api/v1/system/files/:id`. Images only (jpeg/png/webp/gif, max 5MB) except **`member_document`** and **`purchase_order_attachment`** (pdf/jpeg/png, max 10MB); writes MinIO then inserts `system_file`. Response includes public `url`. Delete soft-deletes metadata and removes object when not referenced (`409` if still linked from setting bank/sale channel). **`DeleteIfUnreferenced`** — same as delete when nothing references the id (used after setting bank/sale-channel **DELETE** or **PATCH** that clears/changes `system_file_id`). **`CleanupOrphans`** / **`make backend-file-cleanup`** — removes active `system_file` rows with no FK from `IsReferenced` and `created_at` older than grace (orphans from pre-deferred upload or abandoned drafts).

**Document numbering (`system_code_prefix`):** migration `20260919130000_system_code_prefix.sql`; init [`seeds/init/10_system_code_prefix.sql`](../../backend/internal/infra/postgres/seeds/init/10_system_code_prefix.sql). Table holds per-document counters (`period_key`, `last_seq`) and format config (`prefix`, `reset_period`, `format_style`, `seq_width`, `timezone`). Shared allocator [`CodePrefixRepository.NextCode`](../../backend/internal/module/system/code_prefix_repository.go) runs in the caller’s transaction (`SELECT … FOR UPDATE`, bump seq, format `{prefix}-{YYYYMM}-{seq}`). **`reset_period`:** `none` → bucket `''`; `year` → `YYYY`; `month` → `YYYYMM` (counter resets when bucket changes). Seed **`code_key`:** `member_user` (MEM), `order_list` (PJB family base — order module appends split `-SS` outside this table), `purchase_order` (PO). **`POST /member/users`:** omit, null, or blank `sku` → auto-assign via `NextCode(..., "member_user", now)` before insert; explicit `sku` still allowed when provided.

**Member module:** migration `20260919100000_member_module.sql` — all `member_*` tables from `design/schema/`; adds FK `setting_sale_channel.member_setting_relation_id` → `member_setting_relation`. Handlers: [`internal/module/member`](../../backend/internal/module/member/) on RBAC group `/api/v1/member` — `/settings/credits|groups|businesses` (th/en names, optional `sku`, no list reorder); business create/patch may sync `credit_ids` × `group_ids` into `member_setting_relation` (`RelationRepository.SyncBusinessRelations` — load all relation rows, close `Rows`, then soft-delete extras; API error code `relation_sync_failed`); `/settings/businesses/:id/relations`, `PATCH|DELETE /settings/relations/:id`; `/tiers` tree CRUD + `GET /tiers/stats` + `GET /tiers/filters?facet=setting_relations` (business×credit×group profile picker under **`member.member_tier.view`**, no `member_setting_business.view`) + list items include `member_count`, `relation_count`, `system_file_id` (tier badge) + `PATCH /tiers/reorder|move`; tier **`GET`** embeds `profile_business_title` / `profile_credit_name` on each tier relation row; tier delete rejected when `member_user` rows reference the tier + nested tier relations; `/users` aggregate (`GET /users/:id` embeds read-only `setting_prefix_name` and `website_*_name` on the root row and each `addresses[]` entry — locale from `Accept-Language`, `th` fallback — so view-only roles need not call setting/geo APIs for display; addresses in `member_user_address`, setting combos, owners, **`files[]`** from `member_user_file` joined to `system_file`; `PATCH /users/:id/files/reorder` with `{ drag_id, target_id }`; discounts in `member_user_discount` (`POST|PATCH …/discounts` bind `date_start`/`date_end` as `YYYY-MM-DD` strings — not raw `*time.Time` JSON, which Echo rejects and surfaced as misleading `product_item_id required`); **`histories[]`** append-only (`member_history` + language) with locale `title` on GET — auto-insert on **member create**, **POST …/files**, and **POST …/discounts** (th/en title + description; write body uses `YYYY-MM-DD` for `date_start`/`date_end` — Echo cannot bind date-only strings into `*time.Time`); manual `POST …/histories` still supported) + `GET /users/stats` (`total_customers`, `active_members`, `new_this_month` for all callers with `.view`; **`sales_this_month` only when JWT `user_type` is `superadmin`**) + `GET /users/filters?facet=` (`businesses`, `business_relations` requires `business_id`, `setting_relations` items include `business_id`/`credit_id`/`group_id`, `tiers`, `prefixes`, `admin_users`, `product_items` (optional `sku`, `product_name`, `brand_name`, `brand_id`, `price` — **`price` uses [`product.DisplayPriceSellSQL`](../../backend/internal/module/product/display_price_sql.go)** / active `setting_vat`: `exclude` → `product_item.price`, `include` → `price_vat`, with oldest active stock `sell_price` when `type_price=stock`; same as product item browse); query `brand_id`, optional `category_id`), `product_brands`, `product_brand_categories` (requires `brand_id`; items include `parent_id`, `sort_order` — brand-linked categories plus ancestor and descendant nodes for cascade UI via `product_attribute_relation`), `member_credits`, geo pickers `provinces` / `districts` / `sub_districts` (active rows only; optional `system_country_id`, `system_province_id`, `system_district_id` cascade + `id` label resolve — backed by system address tables, no `admin.system_*` permission required) under **`member.member_user.view`**) + list filters `created_from`/`created_to` on `created_at`. Migration `20260919120000_member_user_child_table_rename.sql` renames address/discount/file child tables. Permissions: `member.member_setting_*`, `member.member_tier.*`, `member.member_user.*` (catalog paths). Dev demo: `seeds/dev/15_member_demo.sql` after `10_setting_catalog.sql`, `14_product_demo.sql`, init geo; links sale channels 6–13 to relation ids. Postman folder **Member**.

**Supplier module:** migration `20260917100000_supplier_module.sql` — `supplier_user`, `supplier_information` (PK `supplier_user_id` + `type`), `supplier_contact`, `supplier_bank`. Handlers: [`internal/module/supplier`](../../backend/internal/module/supplier/) on RBAC group `/api/v1/supplier` — resource prefix `/supplier/users` (`supplier.supplier_user.*`). List joins contact information for display; `GET /:id` returns aggregate (`information`, `contacts`, `banks`); each `information.*` object may include read-only `setting_prefix_name` and `website_*_name` labels (locale from `Accept-Language`, `th` fallback) so view-only supplier roles need not call setting/geo APIs for display; create accepts nested contacts/banks; nested `POST/PATCH/DELETE` on `/:id/contacts/:contactId` and `/:id/banks/:bankId`; `PATCH /:id/contacts/reorder` and `PATCH /:id/banks/reorder` with `{ "drag_id", "target_id" }` renumber nested `sort_order` under that user (same RBAC as nested update); delete soft-deletes user + children and removes `supplier_information` rows. Dev demo: `seeds/dev/11_supplier_demo.sql` (after `10_setting_catalog.sql` + init geo).

**Location module:** migration `20260918120000_location_module.sql` — `location_location`, `location_location_language`. Handlers: [`internal/module/location`](../../backend/internal/module/location/) on RBAC group `/api/v1/location` — `/locations` CRUD + `PATCH /locations/reorder` (`location.location_location.*`). List: `page`, `limit`, `search`, `is_active`, optional column `sort`/`order` (default `sort_order ASC`, tiebreaker `created_at`, `id`). Create/update require th/en `names`. Dev demo: `seeds/dev/12_location_location.sql` (3 rows, mirrors design seed). Postman folder **Location**.

**Warehouse module:** migrations `20260918130000_warehouse_module.sql` (`warehouse_list`, `warehouse_list_language`, `warehouse_condition`, LTREE tree) and `20260918140000_product_module.sql` (full product schema for bin stock aggregates). Handlers: [`internal/module/warehouse`](../../backend/internal/module/warehouse/) on RBAC group `/api/v1/warehouse` — `/lists` CRUD, `GET …/:id/stats`, `GET …/:id/tree`, `PATCH …/:id/conditions`, `PATCH /lists/reorder`, `PATCH /lists/move` (`warehouse.warehouse_list.*`). **Zone create:** optional `shelf` / `rack` / `bin` objects (`amount`, `amount_active`) on `POST /lists` upsert `warehouse_condition` in the same transaction; edit uses `PATCH …/:id/conditions`. Zone quotas enforced on create/reparent/active toggle (`400` `zone_quota_exceeded` on create/move when quota blocks; other move validation → `validation_error`); delete blocked when bins under subtree have stock. Dev demo: `seeds/dev/13_warehouse_list.sql`, `14_product_demo.sql` — regenerate via `node backend/scripts/gen-warehouse-product-dev-seed.js`. Postman folder **Warehouse**. Auth nav exposes `is_dialog` on menu nodes (Management menu id 27).

**Order quotation (ใบเสนอราคา):** migrations `20260920170000_order_quotation_module.sql`, `20260920180000_order_quotation_reject.sql` — `order_quotation`, `order_quotation_item`, `order_quotation_file`, **`order_quotation_reject`** (return-for-edit audit: `note`, `status`, `next_status`); nullable **`order_list.order_quotation_id`** and **`order_payment.order_quotation_id`** on existing order tables; SKU prefix **`QT`** (`system_code_prefix` id 4). Handlers: [`internal/module/order`](../../backend/internal/module/order/) — prefix **`/quotations`**: list (filters `search`, `status`, `overdue`, date range, `created_by`), count, **`GET /filters?facet=sellers`**, CRUD, **`POST …/submit|approve|reject|return|accept|payment|picking|fulfill-check|fulfill|duplicate`**, **`PATCH …/status`** (cancel). Status: draft → pending → **success** (superadmin **approve**) or **cancelled** (superadmin **reject**) or draft (**return** + reject log); legacy **`approved`** still supported for accept/payment; payment may also set **success**. **Return** body `{ "note" }` required. **PATCH** quotation items: send optional line **`id`** (`order_quotation_item.id`) to update in place; omitted ids are inserted; lines not in the payload are soft-deleted. **GET `/quotations/:id`** includes optional **`latest_reject`** (newest `order_quotation_reject` row: `note`, `status`, `next_status`, `created_at`, `created_by_name`). **Accept** when status is **pending**, **approved**, or **success**; body `mode`: `payment` | `credit` (requires **`credit_date`**). **Fulfill-check** (requires `accept_mode`): returns `item_count`, `out_of_stock_count`, `price_changed_count` (compares line `price_per_unit` to storefront sell price via `DisplayPriceSellSQL` — `price_vat` when active VAT is `include`, else `price`; stock-type items prefer active lot `sell_price`), `credit_ok` / `credit_limit` (credit mode: financial address `credit_limit >= grand_total`). **Fulfill**: creates/reuses `order_list` + items (quote lines buffered then inserted — do not `Exec` while `Rows` is open on the same tx), upserts `order_list_shipping` `store`+now, upserts `order_payment` (`payment`|`credit`) + **`order_payment_item`** snapshots from `order_list_item` + methods; credit over-limit requires `credit_approval_code` matching a superadmin `password_credit_hash`. **`only_in_stock: true`**: rejected when `out_of_stock_count >= item_count`; otherwise creates a **child** quotation (`parent_id`, `status=success`, copied `accept_mode`/member/VAT) with in-stock lines only, then writes order/payment docs for that child and returns `{ order_list_id, quotation_id }` (source QT unchanged). **Payment** likewise syncs `order_payment_item` from order lines. Detail **`fulfilled`**: true when an `order_list` for the quotation has `order_list_shipping`. **Duplicate** optional `use_current_prices` reloads line prices from storefront sell price (same as fulfill-check). **Overdue** is query-only (`valid_until < today` and status in draft/pending/approved). **Receipt lock:** paid `order_payment` for quotation id blocks non-superadmin edit/cancel (`409`). Approve/reject/return: **superadmin** only. Permissions: **`order.order_quotation.*`** (catalog ids 229–234). Menu id **58** `/admin/sales/quotation`. Postman **Order → Quotations**.

**Order list / store sales:** migrations `20260920120000_order_list_module.sql`, `20260920130000_drop_order_list_print_log.sql`, `20260920140000_order_list_vat_snapshot.sql`, `20260920150000_order_list_item_status_cancelled_rejected.sql`, `20260920160000_order_list_shipping_rename.sql` (`order_shipping` → **`order_list_shipping`**, 1:1 with `order_list`: `type`, `received_at`) — tables `order_list`, `order_list_item`, … **`order_list`** / **`order_list_item`** store **`vat_type`** (`setting_vat_type`) + **`vat_rate`** snapshots on create/update (header from active `setting_vat`; lines from `product_item` or header fallback). Column **`member_setting_credit_id`** (not `member_setting_relation_id`). Handlers: [`internal/module/order`](../../backend/internal/module/order/) — prefix **`/store-sales`**: list (roots only; default sort **`created_at DESC`, `id DESC`**; **`item_count`** = `SUM(order_list_item.amount)`, **`total_price`** = sum of line totals with computed fallback when `total_price` is 0), count, **`GET /filters`**, CRUD, **`PATCH …/:id/shipping`** (upsert `order_list_shipping`; draft/pending), `PATCH …/:id/status`. Create/update body may include **`parent_id`** (addon slips under a family root); **PATCH** update keeps the existing **`parent_id`** when the JSON field is omitted (`COALESCE` in repository). Create/update body may include **`shipping`** `{ type, received_at }`. Detail GET returns **`shipping`** + line `vat_type` / `vat_rate`. **PATCH** store-sales items: optional line **`id`** (`order_list_item.id`) updates in place; omitted ids insert; lines not in payload soft-delete. Picking audit via **`member_history`** on **`pending`**. SKU: `NextCode(..., "order_list")` + `-01`. Permissions: **`order.order_store.*`**. Postman **Order → Store sales**.

**Order picking desk (ใบจัดสินค้า):** same `order_list` tables; prefix **`/orders`** ([`picking_repository.go`](../../backend/internal/module/order/picking_repository.go)). List/count baseline (`pickingListWhere`) is **`order_list.status = 'success'`** — only settled sale documents reach the desk; `pending` / `cancelled` / `rejected` / `draft` slips are hidden. The query param **`status`** filters **`order_list.fulfill_status`** (`pending` / `in_progress` / `success` / `fail`), which the UI chips use; the sale-document status is returned as **`doc_status`**. `PATCH /:id/status` writes `fulfill_status`, not the document status. **`order_payment`** (migration `20260922210000_order_payment_member.sql`) stores its own billing-member snapshot: **`member_user_id`**, **`member_setting_credit_id`**, **`member_name`**, **`member_tel`**, **`member_email`** — same shape as `order_list`, independent of the slip header. **`POST/PATCH /orders/:id/payments`** accept those fields on [`PickingPaymentSaveInput`](../../backend/internal/module/order/picking_types.go); on **create**, when all member fields are empty/omitted, the repo copies from the parent **`order_list`** row. Payment save does **not** update `order_list` member columns.

**Order store claim (shop floor CLM):** prefix **`/store-claims`** ([`store_claim_repository.go`](../../backend/internal/module/order/store_claim_repository.go)) — file against a settled **`order_payment`** via **`POST /store-claims/:paymentId/claims`**. On create, **`type = return`** inserts **`order_claim.status`** and each **`order_claim_item.status`** as **`success`** (return is closed at filing time). **`type = claim`** keeps header and lines **`pending`** for the purchasing **`/sales-claims`** workflow. Claim-quota math still counts active statuses including **`success`**. List prefix **`/store-claim-lists`**: paginated list, count, **`GET /:id`** (same JSON as **`GET /sales-claims/:id`** — read-only document for store list view; **`order.order_store_claim_list.view`**), **`DELETE /:id`** (pending only). Permissions: **`order.order_store_claim.*`** / list **`order.order_store_claim_list.*`**. Postman **Order → Store claims**.

**Order sales claim (purchasing supplier flow):** prefix **`/sales-claims`** ([`sales_claim_repository.go`](../../backend/internal/module/order/sales_claim_repository.go)) — purchasing's view of the `type = claim` documents the shop filed, fixed to `type=claim`. Status path: **`pending` → `acknowledged` → `waiting_supplier` → `success`** (or `rejected` / `cancelled`); no new enum values. Migration `20260922220000_order_claim_note_supplier.sql` adds **`order_claim.note_supplier`** (the message sent with the supplier document; mirrored in [`design/schema/order_claim.sql`](../../design/schema/order_claim.sql)); **`order_claim.supplier_user_id`** already existed. **`GET /:id`** now returns `note_supplier`, the supplier snapshot (`supplier_user_id`/`supplier_name`/`supplier_address`/`supplier_tel` via `supplier_information … type='contact'`) and reference dates (`order_created_at`, `delivery_at` from `order_list_shipping.received_at`). **`PATCH /:id`** (`SalesClaimPatchInput` `supplier_user_id?` / `note_supplier?`) assigns the supplier and/or message, allowed **only while `pending`/`acknowledged`** and only for an active `supplier_user`. **`PATCH /:id/status` → `waiting_supplier`** requires `supplier_user_id IS NOT NULL` (`ErrValidation` "supplier required"). **`GET /filters?facet=suppliers`** feeds the picker; product supplier filters ([`product/filters_handler.go`](../../backend/internal/module/product/filters_handler.go) `respondSupplierFilters`) now also return `address` + `tel` (`omitempty`). RBAC needs no new seeds: `/api/v1/order/sales-claims` GET → `.view`, PATCH → `.update` (**`order.order_sales_claim.*`**). Postman **Order → Sales claims**.

**Order compare (catalog special price):** migration `20260920110000_discount_rule.sql` — table `discount_rule` from [`design/schema/discount_rule.sql`](../../design/schema/discount_rule.sql) (brand + optional category scope × `member_setting_relation_id`, `discount` + `discount_type`). Handlers: [`internal/module/order`](../../backend/internal/module/order/) on RBAC group `/api/v1/order` — prefix **`/compares`**: `GET /tree` (paginated brands + nested categories under each brand via `product_attribute_relation`, `is_defined` per node), `GET /rules?brand_id=&category_id=` (all active profile combos with current discounts), `PUT /rules` (upsert/clear per scope), `GET /export`, `POST /import` (JSON `{ items: [...] }`). Permissions: catalog seeds **`order.order_compare.view`** and **`order.order_compare.update`** only (same pattern as `setting.setting_vat`; ids 205/207). **`CodeForRoute`:** GET (incl. `/export`) → `.view`; PUT `/rules` and POST `/import` → `.update`. Postman folder **Order → Compare (special price)**.

**Product attributes module:** table `product_attribute` (+ `product_attribute_language`, `product_attribute_relation` for category↔brand links). Handlers: [`internal/module/product`](../../backend/internal/module/product/) on RBAC group `/api/v1/product` — three resources **`/categories`**, **`/brands`**, **`/cars`** (each fixes `type` enum); list returns rows in tree DFS order with `page`/`limit` and `tree_path` on each item for UI indent; category and car **`PATCH /move`** (before/after/child zones; category unlimited depth with cycle/subtree validation only; car validates brand/model/engine parent rules); brand and car also **`PATCH /reorder`** (sibling-only). Category create/update accepts `brand_ids`. Permissions: `product.product_category.*`, `product.product_brand.*`, `product.product_car.*`. Dev demo attributes: `seeds/dev/14_product_demo.sql`. Postman folder **Product**.

**Product list module:** tables `product_list*` / `product_item*` (migration `20260918140000_product_module.sql`; `20260918150000_product_item_old_item_is_new.sql` — `old_product_item_id`, `product_item.is_new`, drop `product_list.is_new`). Same RBAC module as list admin: **`product.product_list.*`** (resource prefix `/api/v1/product/lists` and `/api/v1/product/items` via catalog prefix match).

| Endpoint | Purpose |
|----------|---------|
| `GET /product/items` | Item browse (one row = `product_item` + list joins); filters `search`, **`ids`** (comma-separated `product_item.id`, max 100 — cart hydrate / store sales edit), `product_category_id`, **`product_brand_id`** (part brand on `product_list`, product list toolbar), **`car_brand_id`** + **`product_attribute_model_id`** + **`car_year`** (single `EXISTS` on `product_list_car` — same fitment row), `oem` (supplier SKU / list codes), `is_active` (item), `is_new` (item); fields include `is_stopped`, `total_stock`, `reserved_stock`, `available_stock`, `type_price`, `price_wholesale`, `amount_price_wholesale`, warehouse roots, car summary; optional `cover_system_file_id`; **`price`** = when `type_price=manual`, VAT-aware item price; when `type_price=stock`, oldest `is_used` lot `sell_price` (fallback manual); sort `stock`/`available_stock`/`price` on matching columns |
| `PATCH/DELETE /product/items/:id` | Item **`PATCH`** with `{ "is_active" }` or `{ "is_stopped" }` only (list toggle / bulk sales); soft-delete; full variant body for pricing-tab saves |
| `GET /product/items/:id/warehouse-placements` | Warehouse modal rows: `placement_id`, `bin_id`, bin path labels, aggregated `quantity` |
| `GET /product/items/:id/stocks` | Paginated `product_item_stock` lots (pricing tab lot dialog); rows include `partner_name`, `po_sku` (via `purchase_order`), `vat_type` + `vat_rate` |
| `POST/PATCH/DELETE /product/items/:id/stocks` (+ `/:stockId`) | Lot CRUD; **create** requires an existing `product_item_warehouse` row for `(product_item_id, bin_id)` — no auto-insert placement; rejects items with `old_product_item_id` set (alternate SKU); body may include `po_sku` (same resolve as patch → `purchase_order_item_id`); copies active `setting_vat` (`vat_type`, `rate`) onto the new row; **patch** may set `received_at`, `supplier_user_id`, `po_sku` (no `bin_id`); **`is_used`**: at most one `TRUE` per `product_item_id` (create/patch clears other lots via `setActiveStockLot`; partial unique index `uq_product_item_stock_active` on `product_item_id`, migration `20260918190000_product_item_stock_single_is_used.sql`) |

**Purchase order (lot lookup):** migration `20260918180000_purchase_order_module.sql` — `purchase_order` (+ `vat_type` / `vat_rate` like stock), `purchase_order_item`, FK on `product_item_stock.purchase_order_item_id`. Dev demo: [`seeds/dev/14_purchase_order_demo.sql`](../../backend/internal/infra/postgres/seeds/dev/14_purchase_order_demo.sql) (runs before `14_product_demo.sql`).
| `GET /product/items/:id/history/purchase` · `…/history/sales` | **Stub** — `{ summary, groups, meta }` with empty `groups` until PO/order modules exist |
| `GET/POST/PATCH/DELETE /product/lists/:id` | Aggregate graph (languages, codes, suppliers, cars, items with prices/suppliers/bin placements/**files**); each item has `is_new` (read on **GET**; on create/update aggregate and on item full **PATCH**, persisted **`is_new` is always cleared to `false`** — request `is_new` is ignored) and optional `old_product_item_id` (alternate-SKU clone source, set on INSERT only); item **`GET`** embeds read-only `total_stock`, `warehouse_root_count`, `low_stock`; create/update syncs `product_item_file` via `items[].files`; **`GET`** includes root `updated_at` for admin form summary; create/update in one transaction; **storefront VAT** on each item: snapshot active `setting_vat` (`vat_type`, `rate`) on save; persist ex-VAT (`price`, `price_wholesale`) and incl-VAT (`price_vat`, `price_wholesale_vat`); **`amount_price_wholesale`** (min qty for wholesale tier, `0` = disabled); `normalizeStorefrontPrices` uses **include** axis when `vat_type=include` (canonical incl from request) else **exclude** (canonical ex). Migrations `20260918200000_product_item_vat_prices.sql`, `20260920100000_product_item_amount_price_wholesale.sql`. **Channel prices** (`items[].channel_prices` ↔ `product_item_price`): snapshot active `setting_vat` on save via `normalizeChannelPrice` — persist `price`, `price_vat`, `vat_type`, `vat_rate` per `(product_item_id, setting_sale_channel_id)`. Migration `20260918210000_product_item_price_vat.sql`. |
| `GET /product/lists/:id/cars` | Car fitment modal table |

**Filters (cross-module pickers)** — same RBAC as the parent resource (`CodeForRoute` maps `GET …/filters` to `{module}.{type}.view` on the route prefix). Query: required `facet`, `page`, `limit`, optional `search`, optional `id` (label resolve), optional `is_active`. Response `{ "items": [{ "id", "name" }], "meta" }` unless noted. Facet **`sale_channels`** also returns optional `is_default`, `sort_order`, and `system_file_id` on each item (default channel merge + form channel logos).

| Path | Permission | Facets / notes |
|------|------------|----------------|
| `GET /product/categories/filters` | `product.product_category.view` | `brands` — active brand attributes for category form related-brands picker |
| `GET /product/items/filters` | `product.product_list.view` | `categories`, `brands` — item browse toolbar filters |
| `GET /product/lists/filters` | `product.product_list.view` | `categories`, `brands`, `suppliers`, `sale_channels`, `warehouse_bins`, `cars` — cars: `type_car` (`brand`\|`model`\|`engine`) + optional `parent_id` |
| `GET /supplier/users/filters` | `supplier.supplier_user.view` | `prefixes` (company scope), `banks` — supplier form prefix/bank comboboxes without `setting.*.view` |
| `GET /member/tiers/filters` | `member.member_tier.view` | `setting_relations` — active `member_setting_relation` rows with `name`, `business_title`, `credit_name`, `group_name` for tier relation dialog combobox |
| `GET /member/settings/businesses/filters` | `member.member_setting_business.view` | `credits`, `groups` — active credit/group setting rows (`id`, `name`) for business create/edit multi-comboboxes without `member_setting_credit.view` / `member_setting_group.view` |
| `GET /order/store-sales/filters` | `order.order_store.view` | **`sellers`** (default when `facet` omitted) — active `admin_user` for list seller filter; **form facets** (require `facet=`): `member_credits`, `members`, `categories`, `brands`, `cars` (`type_car`, optional `parent_id`, `is_active`) — store sales form without `member.*` / `product.*` / `setting.*` view grants |
| `GET /order/store-sales/vat` | `order.order_store.view` | Active VAT snapshot (`setting_vat` fields needed by sales form) |
| `GET /order/store-sales/items` | `order.order_store.view` | Same query params as `GET /product/items` browse + `ids` bulk hydrate |
| `GET /order/store-sales/members/:id` | `order.order_store.view` | Read-only member snapshot for store sales customer step |
| `GET /order/quotations/filters` | `order.order_quotation.view` | **`sellers`** + same **form facets** as store sales (`member_credits`, `members`, `categories`, `brands`, `cars`) under quotation RBAC |
| `GET /order/quotations/vat` | `order.order_quotation.view` | Active VAT snapshot for quotation form |
| `GET /order/quotations/items` | `order.order_quotation.view` | Product item browse / hydrate (same as store sales items) |
| `GET /order/quotations/members/:id` | `order.order_quotation.view` | Member snapshot for quotation customer step |

Validation: SKU uniqueness, bin-only placements, one-bin-one-item among active placements. Postman: **Product → Items (browse)** and **Lists (aggregate)** (+ **Filters** requests under each folder).

List UI car fitment chips read `car_count` / `car_summary` from `GET /product/items`; demo rows live in dev seed [`seeds/dev/14_product_demo.sql`](../../backend/internal/infra/postgres/seeds/dev/14_product_demo.sql) (`product_list_car`, `product_list_supplier` junction for form partners section). After pulling seed changes, re-run `make backend-seed-dev` (requires `DATABASE_URL`, e.g. host `localhost:5432` when Postgres is published from compose).

**Setting module:** goose migrations add `system_file` then `setting_*` tables. **CRUD:** `internal/module/setting` on RBAC group `/api/v1/setting` — lang resources (`banks`, `payment-methods`, `sale-channels`, `claim-reasons`, `prefixes`) with th/en `names`, flat `codes`, singleton `GET/PATCH /vat`; list filters — `payment-methods`: `is_sale`, `is_purchase`; `claim-reasons`: `is_claim`, `is_return`; `prefixes`: `is_person`, `is_company` (CHECK: at least one true; no `code`/`type` columns). RBAC catalog: **`setting.setting_vat.view`** (id 61) and **`setting.setting_vat.update`** (id 63) only — no create/delete/import/export rows; dev trim: `seeds/dev/10_setting_vat_permissions.sql`. Prefix reorder requires exactly one scope flag (`is_person` or `is_company` true) in body or query. Prefix list default sort (no column sort): `is_person DESC`, `is_company ASC`, `sort_order`, `id` — groups person vs company rows for display/reorder. Postgres seeds: init `seeds/init/09_setting_vat.sql` (singleton VAT only). Dev fixtures (mirrors `design/js/seed/setting_*.js`): `seeds/dev/09_setting_vat.sql` + `seeds/dev/10_setting_catalog.sql` (all other `setting_*` tables). Postman folder **Setting** in `document/postman/postman.json`.

Init seeds: `01_system_language.sql`, then `02`–`05` (`system_permission` wave 1, ids 1–24), `06_system_permission_catalog.sql` (remaining catalog ids ≥ 25), `07_system_menu.sql` (nav tree + languages + **`system_menu_permission`** junction), `08_system_address_geo.sql` (TH/SG geo demo — same IDs as `design/js/seed/system_*`; idempotent upserts), `09_setting_vat.sql` (+ catalog files as numbered in `seeds/init/`), `10_system_code_prefix.sql` (document counters for member/order/purchase).

Re-apply geo only on an existing DB (full `make backend-seed-init` fails if `06` already ran): `docker compose exec -T postgres psql -U warehouse -d warehouse -f - < backend/internal/infra/postgres/seeds/init/08_system_address_geo.sql` from repo root with stack up. Regenerate `08` after design seed changes: `node backend/scripts/gen-system-address-init-seed.mjs`.

**Regenerate seeds** (from `frontend/`):

| Script | Output |
|--------|--------|
| `bun scripts/gen-system-permission-seed.ts` | `../backend/internal/infra/postgres/seeds/init/06_system_permission_catalog.sql` |
| `bun scripts/gen-system-menu-seed.ts` | `../backend/internal/infra/postgres/seeds/init/07_system_menu.sql` |
| `node backend/scripts/gen-system-address-init-seed.mjs` | `backend/internal/infra/postgres/seeds/init/08_system_address_geo.sql` |

Menu→permission mapping for junction uses [`frontend/lib/menu-perm-resolve.ts`](../../frontend/lib/menu-perm-resolve.ts) (seed-only; same rules as former Go `ViewPermissionCode`). Leaves with mock path `#` still get junction rows so the role **permission matrix** lists order placeholders (ticket, purchase, compare, …) before every design page ships.

**Menu init (`07`):** 50 menu rows (ids 2–57), th/en names, **`system_menu_permission`** for every leaf where a catalog code exists (~223 junction rows, including all **order** sales + order sidebar menus). Paths: hierarchical `/admin/{main}/{sub}/...`. Group rows keep `path` NULL. After catalog/menu mock changes, re-run both scripts then `make backend-seed-init`.

Test: `01_admin_bootstrap.sql` (demo users/roles).

## Struct conventions

- **Row** structs in repository (`MenuRow`) — embed `api.Audit` on base tables; `json:"-"` on rows
- **HTTP** DTOs in handler layer (`MenuListItemResponse`)
- **Shared list:** `api.ListResponse[T]`, `api.ParsePageQuery`

## Postman

`document/postman/postman.json` — folders: Health, Auth, System, Admin, Website, Setting, Location, Warehouse, Product (attributes + items + lists), Supplier. `baseUrl` = `http://localhost:1323/api/v1`.

## Docs

- Checklists: `document/checklist/backend/`
- Infrastructure: `document/knowledge/infrastructure.md`
