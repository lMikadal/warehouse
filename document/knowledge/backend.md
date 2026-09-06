# Backend knowledge

Warehouse API under `backend/` — Go 1.25+, Echo v5, env config via `caarlos0/env`.

## Bootstrap (done)

Scaffolded API with liveness probe only (no DB/Redis client wiring yet):

```bash
make backend-test   # go test ./...
make backend-run    # go run . on :1323
make backend-dev    # air hot reload (needs air installed)
```

Env sample: `backend/env.example` → `PORT=1323`, `APP_ENV=development`.

## API versioning

All public routes live under **`/api/v1`** (`internal/api.V1Prefix`). Register domain modules on the v1 group in `main.go`.

## Health

| Method | Path | Auth | Response |
|--------|------|------|----------|
| `GET` | `/api/v1/health` | none | `200` `{"status":"ok"}` |

Also via gateway: `http://localhost/api/v1/health`.

Liveness only — readiness (DB) deferred until postgres is wired in the app.

## Dev commands

From repo root (`make help` for the full list):

| Target | Purpose |
|--------|---------|
| `make backend-dev` | Hot reload with air |
| `make backend-run` | Run once (`go run .`) |
| `make backend-test` | `go test ./...` |
| `make backend-migrate-up/down/status` | Goose (needs `DATABASE_URL`) |
| `make run` / `make docker-up` | Full Docker stack (see infrastructure knowledge) |

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
    ├── api/                         # V1Prefix = /api/v1
    ├── config/
    ├── infra/postgres/migrations/   # empty until schema migrations
    └── module/health/               # GET /api/v1/health
```

Module path: `github.com/lMikadal/warehouse/backend`.

## Stack

| Piece | Approach |
|-------|----------|
| Go | 1.25+ |
| HTTP | Echo v5 |
| Config | `caarlos0/env` |
| Port | `1323` (directly published in compose) |
| API prefix | `/api/v1` |
| Dev reload | air (`.air.toml`) |
| DB | PostgreSQL available in compose — app wiring deferred |
| Cache | Redis available in compose — app wiring deferred |

## Deferred (next phases)

- Goose migrations from `design/schema/`
- Auth / domain modules
- th/en API error i18n catalog
- Request readiness checks against postgres
- Backend Redis client

## Docs

- Phase checklists: `document/checklist/backend/`
- Bootstrap phase: `document/checklist/backend/phase-backend-bootstrap.md`
- Infrastructure: `document/knowledge/infrastructure.md`
- Postman: `document/postman/postman.json` (`baseUrl=http://localhost:1323/api/v1`)
