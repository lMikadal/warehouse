# Infrastructure knowledge

Docker Compose lives under `infrastructure/`. Application source stays in `backend/`, `frontend/`, and `design/`; compose `build.context` points at those siblings.

## Quick start

```bash
cp infrastructure/env.example infrastructure/.env
make docker-build
make docker-up-d    # includes --profile dev (nginx-ui, design, pgAdmin, redis-commander)
```

Prefer `make` targets over raw `docker compose` from `infrastructure/`.

## Dev vs prod

| | Dev (`make docker-up`) | Prod (`make docker-prod-up`) |
|--|------------------------|------------------------------|
| Gateway | `nginx-ui` (`:80` + `:9000` admin) | `nginx:alpine` (`:80` only) |
| Config | [`nginx/nginx.conf`](../../infrastructure/nginx/nginx.conf) | [`nginx/nginx.prod.conf`](../../infrastructure/nginx/nginx.prod.conf) |
| Published ports | apps + DB + admin tools | **only** gateway (`NGINX_PORT`, default `80`) |
| Extra services | design, nginx-ui, pgAdmin, redis-commander (`--profile dev`) | none |
| Frontend → Go (BFF server-side) | `http://backend:1323/api` in compose (+ `/v1/…` in fetch path); host dev uses `http://localhost:1323/api` | `/api` (+ `/v1/…` paths; prod build may still set legacy `/api/v1` base — normalized in code) |
| Image tags | `warehouse-frontend:dev`, `warehouse-backend:dev` (`Dockerfile.dev`) | `warehouse-frontend:prod`, `warehouse-backend:prod` (`Dockerfile.prod`) |

TLS is out of scope for now (HTTP `:80` only).

**Do not mix stacks without the right images:** `docker-prod-up` builds `:prod` tags; `docker-up` / `docker-up-d` always pass `--build` so they recreate `:dev` (air / `next dev`). After a prod run, tear down with `make docker-prod-down` (or `make docker-down` if you were on the dev profile), then `make docker-up-d`. If frontend hot reload fails after a prod build left a root-owned `frontend/.next` on the host, delete that directory and restart the frontend container.

## Dev services (`--profile dev`)

| Service | Port(s) | Notes |
|---------|---------|-------|
| nginx-ui | `80` gateway, `9000` admin | Gateway + web UI to edit/reload nginx |
| backend | `1323` | Go + air; API under `/api/v1` |
| frontend | `3000` | Next.js + bun hot reload |
| design | `8080` | Static prototype (`nginx:alpine`) |
| postgres | `5432` | Persistent volume `postgres_data` |
| redis | `6379` | Present for future cache wiring |
| pgAdmin | `5050` | Dev profile only |
| redis-commander | `8081` | Dev profile only |

Network: `warehouse_network`. Timezone: `Asia/Bangkok`.

`design` and `nginx-ui` are on `profiles: [dev]` (same as pgAdmin / redis-commander).

## Dev gateway routes (nginx-ui on :80)

| Path | Upstream |
|------|----------|
| `/api/v1/auth/` | frontend:3000 (Next BFF — httpOnly session cookies) |
| `/api/v1/system/` | frontend:3000 (Next BFF — authenticated proxy to Go, e.g. system menus CRUD) |
| `/` | frontend:3000 (HMR WebSocket headers) |
| `/api/v1/` | backend:1323 (Go REST API) |
| `/design/` | design:80 |

Seed config: [`infrastructure/nginx/nginx.conf`](../../infrastructure/nginx/nginx.conf). Edit further at `http://localhost:9000` and reload from the UI.

## Prod gateway routes (nginx on :80)

| Path | Upstream |
|------|----------|
| `/api/v1/auth/` | frontend:3000 (Next BFF) |
| `/api/v1/system/` | frontend:3000 (Next BFF) |
| `/` | frontend:3000 |
| `/api/v1/` | backend:1323 |

Config: [`infrastructure/nginx/nginx.prod.conf`](../../infrastructure/nginx/nginx.prod.conf). No `/design/`, no nginx-ui admin port.

App, postgres, and redis ports are **not** published — containers talk on `warehouse_network` only.

## API access

| Mode | URL |
|------|-----|
| Dev direct | `http://localhost:1323/api/v1/health` |
| Dev / prod via gateway | `http://localhost/api/v1/health` |

Compose `frontend` defaults `NEXT_PUBLIC_API_URL` to `http://backend:1323/api`; BFF builds Go URLs as `{base}/v1/…`. Host `make frontend-dev` uses `http://localhost:1323/api` from `frontend/env.example`.

Prod overlay hardcodes `NEXT_PUBLIC_API_URL=/api/v1` (build arg + runtime).

## Migrations

- **Dev compose / `APP_ENV=development`:** backend runs goose `up` on start (see `AUTO_MIGRATE` in [`backend/env.example`](../../backend/env.example)) — no separate migrate step for local Docker dev in most cases
- **Manual / CI:** `make backend-migrate-up` with `DATABASE_URL` (host `localhost:5432` from `infrastructure/.env`)
- **Prod (ports hidden):** default **no** auto-migrate on start; run migrate before deploy (`make backend-migrate-up` via exec/job) or set `AUTO_MIGRATE=true` only for single-instance deploys

In-compose backend always uses host `postgres` for `DATABASE_URL`.

## Dev admin tools (`--profile dev`)

Included by `make docker-up` / `make docker-up-d`. Not started by `make docker-prod-up`.

### nginx-ui

- URL: `http://localhost:9000`
- First visit: complete setup / create admin login in the UI

### pgAdmin

- URL: `http://localhost:5050`
- Login: `PGADMIN_DEFAULT_EMAIL` / `PGADMIN_DEFAULT_PASSWORD` from `.env` (default `admin@example.com` / `admin`)
- Add server once:

| Field | Value |
|-------|-------|
| Host | `postgres` |
| Port | `5432` |
| Username | `POSTGRES_USER` |
| Password | `POSTGRES_PASSWORD` |
| Database | `POSTGRES_DB` |

### redis-commander

- URL: `http://localhost:8081`
- Auto-connects to `redis:6379` as host `local`

## Env

- Commit `infrastructure/env.example` (key names + dev placeholders only)
- Real secrets in `infrastructure/.env` (gitignored)
- Host-side migrate (dev): `DATABASE_URL` pointing at `localhost:5432`
- In-compose backend uses host `postgres` for `DATABASE_URL`

## Layout

```
infrastructure/
├── docker-compose.yml
├── docker-compose.prod.yml
├── env.example
├── .gitignore
├── nginx/
│   ├── nginx.conf        # dev (nginx-ui)
│   └── nginx.prod.conf   # prod (nginx:alpine)
└── nginx-ui/             # nginx-ui runtime data (gitignored contents)
```

## Make targets

| Target | Purpose |
|--------|---------|
| `make run` / `make docker-up` | Full stack + dev profile (`--build` → `:dev` images) |
| `make docker-up-d` | Detached + `--build` (`warehouse-*:dev`) |
| `make docker-down` | Tear down (dev) |
| `make docker-build` | Rebuild `:dev` images from `Dockerfile.dev` |
| `make docker-logs` / `SERVICE=backend make docker-logs` | Follow logs |
| `make docker-prod-up` | Prod overlay `--build` (`warehouse-*:prod`; nginx gateway; no `--profile dev`) |
| `make docker-prod-down` | Tear down prod overlay (same `-f` pair) |

## Docs

- Phase checklist (bootstrap): `document/checklist/infrastructure/phase-infrastructure-bootstrap.md`
- Phase checklist (prod gateway): `document/checklist/infrastructure/phase-infrastructure-prod-gateway.md`
- Backend knowledge: `document/knowledge/backend.md`
