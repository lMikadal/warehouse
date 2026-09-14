package system

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
)

type PermissionRepository struct {
	db *sql.DB
}

func NewPermissionRepository(db *sql.DB) *PermissionRepository {
	return &PermissionRepository{db: db}
}

type PermissionListFilter struct {
	Page     int
	Limit    int
	Search   string
	Module   string
	Type     string
	Action   string
	IsActive *bool
}

func (r *PermissionRepository) List(ctx context.Context, f PermissionListFilter) ([]PermissionRow, int64, error) {
	where := []string{"deleted_at IS NULL"}
	args := []any{}
	n := 1
	if f.Module != "" {
		where = append(where, fmt.Sprintf("module = $%d", n))
		args = append(args, f.Module)
		n++
	}
	if f.Type != "" {
		where = append(where, fmt.Sprintf("type = $%d", n))
		args = append(args, f.Type)
		n++
	}
	if f.Action != "" {
		where = append(where, fmt.Sprintf("action = $%d", n))
		args = append(args, f.Action)
		n++
	}
	if f.IsActive != nil {
		where = append(where, fmt.Sprintf("is_active = $%d", n))
		args = append(args, *f.IsActive)
		n++
	}
	if f.Search != "" {
		where = append(where, fmt.Sprintf("(LOWER(code) LIKE $%d OR LOWER(module) LIKE $%d)", n, n))
		args = append(args, "%"+strings.ToLower(f.Search)+"%")
		n++
	}
	wclause := strings.Join(where, " AND ")

	var total int64
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM system_permission WHERE "+wclause, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	q := fmt.Sprintf(`
SELECT id, code, module, type, action::text, resource, method::text, is_active, updated_at
FROM system_permission WHERE %s ORDER BY id ASC LIMIT $%d OFFSET $%d`, wclause, n, n+1)
	args = append(args, f.Limit, (f.Page-1)*f.Limit)
	rows, err := r.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var out []PermissionRow
	for rows.Next() {
		var row PermissionRow
		if err := rows.Scan(&row.ID, &row.Code, &row.Module, &row.Type, &row.Action, &row.Resource, &row.Method, &row.IsActive, &row.UpdatedAt); err != nil {
			return nil, 0, err
		}
		out = append(out, row)
	}
	return out, total, rows.Err()
}

func (r *PermissionRepository) SetActive(ctx context.Context, id int64, active bool, actorID int64) (PermissionRow, error) {
	res, err := r.db.ExecContext(ctx, `
UPDATE system_permission SET is_active = $2, updated_at = NOW(), updated_by = $3
WHERE id = $1 AND deleted_at IS NULL`, id, active, nullInt64(actorID))
	if err != nil {
		return PermissionRow{}, err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return PermissionRow{}, sql.ErrNoRows
	}
	var row PermissionRow
	err = r.db.QueryRowContext(ctx, `
SELECT id, code, module, type, action::text, resource, method::text, is_active, updated_at
FROM system_permission WHERE id = $1`, id).Scan(
		&row.ID, &row.Code, &row.Module, &row.Type, &row.Action, &row.Resource, &row.Method, &row.IsActive, &row.UpdatedAt)
	return row, err
}
