# Phase: Member tier settings (backoffice)

Production UI for sidebar **สมาชิก → ระดับ** (`/admin/member/tiers`).

## Phase checklist

- [x] BFF proxy `app/api/v1/auth/proxy/member/tiers/*` + [`lib/bff-member-tier-handlers.ts`](../../../frontend/lib/bff-member-tier-handlers.ts) + [`lib/member-tier-api.ts`](../../../frontend/lib/member-tier-api.ts)
- [x] Split-pane page under `member/_shared/` (tier form + tier cards + relation dialog)
- [x] Route `/admin/member/tiers` + split `loading.tsx`
- [x] i18n `page-member-tier.json` (th/en)
- [x] Profile combo loader (`member-tier-profile-combos.ts`) from business relations APIs
- [x] Tier files pass local ESLint (repo-wide `make frontend-lint` / `make frontend-build` may fail on pre-existing `CrudPaginationBar` typing in other routes)

## Required checklist

- [x] Permissions via `useResourcePermissions("member", "member_tier")`
- [x] Tier form: badge (`member_tier_badge`), th/en names, active; relation modal with profile combo, purchase range, percent discount, scope + attributes, promotion
- [x] No import/export; no tier DnD in UI (API reorder/move deferred)
- [x] Stats header (`GET /tiers/stats`) + per-tier `member_count` + progress; list search removed
- [x] `total_sales_ytd` shows 0 until order aggregate API exists
