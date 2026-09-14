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
	Sort     string
	Order    string
}

var allowedPermissionListSort = map[string]string{
	"code":       "code",
	"module":     "module",
	"type":       "type",
	"action":     "action",
	"is_active":  "is_active",
	"created_at": "created_at",
	"updated_at": "updated_at",
}

func permissionListOrderBy(sortCol, order string) string {
	col, ok := allowedPermissionListSort[sortCol]
	if !ok {
		return "created_at ASC, id ASC"
	}
	dir := "ASC"
	if order == "desc" {
		dir = "DESC"
	}
	if col == "action" {
		return fmt.Sprintf("action::text %s, id ASC", dir)
	}
	return fmt.Sprintf("%s %s, id ASC", col, dir)
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

	orderBy := permissionListOrderBy(f.Sort, f.Order)
	q := fmt.Sprintf(`
SELECT id, code, module, type, action::text, resource, method::text, is_active, updated_at
FROM system_permission WHERE %s ORDER BY %s LIMIT $%d OFFSET $%d`, wclause, orderBy, n, n+1)
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

func queryDistinctStrings(ctx context.Context, db *sql.DB, q string, args ...any) ([]string, error) {
	rows, err := db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []string
	for rows.Next() {
		var s string
		if err := rows.Scan(&s); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

func (r *PermissionRepository) FilterFacets(ctx context.Context, module string) (PermissionFilterFacets, error) {
	base := "FROM system_permission WHERE deleted_at IS NULL"
	modules, err := queryDistinctStrings(ctx, r.db,
		"SELECT DISTINCT module "+base+" ORDER BY module")
	if err != nil {
		return PermissionFilterFacets{}, err
	}
	typeQ := "SELECT DISTINCT type " + base
	typeArgs := []any{}
	if module != "" {
		typeQ += " AND module = $1"
		typeArgs = append(typeArgs, module)
	}
	typeQ += " ORDER BY type"
	types, err := queryDistinctStrings(ctx, r.db, typeQ, typeArgs...)
	if err != nil {
		return PermissionFilterFacets{}, err
	}
	actions, err := queryDistinctStrings(ctx, r.db,
		"SELECT DISTINCT action::text "+base+" ORDER BY action")
	if err != nil {
		return PermissionFilterFacets{}, err
	}
	return PermissionFilterFacets{Modules: modules, Types: types, Actions: actions}, nil
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
