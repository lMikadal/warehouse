package location

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/lMikadal/warehouse/backend/internal/tree"
)

type Row struct {
	ID        int64
	Name      string
	SortOrder int
	IsActive  bool
	UpdatedAt time.Time
	Names     map[string]string
}

type ListFilter struct {
	Page, Limit    int
	Locale, Search string
	IsActive       *bool
	Sort, Order    string
}

type CreateInput struct {
	IsActive bool
	Names    map[string]string
	ActorID  int64
}

type Patch struct {
	IsActive *bool
	Names    map[string]string
	ActorID  int64
}

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) List(ctx context.Context, f ListFilter) ([]Row, int, error) {
	locale := f.Locale
	if locale == "" {
		locale = "th"
	}
	args := []any{locale}
	clauses := []string{"t.deleted_at IS NULL"}
	n := 2
	if f.IsActive != nil {
		clauses = append(clauses, fmt.Sprintf("t.is_active = $%d", n))
		args = append(args, *f.IsActive)
		n++
	}
	if f.Search != "" {
		clauses = append(clauses, fmt.Sprintf("(l.name ILIKE $%d OR CAST(t.id AS TEXT) = $%d)", n, n))
		args = append(args, "%"+f.Search+"%")
		n++
	}
	where := strings.Join(clauses, " AND ")

	var total int
	countQ := `SELECT COUNT(*) FROM location_location t
LEFT JOIN location_location_language l ON l.location_location_id = t.id AND l.locale = $1
WHERE ` + where
	if err := r.db.QueryRowContext(ctx, countQ, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	limit := f.Limit
	if limit <= 0 {
		limit = 10
	}
	page := f.Page
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * limit
	orderBy := listOrderBy(f.Sort, f.Order)

	q := fmt.Sprintf(`SELECT t.id, COALESCE(l.name, ''), t.sort_order, t.is_active, t.updated_at
FROM location_location t
LEFT JOIN location_location_language l ON l.location_location_id = t.id AND l.locale = $1
WHERE %s ORDER BY %s LIMIT $%d OFFSET $%d`, where, orderBy, n, n+1)
	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var out []Row
	for rows.Next() {
		var row Row
		if err := rows.Scan(&row.ID, &row.Name, &row.SortOrder, &row.IsActive, &row.UpdatedAt); err != nil {
			return nil, 0, err
		}
		out = append(out, row)
	}
	return out, total, rows.Err()
}

func listOrderBy(sort, order string) string {
	col := "t.sort_order"
	dir := "ASC"
	switch strings.ToLower(sort) {
	case "name":
		col = "l.name"
	case "updated_at":
		col = "t.updated_at"
	}
	if strings.ToLower(order) == "desc" {
		dir = "DESC"
	}
	return fmt.Sprintf("%s %s, t.created_at ASC, t.id ASC", col, dir)
}

func (r *Repository) Get(ctx context.Context, id int64, locale string) (*Row, error) {
	if locale == "" {
		locale = "th"
	}
	q := `SELECT t.id, COALESCE(l.name, ''), t.sort_order, t.is_active, t.updated_at
FROM location_location t
LEFT JOIN location_location_language l ON l.location_location_id = t.id AND l.locale = $2
WHERE t.id = $1 AND t.deleted_at IS NULL`
	var row Row
	err := r.db.QueryRowContext(ctx, q, id, locale).Scan(
		&row.ID, &row.Name, &row.SortOrder, &row.IsActive, &row.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	names, err := r.loadNames(ctx, id)
	if err != nil {
		return nil, err
	}
	row.Names = names
	return &row, nil
}

func (r *Repository) Create(ctx context.Context, in CreateInput) (int64, error) {
	if err := validateNames(in.Names); err != nil {
		return 0, err
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	var maxSort int
	if err := tx.QueryRowContext(ctx,
		`SELECT COALESCE(MAX(sort_order), 0) FROM location_location WHERE deleted_at IS NULL`,
	).Scan(&maxSort); err != nil {
		return 0, err
	}
	sortOrder := maxSort + 100

	var id int64
	act := nullActor(in.ActorID)
	err = tx.QueryRowContext(ctx, `
INSERT INTO location_location (sort_order, is_active, created_by, updated_by)
VALUES ($1, $2, $3, $3) RETURNING id`, sortOrder, in.IsActive, act).Scan(&id)
	if err != nil {
		return 0, err
	}
	if err := upsertNames(ctx, tx, id, in.Names); err != nil {
		return 0, err
	}
	return id, tx.Commit()
}

func (r *Repository) Update(ctx context.Context, id int64, p Patch) error {
	var exists bool
	if err := r.db.QueryRowContext(ctx,
		`SELECT EXISTS(SELECT 1 FROM location_location WHERE id = $1 AND deleted_at IS NULL)`, id,
	).Scan(&exists); err != nil {
		return err
	}
	if !exists {
		return ErrNotFound
	}
	if p.Names != nil {
		if err := validateNames(p.Names); err != nil {
			return ErrValidation
		}
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if p.IsActive != nil {
		if _, err := tx.ExecContext(ctx, `
UPDATE location_location SET is_active = $2, updated_at = NOW(), updated_by = $3
WHERE id = $1 AND deleted_at IS NULL`, id, *p.IsActive, nullActor(p.ActorID)); err != nil {
			return err
		}
	} else {
		if _, err := tx.ExecContext(ctx, `
UPDATE location_location SET updated_at = NOW(), updated_by = $2
WHERE id = $1 AND deleted_at IS NULL`, id, nullActor(p.ActorID)); err != nil {
			return err
		}
	}
	if p.Names != nil {
		if err := upsertNames(ctx, tx, id, p.Names); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (r *Repository) SoftDelete(ctx context.Context, id int64, actorID int64) error {
	res, err := r.db.ExecContext(ctx, `
UPDATE location_location SET deleted_at = NOW(), updated_at = NOW(), updated_by = $2
WHERE id = $1 AND deleted_at IS NULL`, id, nullActor(actorID))
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *Repository) Reorder(ctx context.Context, dragID, targetID int64, actorID int64) error {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, sort_order FROM location_location WHERE deleted_at IS NULL ORDER BY sort_order ASC, id ASC`)
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
	if err := rows.Err(); err != nil {
		return err
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
	act := nullActor(actorID)
	for id, so := range orderByID {
		if _, err := tx.ExecContext(ctx, `
UPDATE location_location SET sort_order = $2, updated_at = NOW(), updated_by = $3
WHERE id = $1 AND deleted_at IS NULL`, id, so, act); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (r *Repository) loadNames(ctx context.Context, id int64) (map[string]string, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT locale, name FROM location_location_language WHERE location_location_id = $1`, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]string{}
	for rows.Next() {
		var loc, name string
		if err := rows.Scan(&loc, &name); err != nil {
			return nil, err
		}
		out[loc] = name
	}
	return out, rows.Err()
}

func upsertNames(ctx context.Context, tx *sql.Tx, id int64, names map[string]string) error {
	for _, locale := range []string{"th", "en"} {
		name := strings.TrimSpace(names[locale])
		_, err := tx.ExecContext(ctx, `
INSERT INTO location_location_language (location_location_id, locale, name)
VALUES ($1, $2, $3)
ON CONFLICT (location_location_id, locale) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()`,
			id, locale, name)
		if err != nil {
			return err
		}
	}
	return nil
}

func validateNames(names map[string]string) error {
	if strings.TrimSpace(names["th"]) == "" || strings.TrimSpace(names["en"]) == "" {
		return ErrValidation
	}
	return nil
}

func nullActor(id int64) sql.NullInt64 {
	if id <= 0 {
		return sql.NullInt64{}
	}
	return sql.NullInt64{Int64: id, Valid: true}
}
