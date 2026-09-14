# Phase: Admin login UI (shell)

First production login screen from design; wired to backend JWT via BFF.

## Phase checklist

- [x] Route `/admin/login` — `app/[locale]/(admin)/admin/(auth)/login/`
- [x] i18n `login.*` + `home.adminLogin` in `messages/th.json` and `en.json`
- [x] Login layout: `FormCard` panel; page shell `bg-background` (`components/molecules/form-card.tsx`)
- [x] Password visibility on shared `Input`
- [x] Home page link to admin login
- [x] `document/knowledge/frontend.md` — Login route subsection
- [x] BFF `POST /api/v1/auth/login` + httpOnly cookies + middleware guard
- [x] Post-login redirect to backend `landing_path`

## Required checklist

- [x] Required-field validation uses `toast.error` with placeholder copy (first invalid field); invalid chrome on fields, no under-field text
- [x] `make frontend-storybook-build` passes (Input change)
- [x] ESLint clean on login route + `Input` (repo-wide lint may fail on unrelated stories)
- [x] Session auto-refresh on 401 (BFF + client `authFetch`); logout + login redirect when refresh fails
