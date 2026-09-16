# Phase: system_file upload API

Central image upload to MinIO + `system_file` metadata.

## Phase checklist

- [x] Parse `S3_*` + `S3_PUBLIC_BASE_URL` in backend config
- [x] MinIO `ObjectStore` (`internal/infra/s3`)
- [x] `POST/GET/DELETE /api/v1/system/files` on authed group (Bearer only)
- [x] Setting bank/sale-channel PATCH accepts `system_file_id` null to clear logo
- [x] Bank GET/list returns `system_file_id`
- [x] Setting bank/sale-channel DELETE + logo PATCH purge old file (`DeleteIfUnreferenced`)
- [x] `cmd/file-cleanup` + `make backend-file-cleanup`

## Required checklist

- [x] `make backend-test` passes
- [x] Postman folder **System files**
- [x] `document/knowledge/backend.md` updated
- [x] `IsReferenced` covers all current `system_file_id` FK tables
