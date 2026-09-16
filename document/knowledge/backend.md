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
│   │   └── admin/         # users, roles
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
| `GET` | `/api/v1/auth/nav` | Role-filtered sidebar tree + `landing_path` (first permitted leaf in DFS menu order) |
| `GET` | `/api/v1/auth/permissions` | Active permission codes for UI gating: `{ "codes": ["module.type.action", …] }` — superadmin gets all active codes; others from `admin_role_permission` |

Nav visibility (non-superadmin): leaf menus with a real `path` must have a **`system_menu_permission`** row to the menu’s **`system_permission`** row with `action = 'view'`; role must hold that code via `admin_role_permission`. Group rows (`path` empty) and leaves under **`is_superadmin_only`** still appear when the user has view on permitted descendants (e.g. `system.system_menu.view` → “เมนู” under “ผู้ดูแลระบบสูงสุด”). Implemented in [`MenuPermissionRepository.LoadMenuViewCodes`](../../backend/internal/module/system/menu_permission_repository.go) + [`NavService`](../../backend/internal/module/system/nav_service.go). No runtime `ViewPermissionCode` computation.

Login / refresh responses include `landing_path` (same resolver as `/auth/nav`).

Sessions stored in `admin_user_session` (hashed refresh token + access `jti`). Refresh rotates session row.

## Protected routes (RBAC)

Protected API groups require `Authorization: Bearer <access_token>` and RBAC permission code unless user `type` is `superadmin` (includes `/api/v1/system/*`, `/api/v1/admin/*`, `/api/v1/website/*`, …).

Permission codes: `{module}.{type}.{action}` — route → code mapping in [`internal/rbac/perm_catalog.go`](../../backend/internal/rbac/perm_catalog.go): **wave 1** four resources (`WavePermPages`) plus **catalog** resources as they ship (`CatalogPermPages`, e.g. `admin_language`). Full nav catalog (~37 pages × 6 actions) lives in `system_permission` init seeds `02`–`05` (ids 1–24) + [`06_system_permission_catalog.sql`](../../backend/internal/infra/postgres/seeds/init/06_system_permission_catalog.sql) (ids ≥ 25). Regenerate SQL via [`frontend/scripts/lib/perm-catalog-seed.ts`](../../frontend/scripts/lib/perm-catalog-seed.ts) + `gen-system-*-seed.ts` (mirrors design `PERM_PAGES`).

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

Helpers: [`internal/tree`](../../backend/internal/tree/) (`ApplyDrop`, `ReorderSiblings`, `RecomputePaths`). RBAC: `PATCH` on subpaths `/move` and `/reorder` maps to `{module}.{type}.update` via resource prefix match.

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

**Upload API:** `internal/module/system` — authed routes (Bearer only, no RBAC catalog row): `POST /api/v1/system/files` (multipart `file` + `purpose`), `GET/DELETE /api/v1/system/files/:id`. Images only (jpeg/png/webp/gif, max 5MB); writes MinIO then inserts `system_file`. Response includes public `url`. Delete soft-deletes metadata and removes object when not referenced (`409` if still linked from setting bank/sale channel). **`DeleteIfUnreferenced`** — same as delete when nothing references the id (used after setting bank/sale-channel **DELETE** or **PATCH** that clears/changes `system_file_id`). **`CleanupOrphans`** / **`make backend-file-cleanup`** — removes active `system_file` rows with no FK from `IsReferenced` and `created_at` older than grace (orphans from pre-deferred upload or abandoned drafts).

**Setting module:** goose migrations add `system_file` then `setting_*` tables. **CRUD:** `internal/module/setting` on RBAC group `/api/v1/setting` — lang resources (`banks`, `payment-methods`, `sale-channels`, `claim-reasons`, `prefixes`) with th/en `names`, flat `codes`, singleton `GET/PATCH /vat` (fields `vat_type`, `rate`, `is_active`; no POST/DELETE). RBAC catalog: **`setting.setting_vat.view`** (id 61) and **`setting.setting_vat.update`** (id 63) only — no create/delete/import/export rows; dev trim: `seeds/dev/10_setting_vat_permissions.sql`. Prefix reorder requires `type` in body or query. Postgres seeds: init `seeds/init/09_setting_vat.sql` (singleton VAT only). Dev fixtures (mirrors `design/js/seed/setting_*.js`): `seeds/dev/09_setting_vat.sql` + `seeds/dev/10_setting_catalog.sql` (all other `setting_*` tables). Postman folder **Setting** in `document/postman/postman.json`.

Init seeds: `01_system_language.sql`, then `02`–`05` (`system_permission` wave 1, ids 1–24), `06_system_permission_catalog.sql` (remaining catalog ids ≥ 25), `07_system_menu.sql` (nav tree + languages + **`system_menu_permission`** junction), `08_system_address_geo.sql` (TH/SG geo demo — same IDs as `design/js/seed/system_*`; idempotent upserts).

Re-apply geo only on an existing DB (full `make backend-seed-init` fails if `06` already ran): `docker compose exec -T postgres psql -U warehouse -d warehouse -f - < backend/internal/infra/postgres/seeds/init/08_system_address_geo.sql` from repo root with stack up. Regenerate `08` after design seed changes: `node backend/scripts/gen-system-address-init-seed.mjs`.

**Regenerate seeds** (from `frontend/`):

| Script | Output |
|--------|--------|
| `bun scripts/gen-system-permission-seed.ts` | `../backend/internal/infra/postgres/seeds/init/06_system_permission_catalog.sql` |
| `bun scripts/gen-system-menu-seed.ts` | `../backend/internal/infra/postgres/seeds/init/07_system_menu.sql` |
| `node backend/scripts/gen-system-address-init-seed.mjs` | `backend/internal/infra/postgres/seeds/init/08_system_address_geo.sql` |

Menu→permission mapping for junction uses [`frontend/lib/menu-perm-resolve.ts`](../../frontend/lib/menu-perm-resolve.ts) (seed-only; same rules as former Go `ViewPermissionCode`).

**Menu init (`06`):** 50 menu rows (ids 2–57), th/en names, **`system_menu_permission`** for every navigable leaf where a catalog code exists (~192 junction rows). Paths: hierarchical `/admin/{main}/{sub}/...`. Group rows keep `path` NULL. After catalog/menu mock changes, re-run both scripts then `make backend-seed-init`.

Test: `01_admin_bootstrap.sql` (demo users/roles).

## Struct conventions

- **Row** structs in repository (`MenuRow`) — embed `api.Audit` on base tables; `json:"-"` on rows
- **HTTP** DTOs in handler layer (`MenuListItemResponse`)
- **Shared list:** `api.ListResponse[T]`, `api.ParsePageQuery`

## Postman

`document/postman/postman.json` — folders: Health, Auth, System, Admin, Website. `baseUrl` = `http://localhost:1323/api/v1`.

## Docs

- Checklists: `document/checklist/backend/`
- Infrastructure: `document/knowledge/infrastructure.md`
