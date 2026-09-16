# Phase: Image upload UI

Shared `ImageUploadField` + setting bank/sale-channel logos.

## Phase checklist

- [x] Molecule `ImageUploadField` (single + gallery DnD) + Storybook
- [x] BFF proxy `/api/v1/auth/proxy/system/files`
- [x] `lib/system-file-api.ts`
- [x] Setting bank + sale channel edit sheets (`logoPurpose`)
- [x] Deferred upload on save (`uploadTiming`, `ImageUploadItem`, `resolveSettingLogoFileId`)

## Required checklist

- [x] i18n `form.upload.*`, `col.logo` (th/en)
- [x] `make frontend-storybook-build` passes
- [x] `document/knowledge/frontend.md` updated
- [x] Cancel/draft logo does not call `POST /system/files` until Save
