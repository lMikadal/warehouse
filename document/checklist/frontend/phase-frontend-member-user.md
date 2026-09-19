# Phase: Member users (backoffice)

Production UI for sidebar **สมาชิก → รายชื่อ** (`/admin/member/users`).

## Phase checklist

- [x] BFF proxy `app/api/v1/auth/proxy/member/users/*` + [`lib/bff-member-user-handlers.ts`](../../../frontend/lib/bff-member-user-handlers.ts) + [`lib/member-user-api.ts`](../../../frontend/lib/member-user-api.ts)
- [x] List + full create/edit form under `member/_shared/` (tabs: info, orders placeholder, discounts, files)
- [x] Routes `/admin/member/users`, `/new`, `/[id]` + `loading.tsx`
- [x] i18n `page-member-user.json` + `member-user.json` (th/en)
- [x] Filter combobox helpers [`lib/member-user-filters-combobox.ts`](../../../frontend/lib/member-user-filters-combobox.ts) on `GET /users/filters` facets (not tier filters API)

## Required checklist

- [x] Permissions via `useResourcePermissions("member", "member_user")`
- [x] List: search, date range, business filter, stat cards, header sort, status switch, pagination 10/25/50/100
- [x] Form: general + tax/doc/financial addresses, profile combos, avatar, staff, note; edit discounts (percent) + files
- [x] Import/export toasts (coming soon); annual purchase / last purchase / order tab placeholders until order API
- [x] Backend child tables renamed to `member_user_address`, `member_user_discount`, `member_user_file`

## Related

- Design mockup — [`phase-design-member-user.md`](../../design/phase-design-member-user.md)
- Backend — [`phase-backend-member.md`](../../backend/phase-backend-member.md)
