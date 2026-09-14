# Backend knowledge

Warehouse API under `backend/` — Go 1.27+, Echo v5, PostgreSQL (pgx), goose migrations, env via `caarlos0/env`.

## Layout (community + domains)

```
backend/
├── cmd/
│   ├── server/main.go     # composition root
│   └── seed/main.go       # init | test SQL seeds
├── internal/
│   ├── api/               # V1Prefix, pagination, ListResponse, Audit embed
│   ├── auth/              # JWT, Bearer + RBAC middleware
│   ├── rbac/              # perm_catalog (wave permission rows)
│   ├── config/
│   ├── log/               # slog Setup, Echo middleware, HTTPError
│   ├── infra/
│   │   ├── deps.go        # DB + optional Redis slot
│   │   ├── postgres/      # pool, migrations/, seeds/
│   │   └── redis/         # stub until Redis phase
│   ├── module/
│   │   ├── auth/          # login, refresh, logout, me
│   │   ├── health/
│   │   ├── system/        # system_menu, system_permission
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

## Demo login (test seed only)

After `make backend-seed-test`: username `admin` / password `admin` (superadmin), `staff` / `staff`. Do not use in production.

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

Seeds are **not** run on start — use `make backend-seed-init`. Manual migrate still works: `make backend-migrate-up`.

## API versioning

Public routes: **`/api/v1`** (`internal/api.V1Prefix`).

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

Protected (Bearer):

| Method | Path |
|--------|------|
| `GET` | `/api/v1/auth/me` |

Sessions stored in `admin_user_session` (hashed refresh token + access `jti`). Refresh rotates session row.

## Protected routes

All `/api/v1/system/*` and `/api/v1/admin/*` require `Authorization: Bearer <access_token>` and RBAC permission code unless user `type` is `superadmin`.

Permission codes: `{module}.{type}.{action}` — wave catalog in [`internal/rbac/perm_catalog.go`](../../backend/internal/rbac/perm_catalog.go) and init seeds `02`–`05_system_permission_*.sql`.

## System menus

| Method | Path | Permission (non-superadmin) |
|--------|------|-----------------------------|
| `GET` | `/system/menus` | `system.system_menu.view` |
| `POST` | `/system/menus` | `system.system_menu.create` |
| `PATCH` | `/system/menus/move` | `system.system_menu.update` |
| `PATCH` | `/system/menus/:id` | `system.system_menu.update` |
| `DELETE` | `/system/menus/:id` | `system.system_menu.delete` |

Query: `page`, `limit`, `search`, `is_active`. List items include `names: { th, en }`, `tree_path`. Tree order: DFS sibling `sort_order` → `id`.

## System permissions

| Method | Path | Permission |
|--------|------|------------|
| `GET` | `/system/permissions` | `system.system_permission.view` |
| `PATCH` | `/system/permissions/:id` | `system.system_permission.update` (body: `{ "is_active" }` only) |

## Admin roles / users

| Resource | Paths | Prefix codes |
|----------|-------|--------------|
| Roles | `GET/POST /admin/roles`, `GET/PATCH/DELETE /admin/roles/:id` | `admin.admin_role.*` |
| Users | `GET/POST /admin/users`, `GET/PATCH/DELETE /admin/users/:id` | `admin.admin_user.*` |

Role write payloads include `names: { th, en }`, `permission_ids[]`. User passwords bcrypt-hashed; never returned in JSON.

Roles list accepts `?is_active=`. Inline status switch: partial `PATCH /admin/roles/:id` with `{ "is_active": false }` only (other fields optional).

Users list accepts `?status=` (not `is_active`). Partial `PATCH` may set `{ "status": "inactive" }` among other fields.

## List mutations

Convention ([`.cursor/rules/crud-mutations.mdc`](../../.cursor/rules/crud-mutations.mdc)); per-table checklist: [`inventory-crud-mutation-apis.md`](../checklist/backend/inventory-crud-mutation-apis.md).

| Pattern | When | Endpoint |
|---------|------|----------|
| Active toggle | Column `is_active` on list table | `GET ?is_active=` + `PATCH /:id` `{ "is_active" }` |
| Flat drag sort | List table has `sort_order` (no tree) | `PATCH /reorder` `{ "drag_id", "target_id" }` → `204` |
| Tree drag sort | `parent_id` + `tree_path` | `PATCH /move` `{ "drag_id", "target_id", "zone" }` → `204` |

Helpers: [`internal/tree`](../../backend/internal/tree/) (`ApplyDrop`, `ReorderSiblings`, `RecomputePaths`). RBAC: `PATCH` on subpaths `/move` and `/reorder` maps to `{module}.{type}.update` via resource prefix match.

**Exceptions:** `admin_user` uses `status`; `system_permission` list is read-only but uses the same active patch shape; nested rows and `*_file` galleries reorder on the parent API.

## Migrations and seeds

- **Goose:** `internal/infra/postgres/migrations/` — **schema only** ([migrations-seed.mdc](../../.cursor/rules/migrations-seed.mdc))
- **Seeds:** `internal/infra/postgres/seeds/init/` (bootstrap), `seeds/test/` (repeatable demo)

| Make target | Purpose |
|-------------|---------|
| `make backend-migrate-up` | Apply migrations manually (`DATABASE_URL`) |
| `make backend-seed-init` | Run init SQL |
| `make backend-seed-test` | Run test SQL |
| `make backend-run` | `go run ./cmd/server` |
| `make backend-dev` | air |
| `make backend-test` | `go test ./...` |

Wave 1 schema: shared enums, `website_language`, `system_*` menu/permission, `admin_*` identity/RBAC, `admin_user_session`.

Init seeds: `01_website_language.sql`, then `02`–`05` split `system_permission` rows (24 codes), then `06_system_menu.sql` (full nav tree from [`frontend/lib/admin-menu-mock.ts`](../../frontend/lib/admin-menu-mock.ts)).

**Menu init (`06`):** 50 rows (ids 2–57), `system_menu_language` th/en, and `system_menu_permission` links for wave permissions only (menus 3, 4, 12, 13 → 24 junction rows). Stored `path` values are hierarchical **`/admin/{main}/{sub}/...`** derived from the menu tree (e.g. `/admin/system/menu`, `/admin/setting/bank`, `/admin/system/address/country`). Rows **with children** (roots and nested groups) keep **`path` NULL**; leaf rows without a design `pages/*.html` URL (mock `#`) still get a generated path in the seed (e.g. `/admin/sales/ticket`, `/admin/order/purchase`). All `sort_order` values are multiples of **100** (roots include member 800, sales 900, order 1000). Regenerate after mock changes: from `frontend/`, `bun scripts/gen-system-menu-seed.ts > ../backend/internal/infra/postgres/seeds/init/06_system_menu.sql`.

Test: `01_admin_bootstrap.sql` (demo users/roles).

## Struct conventions

- **Row** structs in repository (`MenuRow`) — embed `api.Audit` on base tables; `json:"-"` on rows
- **HTTP** DTOs in handler layer (`MenuListItemResponse`)
- **Shared list:** `api.ListResponse[T]`, `api.ParsePageQuery`

## Postman

`document/postman/postman.json` — folders: Health, System, Admin, Auth. `baseUrl` = `http://localhost:1323/api/v1`.

## Docs

- Checklists: `document/checklist/backend/`
- Infrastructure: `document/knowledge/infrastructure.md`
