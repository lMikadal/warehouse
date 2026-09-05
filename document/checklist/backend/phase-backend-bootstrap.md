# Phase: Backend bootstrap

Scaffold the Warehouse Go + Echo API under `backend/` with a liveness health check.

## Phase checklist

- [x] Create `backend/` module (`go.mod`, `main.go`, layout under `internal/`)
- [x] Add config via `caarlos0/env` (`PORT` default `1323`, `APP_ENV`)
- [x] Add Echo v5 + Recover / RequestLogger middleware (skip `/health` logs)
- [x] Add `GET /health` → `{"status":"ok"}`
- [x] Add `.air.toml`, `Dockerfile.dev`, `Dockerfile.prod`, `env.example`
- [x] Add httptest for health handler
- [x] Add Postman collection entry for health

## Required checklist

Must pass before this phase is done:

- [x] `make backend-test` passes
- [x] `make backend-run` serves on port `1323`
- [x] `GET /health` returns HTTP 200 and `{"status":"ok"}`
- [x] `document/postman/postman.json` includes Health folder
- [x] Infrastructure docker-compose deferred (backend-only phase)
