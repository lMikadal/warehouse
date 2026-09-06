# Warehouse — framework / Docker commands for skills.
# Prefer `make <target>` from repo root; run `make help` for the list.

DESIGN_DIR      := design
FRONTEND_DIR    := frontend
BACKEND_DIR     := backend
INFRA_DIR       := infrastructure
DESIGN_PORT     := 8080
API_PORT        := 1323
FRONTEND_PORT   := 3000
MIGRATIONS_DIR  := internal/infra/postgres/migrations
GOOSE           := go run github.com/pressly/goose/v3/cmd/goose@latest

.DEFAULT_GOAL := help

define require_dir
	@test -d "$(1)" || (echo "missing $(1) — bootstrap that area first"; exit 1)
endef

.PHONY: help run \
	design-schema-check design-serve \
	frontend-bootstrap frontend-dev frontend-build frontend-lint frontend-shadcn-add \
	backend-dev backend-run backend-test \
	backend-migrate-up backend-migrate-down backend-migrate-status \
	docker-up docker-up-d docker-down docker-build docker-logs docker-prod-up docker-prod-down

## help: Show this help
help:
	@grep -E '^## ' $(MAKEFILE_LIST) | sed 's/^## //' | column -t -s ':'

## run: Start full dev stack (docker compose up)
run: docker-up

## design-schema-check: Validate design/schema/*.sql conventions (filename, audit-5, *_language rules, FK targets)
design-schema-check:
	$(call require_dir,$(DESIGN_DIR)/schema)
	bash $(DESIGN_DIR)/schema/check.sh

## design-serve: Serve design/ prototype on DESIGN_PORT (default 8080)
design-serve:
	$(call require_dir,$(DESIGN_DIR))
	cd $(DESIGN_DIR) && python -m http.server $(DESIGN_PORT)

## frontend-bootstrap: One-time Next.js + shadcn + stack deps in frontend/
frontend-bootstrap:
	@mkdir -p $(FRONTEND_DIR)
	cd $(FRONTEND_DIR) && \
		bun create next-app . --typescript --tailwind --eslint --app --use-bun --yes && \
		bunx shadcn@latest init -d -y && \
		bun add next-themes next-intl lucide-react

## frontend-dev: Next.js dev server (bun dev)
frontend-dev:
	$(call require_dir,$(FRONTEND_DIR))
	cd $(FRONTEND_DIR) && bun dev

## frontend-build: Production build (bun run build)
frontend-build:
	$(call require_dir,$(FRONTEND_DIR))
	cd $(FRONTEND_DIR) && bun run build

## frontend-lint: Lint frontend (bun run lint)
frontend-lint:
	$(call require_dir,$(FRONTEND_DIR))
	cd $(FRONTEND_DIR) && bun run lint

## frontend-shadcn-add: Add shadcn component (COMPONENT=button)
frontend-shadcn-add:
	$(call require_dir,$(FRONTEND_DIR))
	@test -n "$(COMPONENT)" || (echo "usage: make frontend-shadcn-add COMPONENT=<name>"; exit 1)
	cd $(FRONTEND_DIR) && bunx shadcn@latest add $(COMPOENNT)

## backend-dev: Hot-reload API with air (.air.toml)
backend-dev:
	$(call require_dir,$(BACKEND_DIR))
	cd $(BACKEND_DIR) && air

## backend-run: Run API once (go run .)
backend-run:
	$(call require_dir,$(BACKEND_DIR))
	cd $(BACKEND_DIR) && go run .

## backend-test: Run Go tests (go test ./...)
backend-test:
	$(call require_dir,$(BACKEND_DIR))
	cd $(BACKEND_DIR) && go test ./...

## backend-migrate-up: Apply goose migrations (needs DATABASE_URL)
backend-migrate-up:
	$(call require_dir,$(BACKEND_DIR))
	@test -n "$(DATABASE_URL)" || (echo "set DATABASE_URL (e.g. from infrastructure/.env)"; exit 1)
	cd $(BACKEND_DIR) && $(GOOSE) -dir $(MIGRATIONS_DIR) postgres "$(DATABASE_URL)" up

## backend-migrate-down: Roll back one goose migration (needs DATABASE_URL)
backend-migrate-down:
	$(call require_dir,$(BACKEND_DIR))
	@test -n "$(DATABASE_URL)" || (echo "set DATABASE_URL (e.g. from infrastructure/.env)"; exit 1)
	cd $(BACKEND_DIR) && $(GOOSE) -dir $(MIGRATIONS_DIR) postgres "$(DATABASE_URL)" down

## backend-migrate-status: Show goose migration status (needs DATABASE_URL)
backend-migrate-status:
	$(call require_dir,$(BACKEND_DIR))
	@test -n "$(DATABASE_URL)" || (echo "set DATABASE_URL (e.g. from infrastructure/.env)"; exit 1)
	cd $(BACKEND_DIR) && $(GOOSE) -dir $(MIGRATIONS_DIR) postgres "$(DATABASE_URL)" status

## docker-up: docker compose up --build (dev images; includes --profile dev admin tools)
docker-up:
	$(call require_dir,$(INFRA_DIR))
	cd $(INFRA_DIR) && docker compose --profile dev up --build

## docker-up-d: docker compose up -d --build (detached; rebuilds Dockerfile.dev tags)
docker-up-d:
	$(call require_dir,$(INFRA_DIR))
	cd $(INFRA_DIR) && docker compose --profile dev up -d --build

## docker-down: Tear down compose stack
docker-down:
	$(call require_dir,$(INFRA_DIR))
	cd $(INFRA_DIR) && docker compose --profile dev down

## docker-build: Rebuild compose images (warehouse-*:dev from Dockerfile.dev)
docker-build:
	$(call require_dir,$(INFRA_DIR))
	cd $(INFRA_DIR) && docker compose --profile dev build

## docker-logs: Follow compose logs (SERVICE= optional)
docker-logs:
	$(call require_dir,$(INFRA_DIR))
	cd $(INFRA_DIR) && docker compose --profile dev logs -f $(SERVICE)

## docker-prod-up: Prod overlay compose up --build (nginx gateway; no --profile dev)
docker-prod-up:
	$(call require_dir,$(INFRA_DIR))
	cd $(INFRA_DIR) && docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build

## docker-prod-down: Tear down prod overlay stack (same -f pair as docker-prod-up)
docker-prod-down:
	$(call require_dir,$(INFRA_DIR))
	cd $(INFRA_DIR) && docker compose -f docker-compose.yml -f docker-compose.prod.yml down
