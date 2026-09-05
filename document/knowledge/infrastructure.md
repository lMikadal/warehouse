# Infrastructure knowledge

Docker Compose lives under `infrastructure/`. Application source stays in `backend/` and `frontend/`; compose `build.context` points at those siblings.

## Dev commands

From repo root (`make help` for the full list):

| Target | Purpose |
|--------|---------|
| `make run` / `make docker-up` | Full dev stack (`docker compose up`) |
| `make docker-up-d` | Detached up |
| `make docker-down` | Tear down |
| `make docker-build` | Rebuild images |
| `make docker-logs` / `SERVICE=backend make docker-logs` | Follow logs |
| `make docker-prod-up` | Dev + `docker-compose.prod.yml` overlay |

Prefer these make targets over raw `docker compose` from `infrastructure/`.

## Env

- Commit `infrastructure/.env.example` with key names only
- Real secrets in `infrastructure/.env` (gitignored)
- Migration targets (`make backend-migrate-*`) need `DATABASE_URL` — typically the same value documented in `.env.example`

## Layout (planned — deferred)

Docker compose is **not** scaffolded yet. Backend bootstrap runs locally via
`make backend-run` / `make backend-dev` on port `1323`.

```
infrastructure/
├── docker-compose.yml
├── docker-compose.prod.yml   # optional
└── .env.example
```

Planned services: postgres, redis, backend (`../backend` + `Dockerfile.dev`), frontend.

## Docs

- Phase checklists: `document/checklist/infrastructure/`
- Backend knowledge (API without compose): `document/knowledge/backend.md`
