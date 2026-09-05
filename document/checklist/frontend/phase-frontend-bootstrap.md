# Phase: Frontend bootstrap

Scaffold the Warehouse production UI under `frontend/` with packages only (no custom Warehouse pages).

## Phase checklist

- [x] Extend root `Makefile` `frontend-bootstrap` (mkdir, non-interactive create-next-app + shadcn init, stack deps)
- [x] Run `make frontend-bootstrap` (Next.js App Router, TypeScript, Tailwind v4, ESLint, shadcn)
- [x] Install stack deps: `next-themes`, `next-intl`, `lucide-react`
- [x] Add `frontend/env.example` with `NEXT_PUBLIC_API_URL=http://localhost:1323`
- [x] Confirm `components.json` + `lib/utils.ts` exist

## Required checklist

Must pass before this phase is done:

- [x] `make frontend-bootstrap` completes without prompts
- [x] `package.json` lists `next`, `react`, `tailwindcss`, `next-themes`, `next-intl`, `lucide-react`
- [x] `make frontend-build` passes
- [x] `make frontend-lint` passes
