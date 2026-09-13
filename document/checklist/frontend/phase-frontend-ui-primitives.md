# Phase: Frontend UI primitives and atomic folders

Base shadcn set, Storybook coverage, and folder scaffold for molecules — middle layers of the [UI layer stack](../../../.cursor/rules/design-system.mdc).

**Depends on:** [phase-frontend-design-system.md](phase-frontend-design-system.md) (tokens done).

**Note:** `components/organisms/` and warehouse **page** routes are a **follow-up phase** (compose molecules into AdminLayout / WarehouseListTable). This milestone stops at molecules + UI stories.

## Phase checklist

- [x] `frontend/components/molecules/` exists with warehouse-list-oriented molecules + stories
- [ ] `frontend/components/organisms/` (deferred — not required for this milestone)
- [x] shadcn: **Input**, **Select**, **Dialog**, **Table**, **Switch**, **Badge**, **Label** under `components/ui/` (Button already present)
- [x] Co-located `*.stories.tsx` for each shared `components/ui/` primitive above
- [x] First molecules from [`design/pages/warehouse-list.html`](../../../design/pages/warehouse-list.html) (search, status filter, pagination, table actions, …) with Storybook
- [x] Update `document/knowledge/frontend.md` for folder / primitive conventions

## Required checklist

Must pass before this phase is done:

- [x] No route page stacks more than trivial one-off `ui/` usage where an organism should exist (no warehouse page yet)
- [x] `make frontend-build` passes
- [x] `make frontend-lint` passes
- [x] Storybook documents base primitives and molecules (`make frontend-storybook-build`)
