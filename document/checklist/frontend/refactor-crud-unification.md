# Refactor: CRUD list / API unification

Shared primitives for wired admin backoffice modules. Behavior and API contracts unchanged.

## Phase checklist

- [x] Backend `internal/httputil` — `PathID`, `PathIDValidation`, `ActorID`, `ReorderBody`
- [x] Backend `internal/tree` — `PersistParentScopedSiblingReorder` (supplier contact/bank)
- [x] Frontend `useCrudSortableReorder` + `crud-list-rows` sort helpers
- [x] Frontend `CrudNestedSortableList` (+ Storybook)
- [x] Frontend `lib/bff-nested-mutate.ts` (supplier nested BFF)
- [x] Migrate DnD lists to shared hook (see matrix below)
- [x] Supplier nested lists + form dialogs extracted

## Wired route matrix

| Route / list | `useCrudListQuery` | `useCrudSortableReorder` / nested list |
|--------------|-------------------|----------------------------------------|
| Setting lang (`setting-lang-list`) | yes | yes |
| Setting code | yes | yes |
| Setting VAT | yes | n/a (no DnD) |
| System geo | yes | yes |
| System language | yes | yes |
| System menu | yes | custom tree move (kept) |
| System permission | yes | n/a |
| Admin users / roles | yes | n/a |
| Supplier user list | yes | n/a |
| Supplier contacts / banks | n/a | `CrudNestedSortableList` |

## Required checklist

- [x] `make backend-test`
- [x] `make frontend-lint`
- [x] `make frontend-build`
- [x] `make frontend-storybook-build`
- [ ] Manual smoke: reorder on one setting + one system list + supplier nested (recommended)

## Future modules

When adding product / warehouse / member lists: use `useCrudListQuery`, table skeleton, `useCrudSortableReorder` or tree move API; BFF via `createSystemCrudHandlers` or `proxyNestedMutate`; backend `httputil` + reorder helpers per [document/knowledge/backend.md](../../knowledge/backend.md).
