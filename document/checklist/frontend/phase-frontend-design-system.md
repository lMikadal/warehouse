# Phase: Frontend design system (tokens)

Warehouse blue-white design tokens in Tailwind v4 + shadcn, aligned with design prototype CSS.

## Phase checklist

- [x] Warehouse tokens in `frontend/app/globals.css` (single file; no separate `tokens.css`)
- [x] Wire `@theme`, breakpoints, `tablet-landscape` variant
- [x] Remove Geist; use design `system-ui` stack
- [x] Storybook `stories/design-tokens.stories.tsx`
- [x] Align tokens with `design/pages/warehouse-list.html` (semantic badge/table/zone tokens)
- [x] Update `document/knowledge/frontend.md`

## Required checklist

Must pass before this phase is done:

- [x] Light/dark `--primary` is design blue (`#2563eb` / `#3b82f6`)
- [x] `--color-border` / `--color-muted` (#e2e8f0 light) drive shadcn `--border`; `--muted` fill uses `--color-subtle`
- [x] Warehouse-list semantics: success/status badges, action add/delete, `surface-table-wrap`, `grid-wh-zone`, `bg-row-expanded`, `px-admin-content`, `max-w-crud-page`
- [x] CRUD page title token = foreground (`--color-page-title`), not primary
- [x] Storybook includes warehouse-list section; references `warehouse-list.html`
- [x] `make frontend-build` passes
- [x] `make frontend-lint` passes
