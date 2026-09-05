# Backend knowledge

Warehouse API under `backend/` — Go 1.25+, Echo v5, env config via `caarlos0/env`.

## Bootstrap (done)

Scaffolded API with liveness probe only (no DB/Redis yet):

```bash
make backend-test   # go test ./...
make backend-run    # go run . on :1323
make backend-dev    # air hot reload (needs air installed)
```

Env sample: `backend/env.example` → `PORT=1323`, `APP_ENV=development`.

## Health

| Method | Path | Auth | Response |
|--------|------|------|----------|
| `GET` | `/health` | none | `200` `{"status":"ok"}` |

Liveness only — readiness (DB) deferred until postgres is wired.

## Dev commands

From repo root (`make help` for the full list):

| Target | Purpose |
|--------|---------|
| `make backend-dev` | Hot reload with air |
| `make backend-run` | Run once (`go run .`) |
| `make backend-test` | `go test ./...` |
| `make backend-migrate-up/down/status` | Goose (needs `DATABASE_URL`) |

Prefer these make targets over raw `go` / `air` / goose.

## Layout

```
backend/
├── main.go
├── go.mod
├── env.example
├── .air.toml
├── Dockerfile.dev
├── Dockerfile.prod
└── internal/
    ├── config/
    ├── infra/postgres/migrations/   # empty until schema migrations
    └── module/health/               # GET /health
```

Module path: `github.com/lMikadal/warehouse/backend`.

## Stack

| Piece | Approach |
|-------|----------|
| Go | 1.25+ |
| HTTP | Echo v5 |
| Config | `caarlos0/env` |
| Port | `1323` |
| Dev reload | air (`.air.toml`) |
| DB | PostgreSQL + goose — deferred |
| Cache | Redis — deferred |

## Deferred (next phases)

- `infrastructure/docker-compose.yml` (postgres, redis, backend, frontend)
- Goose migrations from `db/schema/`
- Auth / domain modules
- th/en API error i18n catalog
- Request readiness checks against postgres

## Docs

- Phase checklists: `document/checklist/backend/`
- Bootstrap phase: `document/checklist/backend/phase-backend-bootstrap.md`
- Postman: `document/postman/postman.json`
