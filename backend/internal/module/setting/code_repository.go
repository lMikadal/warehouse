package setting

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/lMikadal/warehouse/backend/internal/tree"
)

type CodeRow struct {
	ID        int64
	Code      string
	Value     string
	SortOrder int
	IsActive  bool
	UpdatedAt time.Time
}

type CodeListFilter struct {
	Page, Limit int
	Search      string
	IsActive    *bool
	Sort, Order string
}

type CodeRepository struct {
	db *sql.DB
}

func NewCodeRepository(db *sql.DB) *CodeRepository {
	return &CodeRepository{db: db}
}

func (r *CodeRepository) List(ctx context.Context, f CodeListFilter) ([]CodeRow, int, error) {
	w := []string{"deleted_at IS NULL"}
	args := []any{}
	n := 1
	if f.IsActive != nil {
		w = append(w, fmt.Sprintf("is_active = $%d", n))
		args = append(args, *f.IsActive)
		n++
	}
	if f.Search != "" {
		w = append(w, fmt.Sprintf("(code ILIKE $%d OR value ILIKE $%d)", n, n))
		args = append(args, "%"+f.Search+"%")
		n++
	}
	where := strings.Join(w, " AND ")

	var total int
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM setting_code WHERE "+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	limit, page := f.Limit, f.Page
	if limit <= 0 {
		limit = 10
	}
	if page <= 0 {
		page = 1
	}
	order := codeOrderBy(f.Sort, f.Order)
	args = append(args, limit, (page-1)*limit)
	q := fmt.Sprintf(`SELECT id, code, value, sort_order, is_active, updated_at FROM setting_code WHERE %s ORDER BY %s LIMIT $%d OFFSET $%d`,
		where, order, n, n+1)
	rows, err := r.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var out []CodeRow
	for rows.Next() {
		var row CodeRow
		if err := rows.Scan(&row.ID, &row.Code, &row.Value, &row.SortOrder, &row.IsActive, &row.UpdatedAt); err != nil {
			return nil, 0, err
		}
		out = append(out, row)
	}
	return out, total, rows.Err()
}

func (r *CodeRepository) Get(ctx context.Context, id int64) (*CodeRow, error) {
	var row CodeRow
	err := r.db.QueryRowContext(ctx, `
SELECT id, code, value, sort_order, is_active, updated_at FROM setting_code WHERE id = $1 AND deleted_at IS NULL`, id).
		Scan(&row.ID, &row.Code, &row.Value, &row.SortOrder, &row.IsActive, &row.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func (r *CodeRepository) Create(ctx context.Context, code, value string, isActive bool, actorID int64) (int64, error) {
	code = strings.TrimSpace(code)
	value = strings.TrimSpace(value)
	if code == "" || value == "" {
		return 0, ErrValidation
	}
	taken, err := r.codeTaken(ctx, code, 0)
	if err != nil {
		return 0, err
	}
	if taken {
		return 0, ErrConflict
	}
	var maxSort int
	if err := r.db.QueryRowContext(ctx, `SELECT COALESCE(MAX(sort_order), 0) FROM setting_code WHERE deleted_at IS NULL`).Scan(&maxSort); err != nil {
		return 0, err
	}
	var id int64
	err = r.db.QueryRowContext(ctx, `
INSERT INTO setting_code (code, value, sort_order, is_active, created_by, updated_by)
VALUES ($1, $2, $3, $4, $5, $5) RETURNING id`, code, value, maxSort+10, isActive, nullActor(actorID)).Scan(&id)
	return id, err
}

func (r *CodeRepository) Update(ctx context.Context, id int64, code, value *string, isActive *bool, actorID int64) error {
	var exists bool
	if err := r.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM setting_code WHERE id = $1 AND deleted_at IS NULL)`, id).Scan(&exists); err != nil {
		return err
	}
	if !exists {
		return ErrNotFound
	}
	if code != nil {
		c := strings.TrimSpace(*code)
		if c == "" {
			return ErrValidation
		}
		taken, err := r.codeTaken(ctx, c, id)
		if err != nil {
			return err
		}
		if taken {
			return ErrConflict
		}
	}
	sets := []string{"updated_at = NOW()", "updated_by = $2"}
	args := []any{id, nullActor(actorID)}
	n := 3
	if code != nil {
		sets = append(sets, fmt.Sprintf("code = $%d", n))
		args = append(args, strings.TrimSpace(*code))
		n++
	}
	if value != nil {
		v := strings.TrimSpace(*value)
		if v == "" {
			return ErrValidation
		}
		sets = append(sets, fmt.Sprintf("value = $%d", n))
		args = append(args, v)
		n++
	}
	if isActive != nil {
		sets = append(sets, fmt.Sprintf("is_active = $%d", n))
		args = append(args, *isActive)
		n++
	}
	_, err := r.db.ExecContext(ctx, "UPDATE setting_code SET "+strings.Join(sets, ", ")+" WHERE id = $1 AND deleted_at IS NULL", args...)
	return err
}

func (r *CodeRepository) SoftDelete(ctx context.Context, id int64, actorID int64) error {
	res, err := r.db.ExecContext(ctx, `
UPDATE setting_code SET deleted_at = NOW(), updated_at = NOW(), updated_by = $2 WHERE id = $1 AND deleted_at IS NULL`, id, nullActor(actorID))
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *CodeRepository) Reorder(ctx context.Context, dragID, targetID int64, actorID int64) error {
	rows, err := r.db.QueryContext(ctx, `SELECT id, sort_order FROM setting_code WHERE deleted_at IS NULL ORDER BY sort_order ASC, id ASC`)
	if err != nil {
		return err
	}
	defer rows.Close()
	var nodes []tree.Node
	for rows.Next() {
		var n tree.Node
		if err := rows.Scan(&n.ID, &n.SortOrder); err != nil {
			return err
		}
		nodes = append(nodes, n)
	}
	next, err := tree.ReorderSiblings(nodes, dragID, targetID)
	if err != nil {
		return ErrInvalidReorder
	}
	orderByID := map[int64]int{}
	for _, n := range next {
		orderByID[n.ID] = n.SortOrder
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	for id, so := range orderByID {
		if _, err := tx.ExecContext(ctx, `UPDATE setting_code SET sort_order = $2, updated_at = NOW(), updated_by = $3 WHERE id = $1 AND deleted_at IS NULL`, id, so, nullActor(actorID)); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (r *CodeRepository) codeTaken(ctx context.Context, code string, excludeID int64) (bool, error) {
	var exists bool
	err := r.db.QueryRowContext(ctx, `
SELECT EXISTS(SELECT 1 FROM setting_code WHERE code = $1 AND deleted_at IS NULL AND id <> $2)`, code, excludeID).Scan(&exists)
	return exists, err
}

func codeOrderBy(sort, order string) string {
	col := "sort_order"
	if strings.ToLower(sort) == "code" {
		col = "code"
	}
	if strings.ToLower(sort) == "updated_at" {
		col = "updated_at"
	}
	dir := "ASC"
	if strings.ToLower(order) == "desc" {
		dir = "DESC"
	}
	return fmt.Sprintf("%s %s, id ASC", col, dir)
}
