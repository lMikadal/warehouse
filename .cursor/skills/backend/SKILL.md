---
name: backend
description: >-
  Build Warehouse app Go Echo APIs in backend/ and Docker in infrastructure/
  with strong security, reusable domain modules, and th/en API messages. Use
  when working under backend/ or infrastructure/, adding handlers, migrations
  from design/schema/, compose services, or Dockerfiles.
---

# Backend + Infrastructure

Warehouse app API in `backend/` (Go + Echo v5) and Docker in `infrastructure/`.

## Scope

- Work in `backend/**` and `infrastructure/**`
- Treat `design/schema/*.sql` as the **source of truth** for tables — turn into goose migrations
- Do not implement UI in this skill
- When behavior/knowledge/API changes → update `document/checklist/backend/` (API) or `document/checklist/infrastructure/` (Docker/compose), `document/knowledge/backend.md` (or `infrastructure.md`), and `document/postman/` via `/tester` (see `.cursor/rules/document.mdc`)

## Shared principles

1. **Warehouse app** — Warehouse-domain APIs (users, products, orders, …); no off-context services
2. **Reusable + maintainable** — one module per domain (handler/service/repository); share middleware/config; avoid duplication
3. **Strong security** — validate input at trust boundaries; JWT/auth middleware; least privilege; never commit secrets; secure Docker/env
4. **Responsive** — not a backend layout job, but responses/errors must work for every UI size (no layout requirements here)
5. **Theme: blue + white** — UI concern; if the server sends HTML/email, use neutral colors readable in light and dark
6. **Light + dark mode** — do not force theme on the API; do not block client theme
7. **i18n: th + en** — error/API messages support locale (`Accept-Language` or query); default `th`; use go-i18n when server-side strings exist

### Breakpoints (for awareness)

UI uses mobile / tablet / computer / computer-wide — backend does not implement layout but keeps a stable API for every client

### Theme (backend)

- Do not implement color mode
- Server-rendered HTML (if any): neutral colors readable in light and dark

### i18n (backend)

- Locale from `Accept-Language` or a query agreed with frontend
- Error messages available in `th` and `en`

## Stack

| Tech | Approach |
|------|----------|
| Go | 1.25+ |
| HTTP | Echo v5 (`github.com/labstack/echo/v5`) |
| DB | PostgreSQL + goose migrations |
| Cache | Redis when needed |
| Config | env via `caarlos0/env` |
| Dev reload | air (`.air.toml`) |
| Port | `1323` |

## Backend layout

```
backend/
├── main.go
├── go.mod
├── Dockerfile.dev
├── Dockerfile.prod
├── .air.toml
└── internal/
    ├── config/
    ├── middleware/
    ├── infra/postgres/
    │   └── migrations/
    └── module/<domain>/    # handler, service, repository
```

One domain module = handler + service + repository. Keep packages small; reuse shared middleware/config.

## Infrastructure layout

```
infrastructure/
├── docker-compose.yml       # dev: postgres, redis, backend, frontend
├── docker-compose.prod.yml  # optional prod overlay
└── env.example              # commit this; never commit real `.env`
```

No application source under `infrastructure/` — compose `build.context` points at `../backend` and `../frontend`.

## Docker conventions

- `build.context: ../backend` (or `../frontend`), `dockerfile: Dockerfile.dev`
- Healthcheck postgres (and other deps) before starting backend
- Volume-mount source for hot reload in dev
- Single network (e.g. `warehouse_network`), timezone `Asia/Bangkok`
- Secrets only in `.env` (gitignored); document keys in `env.example`

Reference sibling Warehouse `infrastructure/docker-compose.yml` for shape — adapt names/ports; do not copy unrelated services blindly.

## Workflow

1. Agree API contract (method, path, request/response)
2. Implement handler → service → repository
3. Add goose SQL under `internal/infra/postgres/migrations/` from `design/schema/`
4. Update `docker-compose.yml` when adding a service
5. Smoke-test from repo root: `make run` (or `make docker-up`)

### Dev / migrate commands (root Makefile)

```bash
make run                      # full stack: docker compose up
make backend-dev              # air hot reload
make backend-run              # go run .
make backend-test             # go test ./...
make backend-migrate-up       # needs DATABASE_URL (from infrastructure/.env)
make backend-migrate-down
make backend-migrate-status
```

Do not run raw `docker compose`, `air`, `go run`, or goose when a make target exists — use `make help`.

## Migrations vs design schema

| `design/schema/*.sql` | Design / planning shape (human-readable) |
|-----------------------|------------------------------------------|
| `backend/.../migrations/` | What goose actually runs |

- Table names: `{module}_{entity}` all snake_case, singular entity (e.g. `product_item`) — goose `CREATE TABLE` must match; do not rename when migrating
- Multilingual: companion `{base}_language` tables — do not flatten to `name_th` / `name_en` columns
- Columns: English snake_case; base tables include `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`; `*_language` tables include only `created_at`, `updated_at` (no soft-delete / by columns)
- Tree tables: `parent_id` + `tree_path` (LTREE) + `sort_order` together; self-FK `ON DELETE RESTRICT`; GIST + unique active `tree_path` indexes (see design skill)
- **List endpoints:** follow [`.cursor/rules/tables.mdc`](../../.cursor/rules/tables.mdc) — accept `page` + `limit`; tree lists: hierarchical order (sibling `sort_order` → `id` per `parent_id`, DFS pre-order); flat: `sort_order` → `created_at`; else `created_at` → `id`. `ORDER BY tree_path` alone does not match UI sibling order.
- IDs: `id BIGSERIAL` primary keys and `BIGINT` FK columns per `design/schema/` — do not copy UUID PKs from legacy v2 migrations; when porting old shapes (e.g. `warehouse_conditions`), map UUID columns to `BIGINT` FK names in design schema
- Column comments: inline `--` on every non-audit column in `design/schema/` (English; skip audit sets per table kind — see design skill)
- When schema drifts, update `design/schema/` and add a new migration — do not edit old applied migrations.

## Do not

- Put business logic in handlers only — keep service layer for non-trivial rules
- Hardcode secrets or connection strings
- Skip input validation or auth on protected routes
- Skip healthchecks / depends_on for DB-backed services
- Hardcode Thai-only (or English-only) API error strings when i18n applies
- Bootstrap frontend from this skill
