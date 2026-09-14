package auth

import (
	"context"
	"database/sql"
	"time"
)

type UserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

type LoginUser struct {
	ID                  int64
	Username            string
	PasswordHash        string
	Status              string
	Type                string
	AdminRoleID         sql.NullInt64
	FailedLoginAttempts int
	LockedUntil         sql.NullTime
}

func (r *UserRepository) FindByUsername(ctx context.Context, username string) (*LoginUser, error) {
	var u LoginUser
	err := r.db.QueryRowContext(ctx, `
SELECT id, username, password_hash, status::text, type::text, admin_role_id,
       failed_login_attempts, locked_until
FROM admin_user
WHERE deleted_at IS NULL AND LOWER(username) = LOWER($1)`, username).Scan(
		&u.ID, &u.Username, &u.PasswordHash, &u.Status, &u.Type, &u.AdminRoleID,
		&u.FailedLoginAttempts, &u.LockedUntil,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *UserRepository) RecordLoginSuccess(ctx context.Context, userID int64) error {
	_, err := r.db.ExecContext(ctx, `
UPDATE admin_user
SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW(), updated_at = NOW()
WHERE id = $1`, userID)
	return err
}

func (r *UserRepository) RecordLoginFailure(ctx context.Context, userID int64, attempts int, lockedUntil *time.Time) error {
	if lockedUntil != nil {
		_, err := r.db.ExecContext(ctx, `
UPDATE admin_user SET failed_login_attempts = $2, locked_until = $3, updated_at = NOW() WHERE id = $1`,
			userID, attempts, *lockedUntil)
		return err
	}
	_, err := r.db.ExecContext(ctx, `
UPDATE admin_user SET failed_login_attempts = $2, updated_at = NOW() WHERE id = $1`, userID, attempts)
	return err
}

func (r *UserRepository) GetProfile(ctx context.Context, userID int64) (*UserProfile, error) {
	var p UserProfile
	var roleID sql.NullInt64
	err := r.db.QueryRowContext(ctx, `
SELECT id, username, type::text, admin_role_id
FROM admin_user
WHERE id = $1 AND deleted_at IS NULL`, userID).Scan(&p.ID, &p.Username, &p.Type, &roleID)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if roleID.Valid {
		p.AdminRoleID = &roleID.Int64
	}
	return &p, nil
}

type UserProfile struct {
	ID          int64  `json:"id"`
	Username    string `json:"username"`
	Type        string `json:"type"`
	AdminRoleID *int64 `json:"admin_role_id,omitempty"`
}
