package auth

import (
	"context"
	"database/sql"
)

type RBAC struct {
	db *sql.DB
}

func NewRBAC(db *sql.DB) *RBAC {
	return &RBAC{db: db}
}

func (r *RBAC) HasPermission(ctx context.Context, roleID int64, code string) (bool, error) {
	var ok bool
	err := r.db.QueryRowContext(ctx, `
SELECT EXISTS (
  SELECT 1
  FROM admin_role_permission arp
  JOIN system_permission sp ON sp.id = arp.system_permission_id
  WHERE arp.admin_role_id = $1
    AND sp.code = $2
    AND sp.is_active = TRUE
    AND sp.deleted_at IS NULL
)`, roleID, code).Scan(&ok)
	return ok, err
}

func (r *RBAC) SessionActive(ctx context.Context, jti string) (bool, error) {
	var ok bool
	err := r.db.QueryRowContext(ctx, `
SELECT EXISTS (
  SELECT 1 FROM admin_user_session
  WHERE access_token_jti = $1
    AND is_active = TRUE
    AND revoked_at IS NULL
    AND expires_at > NOW()
)`, jti).Scan(&ok)
	return ok, err
}
