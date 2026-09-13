# Frontend knowledge

Production Warehouse UI under `frontend/` — Next.js App Router, bun, Tailwind CSS v4, shadcn/ui.

## Bootstrap (done)

Scaffold + stack deps: Next.js 16.3.5, Tailwind v4, shadcn/ui, `lucide-react`, `next-themes`, **next-intl** (`th` + `en`, default **`th`**).

Env sample: `frontend/env.example` → `NEXT_PUBLIC_API_URL=http://localhost:1323/api/v1`.

## i18n

- Locales: `th` (default), `en`
- Routes: ภาษาไทย (default) ที่ **`/`** ไม่มี `/th`; อังกฤษที่ **`/en`…**
- Messages: `frontend/messages/th.json`, `en.json`
- Config: `frontend/i18n/routing.ts`, `request.ts`, `navigation.ts`
- Client navigation: `@/i18n/navigation` (`Link`, `useRouter`, `usePathname`)
- Header: `LocaleSwitch` (ไทย / EN) + `ThemeModeSwitch`

Port more keys from `design/js/i18n/` into `messages/` as pages ship.

## Docker

- `frontend/Dockerfile.dev` / `Dockerfile.prod` — see compose in `infrastructure/`
- After `package.json` changes with compose up: `make docker-frontend-install`

## Dev commands

From repo root: `make frontend-dev`, `make frontend-build`, `make frontend-lint`, `make frontend-shadcn-add COMPONENT=<name>`.

## Stack (current)

| Piece | Approach |
|-------|----------|
| Next.js | 16.3.5 App Router `app/[locale]/` |
| i18n | next-intl, default `th` |
| Theme | next-themes, `storageKey` `warehouse-design-theme`, `data-theme` on `<html>` |
| Icons | lucide-react |
| Components | shadcn/ui → `components/ui/` |

## Docs

- Agent skill: `.cursor/skills/frontend/SKILL.md`
- Phase checklists: `document/checklist/frontend/phase-frontend-*.md`
