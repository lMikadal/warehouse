package admin

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
)

type UserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

type UserRow struct {
	ID          int64
	Username    string
	Email       sql.NullString
	Type        string
	Status      string
	AdminRoleID sql.NullInt64
	RoleName    string
	LastLoginAt sql.NullTime
	UpdatedAt   sql.NullTime
}

type UserListFilter struct {
	Page        int
	Limit       int
	Locale      string
	Search      string
	AdminRoleID *int64
	Type        string
	Status      string
}

func (r *UserRepository) List(ctx context.Context, f UserListFilter) ([]UserRow, int64, error) {
	locale := f.Locale
	if locale == "" {
		locale = "th"
	}
	wCount, countArgs := userWhereClause(f, 1)
	var total int64
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM admin_user u WHERE "+wCount, countArgs...).Scan(&total); err != nil {
		return nil, 0, err
	}
	wList, listArgs := userWhereClause(f, 2)
	limitIdx := 2 + len(listArgs)
	offsetIdx := limitIdx + 1
	q := fmt.Sprintf(`
SELECT u.id, u.username, u.email, u.type::text, u.status::text, u.admin_role_id, COALESCE(arl.name, ''),
       u.last_login_at, u.updated_at
FROM admin_user u
LEFT JOIN admin_role_language arl ON arl.admin_role_id = u.admin_role_id AND arl.locale = $1
WHERE %s ORDER BY u.created_at ASC, u.id ASC LIMIT $%d OFFSET $%d`, wList, limitIdx, offsetIdx)
	args := append([]any{locale}, listArgs...)
	args = append(args, f.Limit, (f.Page-1)*f.Limit)
	rows, err := r.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var out []UserRow
	for rows.Next() {
		var row UserRow
		if err := rows.Scan(&row.ID, &row.Username, &row.Email, &row.Type, &row.Status, &row.AdminRoleID, &row.RoleName,
			&row.LastLoginAt, &row.UpdatedAt); err != nil {
			return nil, 0, err
		}
		out = append(out, row)
	}
	return out, total, rows.Err()
}

func (r *UserRepository) Get(ctx context.Context, id int64) (*UserRow, error) {
	var row UserRow
	err := r.db.QueryRowContext(ctx, `
SELECT id, username, email, type::text, status::text, admin_role_id, last_login_at, updated_at
FROM admin_user WHERE id = $1 AND deleted_at IS NULL`, id).Scan(
		&row.ID, &row.Username, &row.Email, &row.Type, &row.Status, &row.AdminRoleID, &row.LastLoginAt, &row.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func (r *UserRepository) Create(ctx context.Context, username, email, passwordHash, userType, status string, roleID int64, actorID int64) (int64, error) {
	var id int64
	err := r.db.QueryRowContext(ctx, `
INSERT INTO admin_user (username, email, password_hash, type, status, admin_role_id, created_by, updated_by)
VALUES ($1, $2, $3, $4::admin_user_type, $5::admin_user_status, $6, $7, $7)
RETURNING id`,
		username, nullStr(email), passwordHash, userType, status, roleID, nullID(actorID)).Scan(&id)
	return id, err
}

func (r *UserRepository) Update(ctx context.Context, id int64, email *string, passwordHash *string, userType, status *string, roleID *int64, actorID int64) error {
	// ponytail: dynamic UPDATE omitted — patch fields individually
	u, err := r.Get(ctx, id)
	if err != nil || u == nil {
		return sql.ErrNoRows
	}
	emailVal := u.Email
	if email != nil {
		emailVal = nullStr(*email)
	}
	typeVal := u.Type
	if userType != nil {
		typeVal = *userType
	}
	statusVal := u.Status
	if status != nil {
		statusVal = *status
	}
	roleVal := u.AdminRoleID
	if roleID != nil {
		roleVal = sql.NullInt64{Int64: *roleID, Valid: true}
	}
	hash := sql.NullString{}
	if passwordHash != nil {
		hash = sql.NullString{String: *passwordHash, Valid: true}
	}
	if passwordHash != nil {
		_, err = r.db.ExecContext(ctx, `
UPDATE admin_user SET email = $2, password_hash = $3, type = $4::admin_user_type, status = $5::admin_user_status,
  admin_role_id = $6, updated_at = NOW(), updated_by = $7 WHERE id = $1`,
			id, emailVal, hash.String, typeVal, statusVal, roleVal, nullID(actorID))
	} else {
		_, err = r.db.ExecContext(ctx, `
UPDATE admin_user SET email = $2, type = $3::admin_user_type, status = $4::admin_user_status,
  admin_role_id = $5, updated_at = NOW(), updated_by = $6 WHERE id = $1`,
			id, emailVal, typeVal, statusVal, roleVal, nullID(actorID))
	}
	return err
}

func (r *UserRepository) SoftDelete(ctx context.Context, id int64, actorID int64) error {
	res, err := r.db.ExecContext(ctx, `
UPDATE admin_user SET deleted_at = NOW(), updated_at = NOW(), updated_by = $2 WHERE id = $1 AND deleted_at IS NULL`, id, nullID(actorID))
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (r *UserRepository) UsernameExists(ctx context.Context, username string, excludeID int64) (bool, error) {
	var ok bool
	err := r.db.QueryRowContext(ctx, `
SELECT EXISTS (
  SELECT 1 FROM admin_user WHERE deleted_at IS NULL AND LOWER(username) = LOWER($1) AND id <> $2
)`, username, excludeID).Scan(&ok)
	return ok, err
}

func userWhereClause(f UserListFilter, start int) (string, []any) {
	where := []string{"u.deleted_at IS NULL"}
	args := []any{}
	n := start
	if f.AdminRoleID != nil {
		where = append(where, fmt.Sprintf("u.admin_role_id = $%d", n))
		args = append(args, *f.AdminRoleID)
		n++
	}
	if f.Type != "" {
		where = append(where, fmt.Sprintf("u.type = $%d::admin_user_type", n))
		args = append(args, f.Type)
		n++
	}
	if f.Status != "" {
		where = append(where, fmt.Sprintf("u.status = $%d::admin_user_status", n))
		args = append(args, f.Status)
		n++
	}
	if f.Search != "" {
		where = append(where, fmt.Sprintf("(LOWER(u.username) LIKE $%d OR LOWER(COALESCE(u.email, '')) LIKE $%d)", n, n))
		args = append(args, "%"+strings.ToLower(f.Search)+"%")
	}
	return strings.Join(where, " AND "), args
}

func nullStr(s string) sql.NullString {
	if strings.TrimSpace(s) == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: s, Valid: true}
}
