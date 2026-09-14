package website

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/lMikadal/warehouse/backend/internal/tree"
)

var (
	ErrNotFound            = errors.New("language not found")
	ErrDeactivateDefault   = errors.New("cannot deactivate default language")
	ErrDuplicateLocale     = errors.New("locale already exists")
	ErrInvalidReorder      = errors.New("invalid reorder")
)

type LanguageRepository struct {
	db *sql.DB
}

func NewLanguageRepository(db *sql.DB) *LanguageRepository {
	return &LanguageRepository{db: db}
}

type LanguageRow struct {
	ID        int64
	Locale    string
	Name      string
	SortOrder int
	IsActive  bool
	IsDefault bool
	UpdatedAt time.Time
}

type LanguageListFilter struct {
	Page     int
	Limit    int
	Search   string
	IsActive *bool
}

type LanguageCreateInput struct {
	Locale    string
	Name      string
	IsActive  bool
	IsDefault bool
	ActorID   int64
}

type LanguagePatch struct {
	Locale    *string
	Name      *string
	IsActive  *bool
	IsDefault *bool
	ActorID   int64
}

func (r *LanguageRepository) List(ctx context.Context, f LanguageListFilter) ([]LanguageRow, int64, error) {
	where := []string{"deleted_at IS NULL"}
	args := []any{}
	n := 1
	if f.IsActive != nil {
		where = append(where, fmt.Sprintf("is_active = $%d", n))
		args = append(args, *f.IsActive)
		n++
	}
	if f.Search != "" {
		where = append(where, fmt.Sprintf("(LOWER(locale) LIKE $%d OR LOWER(name) LIKE $%d)", n, n))
		args = append(args, "%"+strings.ToLower(f.Search)+"%")
		n++
	}
	w := strings.Join(where, " AND ")
	var total int64
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM website_language WHERE "+w, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	q := fmt.Sprintf(`
SELECT id, locale, name, sort_order, is_active, is_default, updated_at
FROM website_language WHERE %s ORDER BY sort_order ASC, id ASC LIMIT $%d OFFSET $%d`, w, n, n+1)
	args = append(args, f.Limit, (f.Page-1)*f.Limit)
	rows, err := r.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var out []LanguageRow
	for rows.Next() {
		var row LanguageRow
		if err := rows.Scan(&row.ID, &row.Locale, &row.Name, &row.SortOrder, &row.IsActive, &row.IsDefault, &row.UpdatedAt); err != nil {
			return nil, 0, err
		}
		out = append(out, row)
	}
	return out, total, rows.Err()
}

func (r *LanguageRepository) Get(ctx context.Context, id int64) (*LanguageRow, error) {
	row, err := r.scanOne(ctx, `SELECT id, locale, name, sort_order, is_active, is_default, updated_at
FROM website_language WHERE id = $1 AND deleted_at IS NULL`, id)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return row, nil
}

func (r *LanguageRepository) Create(ctx context.Context, in LanguageCreateInput) (int64, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	var maxSort int
	if err := tx.QueryRowContext(ctx, `SELECT COALESCE(MAX(sort_order), 0) FROM website_language WHERE deleted_at IS NULL`).Scan(&maxSort); err != nil {
		return 0, err
	}
	active := in.IsActive
	isDefault := in.IsDefault
	if isDefault {
		active = true
	}
	var id int64
	err = tx.QueryRowContext(ctx, `
INSERT INTO website_language (locale, name, sort_order, is_active, is_default, created_by, updated_by)
VALUES ($1, $2, $3, $4, $5, $6, $6) RETURNING id`,
		in.Locale, in.Name, maxSort+10, active, isDefault, nullInt64(in.ActorID)).Scan(&id)
	if err != nil {
		if isUniqueViolation(err) {
			return 0, ErrDuplicateLocale
		}
		return 0, err
	}
	if isDefault {
		if err := clearOtherDefaults(ctx, tx, id, in.ActorID); err != nil {
			return 0, err
		}
	}
	return id, tx.Commit()
}

func resolveLanguageUpdate(cur LanguageRow, patch LanguagePatch) (locale, name string, active, isDefault bool, err error) {
	locale = cur.Locale
	name = cur.Name
	active = cur.IsActive
	isDefault = cur.IsDefault
	if patch.Locale != nil {
		locale = strings.TrimSpace(*patch.Locale)
	}
	if patch.Name != nil {
		name = strings.TrimSpace(*patch.Name)
	}
	if patch.IsActive != nil {
		active = *patch.IsActive
	}
	if patch.IsDefault != nil {
		isDefault = *patch.IsDefault
	}
	if isDefault {
		active = true
	}
	if !active && isDefault {
		return "", "", false, false, ErrDeactivateDefault
	}
	if patch.IsActive != nil && !*patch.IsActive && cur.IsDefault && (patch.IsDefault == nil || *patch.IsDefault) {
		return "", "", false, false, ErrDeactivateDefault
	}
	return locale, name, active, isDefault, nil
}

func (r *LanguageRepository) Update(ctx context.Context, id int64, patch LanguagePatch) error {
	cur, err := r.getForUpdate(ctx, id)
	if err != nil {
		return err
	}
	if cur == nil {
		return ErrNotFound
	}
	locale, name, active, isDefault, err := resolveLanguageUpdate(*cur, patch)
	if err != nil {
		return err
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(ctx, `
UPDATE website_language
SET locale = $2, name = $3, is_active = $4, is_default = $5, updated_at = NOW(), updated_by = $6
WHERE id = $1 AND deleted_at IS NULL`, id, locale, name, active, isDefault, nullInt64(patch.ActorID))
	if err != nil {
		if isUniqueViolation(err) {
			return ErrDuplicateLocale
		}
		return err
	}
	if isDefault {
		if err := clearOtherDefaults(ctx, tx, id, patch.ActorID); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (r *LanguageRepository) SoftDelete(ctx context.Context, id int64, actorID int64) error {
	res, err := r.db.ExecContext(ctx, `
UPDATE website_language SET deleted_at = NOW(), updated_at = NOW(), updated_by = $2
WHERE id = $1 AND deleted_at IS NULL`, id, nullInt64(actorID))
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *LanguageRepository) Reorder(ctx context.Context, dragID, targetID int64, actorID int64) error {
	rows, err := r.loadAllNodes(ctx)
	if err != nil {
		return err
	}
	next, err := tree.ReorderSiblings(rows, dragID, targetID)
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
		if _, err := tx.ExecContext(ctx, `
UPDATE website_language SET sort_order = $2, updated_at = NOW(), updated_by = $3
WHERE id = $1 AND deleted_at IS NULL`, id, so, nullInt64(actorID)); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (r *LanguageRepository) loadAllNodes(ctx context.Context) ([]tree.Node, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT id, sort_order FROM website_language WHERE deleted_at IS NULL ORDER BY sort_order ASC, id ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []tree.Node
	for rows.Next() {
		var n tree.Node
		if err := rows.Scan(&n.ID, &n.SortOrder); err != nil {
			return nil, err
		}
		out = append(out, n)
	}
	return out, rows.Err()
}

func (r *LanguageRepository) getForUpdate(ctx context.Context, id int64) (*LanguageRow, error) {
	return r.scanOne(ctx, `SELECT id, locale, name, sort_order, is_active, is_default, updated_at
FROM website_language WHERE id = $1 AND deleted_at IS NULL`, id)
}

func (r *LanguageRepository) scanOne(ctx context.Context, q string, id int64) (*LanguageRow, error) {
	var row LanguageRow
	err := r.db.QueryRowContext(ctx, q, id).Scan(
		&row.ID, &row.Locale, &row.Name, &row.SortOrder, &row.IsActive, &row.IsDefault, &row.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func clearOtherDefaults(ctx context.Context, tx *sql.Tx, keepID int64, actorID int64) error {
	_, err := tx.ExecContext(ctx, `
UPDATE website_language SET is_default = FALSE, updated_at = NOW(), updated_by = $2
WHERE deleted_at IS NULL AND id <> $1 AND is_default = TRUE`, keepID, nullInt64(actorID))
	return err
}

func nullInt64(id int64) sql.NullInt64 {
	if id == 0 {
		return sql.NullInt64{}
	}
	return sql.NullInt64{Int64: id, Valid: true}
}

func isUniqueViolation(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "unique") || strings.Contains(msg, "duplicate")
}
