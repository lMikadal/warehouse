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
	Sort        string
	Order       string
}

func userListOrderBy(sort, order string) string {
	col := "u.created_at ASC, u.id ASC"
	switch sort {
	case "username":
		col = "u.username"
	case "email":
		col = "LOWER(COALESCE(u.email, ''))"
	case "type":
		col = "u.type"
	case "status":
		col = "u.status"
	case "last_login_at":
		col = "u.last_login_at NULLS LAST"
	case "updated_at":
		col = "u.updated_at"
	default:
		return col
	}
	if order == "desc" {
		return col + " DESC, u.id DESC"
	}
	return col + " ASC, u.id ASC"
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
WHERE %s ORDER BY %s LIMIT $%d OFFSET $%d`, wList, userListOrderBy(f.Sort, f.Order), limitIdx, offsetIdx)
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

func (r *UserRepository) Update(ctx context.Context, id int64, email *string, passwordHash, creditHash, discountHash *string, clearApprovalPins bool, userType, status *string, roleID *int64, actorID int64) error {
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
	var pwArg any
	if passwordHash != nil {
		pwArg = *passwordHash
	}
	var creditArg any
	if clearApprovalPins {
		creditArg = nil
	} else if creditHash != nil {
		creditArg = *creditHash
	}
	var discountArg any
	if clearApprovalPins {
		discountArg = nil
	} else if discountHash != nil {
		discountArg = *discountHash
	}
	_, err = r.db.ExecContext(ctx, `
UPDATE admin_user SET
  email = $2,
  type = $3::admin_user_type,
  status = $4::admin_user_status,
  admin_role_id = $5,
  password_hash = COALESCE($6, password_hash),
  password_credit_hash = CASE
    WHEN $7::boolean THEN NULL
    WHEN $8::text IS NOT NULL THEN $8
    ELSE password_credit_hash
  END,
  password_discount_hash = CASE
    WHEN $7::boolean THEN NULL
    WHEN $9::text IS NOT NULL THEN $9
    ELSE password_discount_hash
  END,
  updated_at = NOW(),
  updated_by = $10
WHERE id = $1`,
		id, emailVal, typeVal, statusVal, roleVal, pwArg, clearApprovalPins, creditArg, discountArg, nullID(actorID))
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
