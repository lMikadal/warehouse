# Phase: Backend struct layout

Community layout, PostgreSQL + goose, seeds, admin RBAC wave 1, system menu list API.

## Phase checklist

- [x] Move entrypoint to `cmd/server/main.go`; Makefile / `.air.toml` use `./cmd/server`
- [x] `internal/config` — `DATABASE_URL` (required), optional `REDIS_URL`
- [x] `internal/infra/deps.go` + postgres pool (pgx) + redis stub
- [x] `internal/api` — pagination, `ListResponse`, `Audit`, `ErrorBody`
- [x] Goose migration wave 1 (schema only) + `seeds/init` + `cmd/seed`
- [x] Design rename `admin_menu` / `admin_permission` → `system_*` + seed ripple
- [x] `internal/module/system` — `GET /api/v1/system/menus`
- [x] Postman folders Health / System / Admin / Auth
- [x] `.cursor/rules/migrations-seed.mdc`

## Required checklist

- [x] `make backend-test` passes
- [x] `make backend-migrate-up` applies wave 1 (with `DATABASE_URL`)
- [x] `make backend-seed-init` loads locales
- [x] `document/postman/postman.json` includes System → Menus list
- [x] `document/knowledge/backend.md` updated
