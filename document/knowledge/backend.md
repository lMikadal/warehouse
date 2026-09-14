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
│   ├── config/
│   ├── log/               # slog Setup, Echo middleware, HTTPError
│   ├── infra/
│   │   ├── deps.go        # DB + optional Redis slot
│   │   ├── postgres/      # pool, migrations/, seeds/
│   │   └── redis/         # stub until Redis phase
│   ├── module/
│   │   ├── health/
│   │   ├── system/        # system_menu, system_permission
│   │   └── admin/         # users, roles (later)
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

## System menus (pilot)

| Method | Path | Auth | Response |
|--------|------|------|----------|
| `GET` | `/api/v1/system/menus` | none (auth later) | `200` `{ "items": [...], "meta": { total, page, limit } }` |

Query: `page`, `limit` (default 10, max 100), optional `search`. Locale: `Accept-Language` or `locale` query.

List order: tree DFS — siblings `sort_order ASC`, `id ASC` per [tables rule](../../.cursor/rules/tables.mdc).

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

## Struct conventions

- **Row** structs in repository (`MenuRow`) — embed `api.Audit` on base tables; `json:"-"` on rows
- **HTTP** DTOs in handler layer (`MenuListItemResponse`)
- **Shared list:** `api.ListResponse[T]`, `api.ParsePageQuery`

## Postman

`document/postman/postman.json` — folders: Health, System, Admin, Auth. `baseUrl` = `http://localhost:1323/api/v1`.

## Docs

- Checklists: `document/checklist/backend/`
- Infrastructure: `document/knowledge/infrastructure.md`
