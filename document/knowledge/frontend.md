# Frontend knowledge

Production Warehouse UI under `frontend/` — Next.js App Router, bun, Tailwind CSS v4, shadcn/ui.

## Bootstrap (done)

One-time scaffold from repo root:

```bash
make frontend-bootstrap   # Next.js + shadcn init + next-themes / next-intl / lucide-react
```

Env sample: `frontend/env.example` → `NEXT_PUBLIC_API_URL` (default `http://localhost:1323`).

Default create-next-app starter page is present; Warehouse pages are not built yet.

## Dev commands

From repo root (`make help` for the full list):

| Target | Purpose |
|--------|---------|
| `make frontend-bootstrap` | One-time Next.js + shadcn + stack deps |
| `make frontend-dev` | Dev server (`bun dev`, port 3000) |
| `make frontend-build` | Production build |
| `make frontend-lint` | Lint |
| `make frontend-shadcn-add COMPONENT=<name>` | Add a shadcn component |

Prefer these make targets over raw `bun` / `bunx`.

## Stack

| Piece | Approach |
|-------|----------|
| Next.js | App Router (`app/`) |
| Package manager | bun |
| CSS | Tailwind CSS v4 |
| Components | shadcn/ui → `components/ui/` |
| Utils | `cn` package via `lib/utils.ts` (shadcn default) |
| Theme | `next-themes` installed — provider wiring deferred |
| i18n | `next-intl` installed — middleware / `[locale]` deferred |
| Icons | `lucide-react` from [Lucide](https://lucide.dev/icons/) |

## Deferred (next phases)

- `next-intl` middleware / locale routing (`th` default, `en`)
- `next-themes` `ThemeProvider` + no-flash dark mode
- Map design tokens (blue-white) into Tailwind/shadcn CSS
- Warehouse pages from `design/`
- Docker / infrastructure compose for frontend

## Icons

- Import components (`import { Sun } from "lucide-react"`); size/stroke via props or `className`
- On handoff from design: `design/assets/icons/<name>.svg` → PascalCase Lucide component
- Do not add parallel icon packs or vendor raw SVG trees for icons already in Lucide

## Docs

- Phase checklists: `document/checklist/frontend/`
- Bootstrap phase: `document/checklist/frontend/phase-frontend-bootstrap.md`
