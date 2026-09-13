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
- When behavior/knowledge changes → update `document/checklist/frontend/` and `document/knowledge/frontend.md` (see `.cursor/rules/document.mdc`)

## Shared principles

1. **Warehouse app** — UI for the warehouse domain; not a generic off-context dashboard
2. **Reusable + maintainable** — shadcn in `components/ui/`; split feature components; avoid duplication
3. **Strong security** — sanitize/escape on display; no secrets in the client; do not leak tokens in logs/UI
4. **Responsive** — mobile / tablet / computer / computer-wide (breakpoints below)
5. **Theme: blue + white** — map design tokens into Tailwind/shadcn consistently
6. **Light + dark mode** — `next-themes` + shadcn dark; default from `prefers-color-scheme`; no wrong-theme flash on load
7. **i18n: th + en** — `next-intl`; messages `th`/`en`; default `th`; language switcher required
8. **Icons: Lucide** — `lucide-react` from [Lucide](https://lucide.dev/icons/); match design icon names on handoff

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

## UI architecture (layer stack)

Build **top-down**: design tokens → shadcn/ui → base primitives → molecules/organisms → design-system standards → warehouse route pages. Full rules: [`.cursor/rules/design-system.mdc`](../../rules/design-system.mdc).

| Step | What |
|------|------|
| Tokens | `app/globals.css` — color, spacing, radius, typography |
| shadcn + base UI | `components/ui/` — Button, Input, Select, Dialog, Table (+ stories) |
| Atomic | `components/molecules/`, `components/organisms/` |
| Design system | Cursor rules + Storybook + `document/knowledge/frontend.md` |
| Pages | `app/[locale]/…` — inventory, orders, products, users, etc. |

Pages compose organisms/molecules; avoid stacking many `ui/` imports on routes except trivial cases.

### i18n (frontend)

- `next-intl` (same idea as parent Warehouse frontend)
- Locale in route or cookie; do not hardcode Thai-only copy in components

### Icons (frontend)

- Source: [Lucide](https://lucide.dev/icons/) via `lucide-react` only
- Import components (`import { Sun } from "lucide-react"`); size/stroke via props or `className`
- Match design Lucide names on handoff (`design/assets/icons/sun.svg` → `Sun`)
- Do not add parallel icon packs or commit raw SVG trees for icons already in Lucide

## Stack

| Tech | Approach |
|------|----------|
| Next.js | App Router (`app/`) |
| Package manager | bun |
| CSS | Tailwind CSS v4 |
| Components | shadcn/ui → `components/ui/` |
| Icons | lucide-react ([Lucide](https://lucide.dev/icons/)) |
| Utils | `clsx` + `tailwind-merge` → `lib/utils.ts` (`cn`); date display → `lib/format-datetime.ts` (see [`.cursor/rules/dates.mdc`](../../.cursor/rules/dates.mdc)) |
| Theme | `next-themes` + shadcn dark mode |
| i18n | `next-intl` (`th`, `en`) |

## Bootstrap (empty folder only)

From repo root (see root `Makefile`):

```bash
make frontend-bootstrap   # bun create next-app + shadcn init
make frontend-dev         # bun dev
make frontend-shadcn-add COMPONENT=<name>
```

Keep default shadcn config; enable dark mode; add `next-themes` + `next-intl`. Do not run raw `bun` / `bunx` when a make target exists — use `make help`.

## Layout

```
frontend/
├── app/              # routes, layouts (warehouse pages)
├── components/
│   ├── ui/           # shadcn atoms (+ *.stories.tsx)
│   ├── molecules/    # small compositions (labeled field, pager strip, …)
│   ├── organisms/    # CRUD toolbar, data table shell, admin chrome, …
│   ├── locale-switch.tsx
│   ├── theme-mode-switch.tsx
│   └── theme-provider.tsx
├── .storybook/       # Storybook config
├── lib/
│   ├── utils.ts
│   └── format-datetime.ts
└── package.json
```

## Storybook (component baseline)

When pulling in a component from `components/`, **check Storybook first** ([`.cursor/rules/storybook.mdc`](../../rules/storybook.mdc)): read or run the matching `*.stories.tsx` for variants/props before wiring it into a page. Dev: `make frontend-storybook` (port 6006).

## From design → frontend

1. Read the approved page under `design/pages/`
2. Map layout to React + Tailwind (all four breakpoints)
3. Prefer shadcn (`Button`, `Input`, `Dialog`, `Table`, …) over custom CSS clones
4. Port theme tokens (blue-white, light/dark) and i18n keys from design
5. Map `design/assets/icons/<name>.svg` → PascalCase `lucide-react` component (same Lucide name)
6. After tokens and base `ui/` exist, extract repeated mockup chunks into **molecules/organisms** before wiring the route page
7. Do not keep mock `store.js` / `localStorage` in production — call the real API

## API

- Base URL: `process.env.NEXT_PUBLIC_API_URL` (default `http://localhost:1323`)
- Prefer small fetch helpers in `lib/` — no heavy client state library unless asked
- Send locale when backend expects it (`Accept-Language` or agreed header)

## Reference (parent monorepo)

When unsure about patterns, peek at the sibling Warehouse `frontend/` — **do not copy whole modules wholesale**.

## UX management

### Notifications (toasts)

Use shadcn's **Sonner** (`sonner` package, already wired by shadcn init) for all transient feedback. Do not build a custom toast system.

| Trigger | Call |
|---------|------|
| Successful mutation | `toast.success(t('feedback.saved'))` |
| Server / validation error | `toast.error(t('feedback.error'))` |
| Background async (e.g. export) | `toast.promise(promise, { loading, success, error })` |
| Non-blocking info | `toast.info(msg)` |
| Destructive confirmation | Confirm in a `Dialog` first; toast after |

Rule: every `mutation` (POST / PATCH / DELETE) result — success or error — must produce a visible toast. Silent mutations are a UX bug.

### Loading states

Priority order (pick the highest that fits):

1. **Skeleton** — for initial data load on a list or detail page (`shadcn/skeleton`)
2. **Disabled + spinner icon** — for submit/action buttons while a request is in flight
3. **Overlay spinner** — only for full-page transitions that can't be avoided

Never show a blank white area while data is loading.

### Optimistic updates

For fast-feeling mutations (rename, toggle, reorder):

1. Update local state immediately
2. Call the API in the background
3. On error: revert state + show error toast

Use React `useOptimistic` (Next.js App Router) when available; fall back to manual state toggle.

### Error boundaries

- Wrap each major route segment with an `error.tsx` boundary
- Show a user-friendly error card (not a raw stack trace or JSON blob)
- Provide a "Try again" button that calls `reset()` from the boundary

Error copy lives in i18n messages, not hardcoded English:

```ts
// messages/th.json
{ "error.generic": "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" }
// messages/en.json
{ "error.generic": "Something went wrong. Please try again." }
```

### Empty states

Every list / table component must handle the zero-rows case:

- Show an icon + short label + CTA button (e.g. "No products yet — Add product")
- Do not render a blank `<tbody>` or hidden element

### Tables

Follow [`.cursor/rules/tables.mdc`](../../.cursor/rules/tables.mdc):

- Paginate every data table (default page size **10**; options **10 / 25 / 50 / 100**; rows-per-page select + icon prev/next + range + page indicator); reset page on filter or page-size change
- Sort lists: tree → sibling `sort_order` → `id` per `parent_id`, DFS pre-order; flat `sort_order` → `created_at`; else `created_at` → `id`
- **Drag-and-drop reorder:** ship only when the API table has `sort_order`; tables without it stay normal lists (no grip column) — see [`.cursor/rules/tables.mdc`](../../.cursor/rules/tables.mdc)
- Match design `crud-list.js` pager UX and i18n keys on handoff

### Forms

- Every text-like input and form `<select>` use the placeholder pattern via `t('form.placeholder.input\|select', { label: t(labelKey) })`; **`type="search"`** uses `t('search.placeholder')` only (`ค้นหา` / `Search`)
- Every password field has an eye / eye-off toggle (shadcn `Input` + Lucide `Eye` / `EyeOff`)
- Required fields: red `*` after the label; use RHF + shadcn `FormMessage` under the field for validation errors
- On submit: empty required fields show `t('error.required')` under each field — not only a page-level alert
- Use React Hook Form + shadcn `Form` components
- Inline field error below the input on blur (not only on submit)
- Disable the submit button while the mutation is in flight (prevent double-submit)
- Clear field error when the user changes the value

### Handoff from design

| design pattern | frontend equivalent |
|----------------|---------------------|
| `toast.show(msg, 'success')` | `toast.success(t(key))` via Sonner |
| `toast.show(msg, 'error')` | `toast.error(t(key))` |
| `data-i18n-placeholder-input` / `-select` | `t('form.placeholder.input\|select', { label: t(labelKey) })` |
| `data-i18n-placeholder="search.placeholder"` | `t('search.placeholder')` — search inputs only |
| `.password-field` + `passwordToggle.bind` | shadcn `Input` + `Eye` / `EyeOff` toggle |
| `.form-field__required` + `.form-field__error` | red `*` + shadcn `FormMessage` |
| Dev Bar quick-login | Not ported — dev bar is design-only tooling |
| `modal.open(…)` | shadcn `Dialog` |
| `store.getAll(table)` | Server Component fetch or `useSWR` / `useQuery` call |

## Do not

- Edit `design/` mockups unless the user asks
- Bypass shadcn with raw form controls when a component already exists
- Hardcode single-language or light-only UI
- Add a second CSS framework or replace bun with npm/yarn without being asked
- Use other icon libraries or duplicate Lucide SVGs under `frontend/`
- Commit secrets; use `.env.local` / compose env
- Port `design/js/components/dev-bar.js` to `frontend/` — it is prototype-only tooling
