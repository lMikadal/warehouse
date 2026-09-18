package member

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

type SettingRow struct {
	ID        int64
	SKU       *string
	Name      string
	IsActive  bool
	UpdatedAt time.Time
	Names     map[string]string
}

type SettingListFilter struct {
	Page, Limit    int
	Locale, Search string
	IsActive       *bool
}

type SettingCreateInput struct {
	SKU      *string
	IsActive bool
	Names    map[string]string
	ActorID  int64
}

type SettingPatch struct {
	SKU      *string
	SKUSet   bool
	IsActive *bool
	Names    map[string]string
	ActorID  int64
}

type SettingRepository struct {
	db *sql.DB
}

func NewSettingRepository(db *sql.DB) *SettingRepository {
	return &SettingRepository{db: db}
}

func (r *SettingRepository) List(ctx context.Context, k SettingKind, f SettingListFilter) ([]SettingRow, int, error) {
	spec := settingSpecFor(k)
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
	if q := strings.TrimSpace(f.Search); q != "" {
		clauses = append(clauses, fmt.Sprintf("(l.name ILIKE $%d OR t.sku ILIKE $%d)", n, n))
		args = append(args, "%"+q+"%")
		n++
	}
	where := strings.Join(clauses, " AND ")

	var total int
	countQ := fmt.Sprintf(`SELECT COUNT(*) FROM %s t LEFT JOIN %s l ON l.%s = t.id AND l.locale = $1 WHERE %s`,
		spec.table, spec.langTable, spec.langFK, where)
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

	q := fmt.Sprintf(`SELECT t.id, t.sku, COALESCE(l.name, ''), t.is_active, t.updated_at
FROM %s t LEFT JOIN %s l ON l.%s = t.id AND l.locale = $1
WHERE %s ORDER BY t.id ASC LIMIT $%d OFFSET $%d`,
		spec.table, spec.langTable, spec.langFK, where, n, n+1)
	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var out []SettingRow
	for rows.Next() {
		var row SettingRow
		if err := rows.Scan(&row.ID, &row.SKU, &row.Name, &row.IsActive, &row.UpdatedAt); err != nil {
			return nil, 0, err
		}
		out = append(out, row)
	}
	return out, total, rows.Err()
}

func (r *SettingRepository) Get(ctx context.Context, k SettingKind, id int64, locale string) (*SettingRow, error) {
	spec := settingSpecFor(k)
	if locale == "" {
		locale = "th"
	}
	var row SettingRow
	err := r.db.QueryRowContext(ctx, fmt.Sprintf(`
SELECT t.id, t.sku, COALESCE(l.name, ''), t.is_active, t.updated_at
FROM %s t LEFT JOIN %s l ON l.%s = t.id AND l.locale = $2
WHERE t.id = $1 AND t.deleted_at IS NULL`, spec.table, spec.langTable, spec.langFK), id, locale).Scan(
		&row.ID, &row.SKU, &row.Name, &row.IsActive, &row.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	names, err := r.loadNames(ctx, spec, id)
	if err != nil {
		return nil, err
	}
	row.Names = names
	return &row, nil
}

func (r *SettingRepository) Create(ctx context.Context, k SettingKind, in SettingCreateInput) (int64, error) {
	if err := validateNames(in.Names); err != nil {
		return 0, err
	}
	if in.SKU != nil && strings.TrimSpace(*in.SKU) != "" {
		ok, err := r.skuExists(ctx, k, strings.TrimSpace(*in.SKU), 0)
		if err != nil {
			return 0, err
		}
		if ok {
			return 0, ErrConflict
		}
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	spec := settingSpecFor(k)
	var id int64
	act := nullActor(in.ActorID)
	err = tx.QueryRowContext(ctx, fmt.Sprintf(`
INSERT INTO %s (sku, is_active, created_by, updated_by) VALUES ($1, $2, $3, $3) RETURNING id`, spec.table),
		in.SKU, in.IsActive, act).Scan(&id)
	if err != nil {
		return 0, err
	}
	if err := upsertSettingNames(ctx, tx, spec, id, in.Names); err != nil {
		return 0, err
	}
	return id, tx.Commit()
}

func (r *SettingRepository) Update(ctx context.Context, k SettingKind, id int64, p SettingPatch) error {
	spec := settingSpecFor(k)
	var exists bool
	if err := r.db.QueryRowContext(ctx, fmt.Sprintf("SELECT EXISTS(SELECT 1 FROM %s WHERE id = $1 AND deleted_at IS NULL)", spec.table), id).Scan(&exists); err != nil {
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
	if p.SKUSet && p.SKU != nil && strings.TrimSpace(*p.SKU) != "" {
		ok, err := r.skuExists(ctx, k, strings.TrimSpace(*p.SKU), id)
		if err != nil {
			return err
		}
		if ok {
			return ErrConflict
		}
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	sets := []string{"updated_at = NOW()", fmt.Sprintf("updated_by = $%d", 2)}
	args := []any{id, nullActor(p.ActorID)}
	n := 3
	if p.IsActive != nil {
		sets = append(sets, fmt.Sprintf("is_active = $%d", n))
		args = append(args, *p.IsActive)
		n++
	}
	if p.SKUSet {
		sets = append(sets, fmt.Sprintf("sku = $%d", n))
		args = append(args, p.SKU)
		n++
	}
	q := fmt.Sprintf("UPDATE %s SET %s WHERE id = $1 AND deleted_at IS NULL", spec.table, strings.Join(sets, ", "))
	if _, err := tx.ExecContext(ctx, q, args...); err != nil {
		return err
	}
	if p.Names != nil {
		if err := upsertSettingNames(ctx, tx, spec, id, p.Names); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (r *SettingRepository) SoftDelete(ctx context.Context, k SettingKind, id int64, actorID int64) error {
	spec := settingSpecFor(k)
	res, err := r.db.ExecContext(ctx, fmt.Sprintf(`
UPDATE %s SET deleted_at = NOW(), updated_at = NOW(), updated_by = $2 WHERE id = $1 AND deleted_at IS NULL`, spec.table), id, nullActor(actorID))
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *SettingRepository) skuExists(ctx context.Context, k SettingKind, sku string, excludeID int64) (bool, error) {
	spec := settingSpecFor(k)
	var id int64
	err := r.db.QueryRowContext(ctx, fmt.Sprintf(`
SELECT id FROM %s WHERE deleted_at IS NULL AND LOWER(sku) = LOWER($1) AND ($2 = 0 OR id <> $2)`, spec.table), sku, excludeID).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	return err == nil, err
}

func (r *SettingRepository) loadNames(ctx context.Context, spec settingSpec, id int64) (map[string]string, error) {
	q := fmt.Sprintf("SELECT locale, name FROM %s WHERE %s = $1", spec.langTable, spec.langFK)
	rows, err := r.db.QueryContext(ctx, q, id)
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

func upsertSettingNames(ctx context.Context, tx *sql.Tx, spec settingSpec, id int64, names map[string]string) error {
	for _, locale := range []string{"th", "en"} {
		name := strings.TrimSpace(names[locale])
		_, err := tx.ExecContext(ctx, fmt.Sprintf(`
INSERT INTO %s (%s, locale, name) VALUES ($1, $2, $3)
ON CONFLICT (%s, locale) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()`,
			spec.langTable, spec.langFK, spec.langFK), id, locale, name)
		if err != nil {
			return err
		}
	}
	return nil
}
