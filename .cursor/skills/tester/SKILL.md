---
name: tester
description: >-
  Test Warehouse backend APIs and maintain Postman Collection v2.1 at
  document/postman/postman.json plus env.example. Use for API test cases,
  curl/httpie smoke tests, make run / backend-dev, and Postman handoff.
---

# Tester (backend API + Postman)

Test the **backend first** and keep `document/postman/postman.json` ready for user import or handoff.

## Agent navigation

- **Index:** [`.cursor/README.md`](../../README.md)
- **Invoke:** `/tester`

## Related rules (read when relevant)

| Topic | Rule |
|-------|------|
| Postman + checklist sync | [`.cursor/rules/document.mdc`](../../rules/document.mdc) |
| Start stack / backend | [`.cursor/rules/makefile.mdc`](../../rules/makefile.mdc) |

## Read order

1. This file — collection rules and test workflow
2. Handler/DTO in `backend/` for the endpoint under test
3. Update `document/postman/postman.json` in the same turn when APIs change

## Scope

- Read API contracts from `backend/` (handlers, DTOs, swagger if present)
- Design and run API tests against a running backend
- Create/update `document/postman/postman.json` (Collection v2.1) + `document/postman/env.example`
- Keep the relevant `document/checklist/<area>/` and `document/knowledge/` in sync when tests reveal contract or phase changes (see `.cursor/rules/document.mdc`)
- Do **not** change backend business logic unless the user asks after a bug report

## Shared principles

1. **Warehouse app** — Test warehouse domain (auth, users, products, orders, …)
2. **Reusable + maintainable** — Folder the collection by module; reuse variables for repeated requests
3. **Strong security** — **Never** commit real passwords / JWTs; use `{{accessToken}}` and `env.example` only
4. **Responsive / theme** — Not required (this is not a UI skill)
5. **i18n: th + en** — Include `Accept-Language: th` or `en` on samples that involve localized responses

## Artifacts

```
warehouse/document/postman/
├── postman.json       # Collection v2.1 — import into Postman immediately
└── env.example        # baseUrl, accessToken placeholders — no real secrets
```

## Postman collection rules

| Rule | Detail |
|------|--------|
| Format | Postman Collection **v2.1** |
| `info.name` | `Warehouse API` |
| Variables | `{{baseUrl}}` default `http://localhost:1323`, `{{accessToken}}` |
| Folders | By domain/module to match backend |
| Auth | Bearer `{{accessToken}}` on the collection or login-required folders |
| Requests | method, path, example body, basic test script (assert status) |
| Sync | Update `document/postman/postman.json` whenever APIs change in this task |

## Test workflow

1. Read the contract from `backend/` (handler + DTO; or swagger if present)
2. Group cases: health, auth, CRUD per resource, permission denied, bad input
3. Hit a running backend — start with `make run` (full stack) or `make backend-dev` (local air), then curl / httpie / Postman
4. Short summary: pass/fail + cause
5. Sync into `document/postman/postman.json` for handoff

## Case checklist (per resource)

- [ ] Happy path (expected 2xx)
- [ ] Missing/invalid auth (401/403)
- [ ] Validation fail (400)
- [ ] Not found (404) when an id applies
- [ ] `Accept-Language: th` and `en` when error messages are i18n

## Handoff to user

1. Deliver `document/postman/postman.json`
2. Import in Postman → set `baseUrl` / `accessToken` from `document/postman/env.example`
3. Run folders or the collection in order (login first if a token is required)

## Do not

- Commit real secrets into `document/postman/postman.json` or git
- Rewrite backend modules while “just testing”
- Skip updating the collection after discovering a new/changed endpoint in the same task
- Treat frontend E2E as the primary job of this skill (backend API first)
