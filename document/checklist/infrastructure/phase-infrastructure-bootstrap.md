# Phase: Infrastructure bootstrap

Scaffold Docker Compose for the Warehouse dev stack: postgres, redis, backend, frontend, design, nginx-ui gateway, plus pgAdmin and redis-commander (dev profile).

## Phase checklist

- [x] Create `infrastructure/docker-compose.yml` (9 services, `warehouse_network`, `TZ=Asia/Bangkok`)
- [x] Create `infrastructure/docker-compose.prod.yml` overlay (prod Dockerfiles, no `--profile dev`)
- [x] Add seed `infrastructure/nginx/nginx.conf` (`/`, `/api/`, `/design/`)
- [x] Add nginx-ui volumes (`./nginx`, `./nginx-ui`) and ports `80` + `9000`
- [x] Add pgAdmin (`:5050`) and redis-commander (`:8081`) under `profiles: [dev]`
- [x] Add `infrastructure/env.example` + `.gitignore`
- [x] Add `frontend/Dockerfile.dev` and `frontend/Dockerfile.prod`
- [x] Update Makefile docker targets to use `--profile dev`
- [x] Version backend API under `/api/v1` and update Postman `baseUrl`
- [x] Tag `warehouse-*:dev` / `warehouse-*:prod` so prod `--build` does not overwrite hot-reload images
- [x] `make docker-up` / `make docker-up-d` always pass `--build`

## Required checklist

Must pass before this phase is done:

- [x] `cp infrastructure/env.example infrastructure/.env` works as the documented bootstrap
- [x] `make docker-build` builds images
- [x] `make docker-up-d` starts the stack including admin tools
- [x] `curl http://localhost:1323/api/v1/health` → `{"status":"ok"}`
- [x] `curl http://localhost/api/v1/health` → `{"status":"ok"}` (via nginx-ui)
- [x] Admin UIs reachable: nginx-ui `:9000`, pgAdmin `:5050` (login `admin@example.com`), redis-commander `:8081`
- [x] `document/knowledge/infrastructure.md` documents ports, routes, and admin login notes
- [x] `make docker-down` tears down cleanly

## pgAdmin first-time server

| Field | Value |
|-------|-------|
| Host | `postgres` |
| Port | `5432` |
| Username / password / db | from `infrastructure/.env` (`POSTGRES_*`) |
