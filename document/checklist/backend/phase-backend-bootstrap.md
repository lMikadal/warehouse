# Phase: Backend bootstrap

Scaffold the Warehouse Go + Echo API under `backend/` with a liveness health check.

## Phase checklist

- [x] Create `backend/` module (`go.mod`, `main.go`, layout under `internal/`)
- [x] Add config via `caarlos0/env` (`PORT` default `1323`, `APP_ENV`)
- [x] Add Echo v5 + Recover / RequestLogger middleware (skip `/health` logs)
- [x] Add `GET /api/v1/health` → `{"status":"ok"}` (versioned after infrastructure bootstrap)
- [x] Add `.air.toml`, `Dockerfile.dev`, `Dockerfile.prod`, `env.example`
- [x] Add httptest for health handler
- [x] Add Postman collection entry for health

## Required checklist

Must pass before this phase is done:

- [x] `make backend-test` passes
- [x] `make backend-run` serves on port `1323`
- [x] `GET /api/v1/health` returns HTTP 200 and `{"status":"ok"}`
- [x] `document/postman/postman.json` includes Health folder (`baseUrl` …`/api/v1`)
- [x] Infrastructure docker-compose completed in infrastructure bootstrap phase
