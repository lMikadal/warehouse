# Phase: Frontend UI primitives and atomic folders

Base shadcn set, Storybook coverage, and folder scaffold for molecules/organisms — middle layers of the [UI layer stack](../../../.cursor/rules/design-system.mdc).

**Depends on:** [phase-frontend-design-system.md](phase-frontend-design-system.md) (tokens done).

## Phase checklist

- [ ] `frontend/components/molecules/` and `frontend/components/organisms/` exist (may start empty; `.gitkeep` ok)
- [ ] shadcn: **Input**, **Select**, **Dialog**, **Table** added under `components/ui/` (Button already present)
- [ ] Co-located `*.stories.tsx` for each shared `components/ui/` primitive above
- [ ] First molecule or organism from an approved design page (e.g. warehouse-list toolbar or table chrome) with story
- [ ] Update `document/knowledge/frontend.md` if folder or primitive conventions change

## Required checklist

Must pass before this phase is done:

- [ ] No route page stacks more than trivial one-off `ui/` usage where an organism should exist
- [ ] `make frontend-build` passes
- [ ] `make frontend-lint` passes
- [ ] Storybook documents base primitives (`make frontend-storybook-build`)
