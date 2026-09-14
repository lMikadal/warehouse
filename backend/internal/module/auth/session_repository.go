package auth

import (
	"context"
	"database/sql"
	"time"
)

type SessionRepository struct {
	db *sql.DB
}

func NewSessionRepository(db *sql.DB) *SessionRepository {
	return &SessionRepository{db: db}
}

type SessionRow struct {
	ID           int64
	AdminUserID  int64
	RefreshHash  string
	AccessJTI    string
	ExpiresAt    time.Time
}

func (r *SessionRepository) Create(ctx context.Context, userID int64, refreshHash, jti string, expiresAt time.Time, ip, userAgent string) error {
	_, err := r.db.ExecContext(ctx, `
INSERT INTO admin_user_session (
  admin_user_id, refresh_token_hash, access_token_jti, ip_address, user_agent, expires_at
) VALUES ($1, $2, $3, $4, $5, $6)`,
		userID, refreshHash, jti, nullStr(ip), nullStr(userAgent), expiresAt)
	return err
}

func (r *SessionRepository) FindByRefreshHash(ctx context.Context, hash string) (*SessionRow, error) {
	var row SessionRow
	err := r.db.QueryRowContext(ctx, `
SELECT id, admin_user_id, refresh_token_hash, COALESCE(access_token_jti, ''), expires_at
FROM admin_user_session
WHERE refresh_token_hash = $1
  AND is_active = TRUE
  AND revoked_at IS NULL
  AND expires_at > NOW()`, hash).Scan(&row.ID, &row.AdminUserID, &row.RefreshHash, &row.AccessJTI, &row.ExpiresAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func (r *SessionRepository) Revoke(ctx context.Context, sessionID int64, reason string) error {
	_, err := r.db.ExecContext(ctx, `
UPDATE admin_user_session
SET is_active = FALSE, revoked_at = NOW(), revoked_reason = $2
WHERE id = $1 AND revoked_at IS NULL`, sessionID, reason)
	return err
}

func (r *SessionRepository) RevokeByJTI(ctx context.Context, jti, reason string) error {
	_, err := r.db.ExecContext(ctx, `
UPDATE admin_user_session
SET is_active = FALSE, revoked_at = NOW(), revoked_reason = $2
WHERE access_token_jti = $1 AND revoked_at IS NULL`, jti, reason)
	return err
}

func (r *SessionRepository) TouchRefresh(ctx context.Context, sessionID int64) error {
	_, err := r.db.ExecContext(ctx, `
UPDATE admin_user_session SET last_used_at = NOW() WHERE id = $1`, sessionID)
	return err
}

func nullStr(s string) sql.NullString {
	if s == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: s, Valid: true}
}
