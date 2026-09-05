# Phase: Infrastructure prod gateway

Give the production Compose overlay a plain `nginx:alpine` gateway on port 80, stop inheriting nginx-ui/design, and unpublish app/database ports so the host only sees the gateway.

## Phase checklist

- [x] Put `nginx-ui` and `design` on `profiles: [dev]` in `docker-compose.yml`
- [x] Add `nginx` service (`nginx:alpine`) in `docker-compose.prod.yml` publishing only `${NGINX_PORT:-80}:80`
- [x] Add seed `infrastructure/nginx/nginx.prod.conf` (`/` → frontend, `/api/` → backend; no `/design/`)
- [x] Reset published ports/volumes for postgres, redis, backend, frontend in prod overlay (`!reset []`)
- [x] Disable backend healthcheck in prod overlay (distroless has no `curl`)
- [x] Hardcode prod `NEXT_PUBLIC_API_URL=/api/v1` (overlay build arg + `Dockerfile.prod` default)
- [x] Update `make docker-prod-up` (`--build`) and add `make docker-prod-down` (matching `-f` pair)
- [x] Tag prod images as `warehouse-frontend:prod` / `warehouse-backend:prod` (separate from `:dev`)

## Required checklist

Must pass before this phase is done:

- [x] `make docker-prod-up` starts postgres, redis, backend, frontend, nginx (no nginx-ui / design / pgAdmin / redis-commander)
- [x] Host sees only gateway port (`80` by default) — not `3000` / `1323` / `5432` / `6379`
- [x] `curl http://localhost/api/v1/health` → `{"status":"ok"}` (via prod nginx)
- [x] `curl http://localhost:1323/api/v1/health` fails (backend not published)
- [x] `document/knowledge/infrastructure.md` documents prod vs dev gateway and migrate-via-exec
- [x] `make docker-prod-down` tears down the prod overlay cleanly
