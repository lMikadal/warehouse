# Frontend knowledge

Production Warehouse UI under `frontend/` — Next.js App Router, bun, Tailwind CSS v4, shadcn/ui.

## Bootstrap (done)

One-time scaffold from repo root:

```bash
make frontend-bootstrap   # Next.js + shadcn init + next-themes / next-intl / lucide-react
```

Env sample: `frontend/env.example` → `NEXT_PUBLIC_API_URL=http://localhost:1323/api/v1`.

Default create-next-app starter page is present; Warehouse pages are not built yet.

## Docker

- `frontend/Dockerfile.dev` — bun + Next.js hot reload (compose volume-mounts source)
- `frontend/Dockerfile.prod` — multi-stage build for prod overlay; default `NEXT_PUBLIC_API_URL=/api/v1`
- Dev compose publishes `:3000`; also reachable via nginx-ui gateway at `http://localhost/`
- Prod overlay does **not** publish `:3000` — traffic enters via `nginx:alpine` on `:80` with same-origin `/api/v1`

## Dev commands

From repo root (`make help` for the full list):

| Target | Purpose |
|--------|---------|
| `make frontend-bootstrap` | One-time Next.js + shadcn + stack deps |
| `make frontend-dev` | Dev server (`bun dev`, port 3000) |
| `make frontend-build` | Production build |
| `make frontend-lint` | Lint |
| `make frontend-shadcn-add COMPONENT=<name>` | Add a shadcn component |
| `make run` / `make docker-up` | Full Docker stack |

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
| API base | Dev: `NEXT_PUBLIC_API_URL` → `http://localhost:1323/api/v1`; prod Docker bakes `/api/v1` |

## Deferred (next phases)

- `next-intl` middleware / locale routing (`th` default, `en`)
- `next-themes` `ThemeProvider` + no-flash dark mode
- Map design tokens (blue-white) into Tailwind/shadcn CSS
- Warehouse pages from `design/`

## Forms (handoff from design)

When building forms from approved `design/` mockups, port these four rules (see `.cursor/rules/forms.mdc`):

| Design | Frontend |
|--------|----------|
| `data-i18n-placeholder-input` / `-select` | `t('form.placeholder.input\|select', { label: t(labelKey) })` |
| `data-i18n-placeholder="search.placeholder"` | `t('search.placeholder')` — search inputs only |
| `.password-field` + eye toggle | shadcn `Input` + Lucide `Eye` / `EyeOff` |
| `.form-field__required` (red `*`) | red `*` after `FormLabel` |
| `.form-field__error` / `error.required` | shadcn `FormMessage` via React Hook Form |

Reference mockup: `design/pages/login.html`.

## Icons

- Import components (`import { Sun } from "lucide-react"`); size/stroke via props or `className`
- On handoff from design: `design/assets/icons/<name>.svg` → PascalCase Lucide component
- Do not add parallel icon packs or vendor raw SVG trees for icons already in Lucide

## Docs

- Phase checklists: `document/checklist/frontend/`
- Bootstrap phase: `document/checklist/frontend/phase-frontend-bootstrap.md`
- Infrastructure: `document/knowledge/infrastructure.md`
