package admin

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
)

type RoleRepository struct {
	db *sql.DB
}

func NewRoleRepository(db *sql.DB) *RoleRepository {
	return &RoleRepository{db: db}
}

type RoleRow struct {
	ID        int64
	IsActive  bool
	Name      string
	UpdatedAt sql.NullTime
}

type RoleListFilter struct {
	Page     int
	Limit    int
	Locale   string
	Search   string
	IsActive *bool
	Sort     string
	Order    string
}

func roleListOrderBy(sort, order string) string {
	col := "ar.created_at ASC, ar.id ASC"
	switch sort {
	case "name":
		col = "COALESCE(arl.name, '')"
	case "is_active":
		col = "ar.is_active"
	case "updated_at":
		col = "ar.updated_at"
	default:
		return col
	}
	if order == "desc" {
		return col + " DESC, ar.id DESC"
	}
	return col + " ASC, ar.id ASC"
}

func (r *RoleRepository) List(ctx context.Context, f RoleListFilter) ([]RoleRow, int64, error) {
	locale := f.Locale
	if locale == "" {
		locale = "th"
	}
	where := []string{"ar.deleted_at IS NULL"}
	args := []any{locale}
	n := 2
	if f.IsActive != nil {
		where = append(where, fmt.Sprintf("ar.is_active = $%d", n))
		args = append(args, *f.IsActive)
		n++
	}
	if f.Search != "" {
		where = append(where, fmt.Sprintf("LOWER(COALESCE(arl.name, '')) LIKE $%d", n))
		args = append(args, "%"+strings.ToLower(f.Search)+"%")
		n++
	}
	w := strings.Join(where, " AND ")
	countQ := fmt.Sprintf(`SELECT COUNT(*) FROM admin_role ar
LEFT JOIN admin_role_language arl ON arl.admin_role_id = ar.id AND arl.locale = $1
WHERE %s`, w)
	var total int64
	if err := r.db.QueryRowContext(ctx, countQ, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	q := fmt.Sprintf(`
SELECT ar.id, ar.is_active, COALESCE(arl.name, ''), ar.updated_at
FROM admin_role ar
LEFT JOIN admin_role_language arl ON arl.admin_role_id = ar.id AND arl.locale = $1
WHERE %s ORDER BY %s LIMIT $%d OFFSET $%d`, w, roleListOrderBy(f.Sort, f.Order), n, n+1)
	args = append(args, f.Limit, (f.Page-1)*f.Limit)
	rows, err := r.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var out []RoleRow
	for rows.Next() {
		var row RoleRow
		if err := rows.Scan(&row.ID, &row.IsActive, &row.Name, &row.UpdatedAt); err != nil {
			return nil, 0, err
		}
		out = append(out, row)
	}
	return out, total, rows.Err()
}

func (r *RoleRepository) Get(ctx context.Context, id int64) (map[string]string, []int64, bool, error) {
	var isActive bool
	err := r.db.QueryRowContext(ctx, `SELECT is_active FROM admin_role WHERE id = $1 AND deleted_at IS NULL`, id).Scan(&isActive)
	if err == sql.ErrNoRows {
		return nil, nil, false, nil
	}
	if err != nil {
		return nil, nil, false, err
	}
	names := map[string]string{}
	langRows, err := r.db.QueryContext(ctx, `SELECT locale, name FROM admin_role_language WHERE admin_role_id = $1`, id)
	if err != nil {
		return nil, nil, false, err
	}
	defer langRows.Close()
	for langRows.Next() {
		var locale, name string
		if err := langRows.Scan(&locale, &name); err != nil {
			return nil, nil, false, err
		}
		names[locale] = name
	}
	permRows, err := r.db.QueryContext(ctx, `SELECT system_permission_id FROM admin_role_permission WHERE admin_role_id = $1`, id)
	if err != nil {
		return nil, nil, false, err
	}
	defer permRows.Close()
	var permIDs []int64
	for permRows.Next() {
		var pid int64
		if err := permRows.Scan(&pid); err != nil {
			return nil, nil, false, err
		}
		permIDs = append(permIDs, pid)
	}
	return names, permIDs, isActive, nil
}

func (r *RoleRepository) Create(ctx context.Context, isActive bool, names map[string]string, permIDs []int64, actorID int64) (int64, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()
	var id int64
	err = tx.QueryRowContext(ctx, `
INSERT INTO admin_role (is_active, created_by, updated_by) VALUES ($1, $2, $2) RETURNING id`,
		isActive, nullID(actorID)).Scan(&id)
	if err != nil {
		return 0, err
	}
	if err := upsertRoleLang(ctx, tx, id, names); err != nil {
		return 0, err
	}
	if err := replaceRolePerms(ctx, tx, id, permIDs); err != nil {
		return 0, err
	}
	return id, tx.Commit()
}

func (r *RoleRepository) Update(ctx context.Context, id int64, isActive *bool, names map[string]string, permIDs []int64, actorID int64) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if isActive != nil {
		_, err = tx.ExecContext(ctx, `UPDATE admin_role SET is_active = $2, updated_at = NOW(), updated_by = $3 WHERE id = $1 AND deleted_at IS NULL`,
			id, *isActive, nullID(actorID))
		if err != nil {
			return err
		}
	}
	if names != nil {
		if err := upsertRoleLang(ctx, tx, id, names); err != nil {
			return err
		}
	}
	if permIDs != nil {
		if err := replaceRolePerms(ctx, tx, id, permIDs); err != nil {
			return err
		}
	}
	_, err = tx.ExecContext(ctx, `UPDATE admin_role SET updated_at = NOW(), updated_by = $2 WHERE id = $1`, id, nullID(actorID))
	return tx.Commit()
}

func (r *RoleRepository) SoftDelete(ctx context.Context, id int64, actorID int64) error {
	res, err := r.db.ExecContext(ctx, `
UPDATE admin_role SET deleted_at = NOW(), updated_at = NOW(), updated_by = $2 WHERE id = $1 AND deleted_at IS NULL`, id, nullID(actorID))
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (r *RoleRepository) HasActiveUsers(ctx context.Context, roleID int64) (bool, error) {
	var ok bool
	err := r.db.QueryRowContext(ctx, `
SELECT EXISTS (
  SELECT 1 FROM admin_user WHERE admin_role_id = $1 AND deleted_at IS NULL AND status = 'active'
)`, roleID).Scan(&ok)
	return ok, err
}

func upsertRoleLang(ctx context.Context, tx *sql.Tx, roleID int64, names map[string]string) error {
	for locale, name := range names {
		if locale != "th" && locale != "en" {
			continue
		}
		_, err := tx.ExecContext(ctx, `
INSERT INTO admin_role_language (admin_role_id, locale, name) VALUES ($1, $2, $3)
ON CONFLICT (admin_role_id, locale) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()`,
			roleID, locale, name)
		if err != nil {
			return err
		}
	}
	return nil
}

func replaceRolePerms(ctx context.Context, tx *sql.Tx, roleID int64, permIDs []int64) error {
	if _, err := tx.ExecContext(ctx, `DELETE FROM admin_role_permission WHERE admin_role_id = $1`, roleID); err != nil {
		return err
	}
	for _, pid := range permIDs {
		_, err := tx.ExecContext(ctx, `INSERT INTO admin_role_permission (admin_role_id, system_permission_id) VALUES ($1, $2)`, roleID, pid)
		if err != nil {
			return err
		}
	}
	return nil
}

func nullID(id int64) sql.NullInt64 {
	if id <= 0 {
		return sql.NullInt64{}
	}
	return sql.NullInt64{Int64: id, Valid: true}
}
