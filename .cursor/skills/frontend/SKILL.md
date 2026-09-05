---
name: frontend
description: >-
  Build Warehouse app production UI in frontend/ with Next.js App Router, bun,
  Tailwind CSS v4, shadcn/ui, blue-white theme, light/dark mode, and th/en
  i18n. Use when working under frontend/, converting design mockups to React,
  or wiring API calls to the Go backend.
---

# Frontend (Next.js)

Warehouse app production UI in `frontend/` — App Router, bun, Tailwind v4, shadcn/ui.

## Scope

- Work in `frontend/**`
- Source UI from `design/` mockups when converting approved screens
- Call backend via env — do not invent parallel APIs
- When behavior/knowledge changes → update `document/checklist/` and `document/knowledge/frontend.md` (see `.cursor/rules/document.mdc`)

## Shared principles

1. **Warehouse app** — UI for the warehouse domain; not a generic off-context dashboard
2. **Reusable + maintainable** — shadcn in `components/ui/`; split feature components; avoid duplication
3. **Strong security** — sanitize/escape on display; no secrets in the client; do not leak tokens in logs/UI
4. **Responsive** — mobile / tablet / computer / computer-wide (breakpoints below)
5. **Theme: blue + white** — map design tokens into Tailwind/shadcn consistently
6. **Light + dark mode** — `next-themes` + shadcn dark; default from `prefers-color-scheme`; no wrong-theme flash on load
7. **i18n: th + en** — `next-intl`; messages `th`/`en`; default `th`; language switcher required

### Breakpoints (mobile-first)

| Name | Width | Notes |
|------|-------|-------|
| mobile | &lt; 640px | base |
| tablet | ≥ 640px | |
| computer | ≥ 1024px | desktop |
| computer-wide | ≥ 1440px | wide |

### Theme tokens

| Token | Role |
|-------|------|
| `--color-primary` | Primary blue |
| `--color-primary-foreground` | Text on primary |
| `--color-background` | Surface (light = white, dark = dark) |
| `--color-foreground` | Text on surface |
| `--color-muted` | Muted surface / soft borders |

- Toggle with `data-theme` or `.dark` on `html` — match design
- Light: white surface + clear blue; Dark: dark surface + blue with enough contrast

### i18n (frontend)

- `next-intl` (same idea as parent Warehouse frontend)
- Locale in route or cookie; do not hardcode Thai-only copy in components

## Stack

| Tech | Approach |
|------|----------|
| Next.js | App Router (`app/`) |
| Package manager | bun |
| CSS | Tailwind CSS v4 |
| Components | shadcn/ui → `components/ui/` |
| Icons | lucide-react |
| Utils | `clsx` + `tailwind-merge` → `lib/utils.ts` (`cn`) |
| Theme | `next-themes` + shadcn dark mode |
| i18n | `next-intl` (`th`, `en`) |

## Bootstrap (empty folder only)

```bash
cd frontend
bun create next-app .   # App Router, TypeScript, Tailwind, ESLint
bunx shadcn@latest init
```

Keep default shadcn config; enable dark mode; add `next-themes` + `next-intl`; add components with `bunx shadcn@latest add <name>`.

## Layout

```
frontend/
├── app/              # routes, layouts
├── components/
│   └── ui/           # shadcn only
├── lib/
│   └── utils.ts
└── package.json
```

## From design → frontend

1. Read the approved page under `design/pages/`
2. Map layout to React + Tailwind (all four breakpoints)
3. Prefer shadcn (`Button`, `Input`, `Dialog`, `Table`, …) over custom CSS clones
4. Port theme tokens (blue-white, light/dark) and i18n keys from design
5. Do not keep mock `store.js` / `localStorage` in production — call the real API

## API

- Base URL: `process.env.NEXT_PUBLIC_API_URL` (default `http://localhost:1323`)
- Prefer small fetch helpers in `lib/` — no heavy client state library unless asked
- Send locale when backend expects it (`Accept-Language` or agreed header)

## Reference (parent monorepo)

When unsure about patterns, peek at the sibling Warehouse `frontend/` — **do not copy whole modules wholesale**.

## Do not

- Edit `design/` mockups unless the user asks
- Bypass shadcn with raw form controls when a component already exists
- Hardcode single-language or light-only UI
- Add a second CSS framework or replace bun with npm/yarn without being asked
- Commit secrets; use `.env.local` / compose env
