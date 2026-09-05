# Warehouse frontend

Production UI for the Warehouse app — inventory, users, orders, and related warehouse workflows.

Not a generic Next.js starter. Screens come from approved mockups under `design/`, then talk to the Go API.

## Stack

| Piece | Choice |
|-------|--------|
| Framework | Next.js App Router |
| Package manager | bun |
| CSS | Tailwind CSS v4 |
| Components | shadcn/ui (`components/ui/`) |
| Theme | blue + white, light / dark (`next-themes`) |
| i18n | Thai + English (`next-intl`, default `th`) |
| Icons | Lucide (`lucide-react`) |
| API | `NEXT_PUBLIC_API_URL` (default `http://localhost:1323`) |

## Getting started

From the **repo root** (not this folder):

```bash
make frontend-bootstrap   # one-time: Next.js + shadcn + stack deps
make frontend-dev         # http://localhost:3000
```

Copy env sample and adjust if needed:

```bash
cp frontend/env.example frontend/.env.local
```

Other targets: `make frontend-build`, `make frontend-lint`, `make frontend-shadcn-add COMPONENT=<name>`. Run `make help` for the full list. Prefer make over raw `bun` / `bunx`.

## Layout

```
frontend/
├── app/                 # routes, layouts
├── components/
│   └── ui/              # shadcn only
├── lib/
│   └── utils.ts
├── env.example
└── package.json
```

## Conventions

- Source UI from `design/` when converting approved screens
- Call the real backend — do not invent parallel APIs or keep design mock `store.js` / `localStorage` in production
- Theme tokens and th/en copy should match design
- Agent guidance: see `AGENTS.md` (points at repo `.cursor/` skill and rules)

## Docs

- Knowledge: `document/knowledge/frontend.md`
- Phase checklists: `document/checklist/frontend/`
