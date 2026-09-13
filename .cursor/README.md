# Warehouse — Cursor agent index

English-only catalog for rules, skills, and config under `.cursor/`. Human UI copy stays in app i18n (`th` / `en`).

## How agents should use this

1. **This file** — pick folder, skill, and topic rules quickly.
2. **Folder skill** — read the matching `SKILL.md` (see [Folder → skill](#folder--skill)); invoke with `/design`, `/frontend`, `/backend`, or `/tester`.
3. **Topic rules** — open `.cursor/rules/*.mdc` when the task touches forms, tables, dates, etc.
4. **`document/`** — when behavior, APIs, or structure change, sync checklist / knowledge / Postman in the same turn ([`rules/document.mdc`](rules/document.mdc)).

Always-applied routing: [`rules/subprojects.mdc`](rules/subprojects.mdc).

## Folder → skill

| Folder | Skill | Scope |
|--------|-------|--------|
| `design/**` | [`skills/design/SKILL.md`](skills/design/SKILL.md) | HTML/CSS/JS prototype, seed, mock store, schema SQL |
| `frontend/**` | [`skills/frontend/SKILL.md`](skills/frontend/SKILL.md) | Next.js App Router, shadcn, Storybook, API client |
| `backend/**`, `infrastructure/**` | [`skills/backend/SKILL.md`](skills/backend/SKILL.md) | Go Echo API, goose migrations, Docker compose |
| `document/postman/**` or API testing | [`skills/tester/SKILL.md`](skills/tester/SKILL.md) | Postman collection v2.1, backend smoke tests |

## Skills

| Invoke | Path | Primary folders | Open next |
|--------|------|-----------------|-----------|
| `/design` | [`skills/design/SKILL.md`](skills/design/SKILL.md) | `design/` | [`skills/design/reference.md`](skills/design/reference.md) for schema, enums, seed shape |
| `/frontend` | [`skills/frontend/SKILL.md`](skills/frontend/SKILL.md) | `frontend/` | [`rules/design-system.mdc`](rules/design-system.mdc), [`rules/storybook.mdc`](rules/storybook.mdc) |
| `/backend` | [`skills/backend/SKILL.md`](skills/backend/SKILL.md) | `backend/`, `infrastructure/` | Design [`reference.md`](skills/design/reference.md) when adding migrations |
| `/tester` | [`skills/tester/SKILL.md`](skills/tester/SKILL.md) | `document/postman/`, `backend/` (read-only) | [`document/postman/postman.json`](../document/postman/postman.json) |

## Rules catalog

| Rule | Group | `alwaysApply` | `globs` | Applies to | Description |
|------|-------|---------------|---------|------------|-------------|
| [`ponytail.mdc`](rules/ponytail.mdc) | Global | yes | — | all code | Ponytail, lazy senior dev mode. Always pick the simplest solution that works. |
| [`user-edits-respect.mdc`](rules/user-edits-respect.mdc) | Global | yes | — | all code | Do not revert the user's intentional edits; ask before restoring prior behavior. |
| [`english-only.mdc`](rules/english-only.mdc) | Global | yes | — | `.cursor/` | Require English-only content for everything under warehouse/.cursor (rules and skills). |
| [`document.mdc`](rules/document.mdc) | Global | yes | — | all areas | Keep warehouse/document (checklist, knowledge, postman) in sync with code in the same turn. |
| [`subprojects.mdc`](rules/subprojects.mdc) | Global | yes | — | all areas | Map folders to skills for design, frontend, backend, infrastructure, and document/postman. |
| [`makefile.mdc`](rules/makefile.mdc) | Global | yes | — | all areas | Prefer root Makefile targets over raw bun, go, docker compose, and design-serve. |
| [`forms.mdc`](rules/forms.mdc) | UI | yes | — | `design/`, `frontend/` | Form UX — placeholders, password visibility, required asterisk, under-field errors. |
| [`tables.mdc`](rules/tables.mdc) | UI | yes | — | `design/`, `frontend/`, `backend/` lists | Data tables — required pagination and default list sort order (tree, sort_order, created_at). |
| [`dates.mdc`](rules/dates.mdc) | UI | yes | — | `design/`, `frontend/` display | Date and datetime display format for design mockups and frontend UI. |
| [`icons.mdc`](rules/icons.mdc) | UI | yes | — | `design/`, `frontend/` | Use Lucide icons only — SVG files in design, lucide-react in frontend. |
| [`warehouse.mdc`](rules/warehouse.mdc) | Domain | yes | — | placement, stock | Warehouse layout tree and product item stock placement — bin-only anchor. |
| [`storybook.mdc`](rules/storybook.mdc) | Frontend | no | `frontend/**` | components, `app/` | Use Storybook as the baseline when reusing frontend UI components. |
| [`design-system.mdc`](rules/design-system.mdc) | Frontend | no | `frontend/**` | `frontend/components/` | Frontend UI layer stack — design tokens through warehouse pages (atomic composition). |

## Task → read this

| Task | Read |
|------|------|
| New design page / mock CRUD | `skills/design/SKILL.md` + [`forms.mdc`](rules/forms.mdc) + [`tables.mdc`](rules/tables.mdc) |
| Design list / pager / DnD reorder | `skills/design/SKILL.md` + [`tables.mdc`](rules/tables.mdc); `js/components/crud-list.js` |
| New table or seed field names | `skills/design/reference.md` + matching `design/schema/*.sql` |
| Design → Next.js handoff | `skills/frontend/SKILL.md` + [`design-system.mdc`](rules/design-system.mdc) |
| Route page under `frontend/app/` | `skills/frontend/SKILL.md` + [`storybook.mdc`](rules/storybook.mdc) Warehouse pages |
| New shared component | `skills/frontend/SKILL.md` + [`design-system.mdc`](rules/design-system.mdc) (user approval) |
| Goose migration from schema | `skills/backend/SKILL.md` + `skills/design/reference.md` |
| List API pagination / sort | `skills/backend/SKILL.md` + [`tables.mdc`](rules/tables.mdc) |
| Product bin placement | [`warehouse.mdc`](rules/warehouse.mdc) + area skill |
| API change + Postman | `skills/tester/SKILL.md` + [`document.mdc`](rules/document.mdc) |
| Run stack / migrate / Storybook build | [`makefile.mdc`](rules/makefile.mdc) → `make help` |

## MCP

Optional MCP servers are configured in [`mcp.json`](mcp.json). Do not commit or document API keys here; keep secrets in local or user-level config.

## Maintenance

When you add or rename a **rule** or **skill**:

1. Update this README (skills table and/or rules catalog).
2. If folder mapping changes, update [`rules/subprojects.mdc`](rules/subprojects.mdc).
3. Add a **Related rules** row in the affected `SKILL.md` if the topic is new.
