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

type LangRow struct {
	ID                      int64
	Name                    string
	SortOrder               int
	IsActive                bool
	UpdatedAt               time.Time
	Names                   map[string]string
	IsSale                  bool
	IsPurchase              bool
	IsDefault               bool
	IsClaim                 bool
	IsReturn                bool
	SystemFileID            *int64
	MemberSettingRelationID *int64
	PrefixType              string
	Code                    string
}

type LangListFilter struct {
	Page, Limit    int
	Locale, Search string
	IsActive       *bool
	Sort, Order    string
	IsSale         *bool
	IsPurchase     *bool
	PrefixType     string
}

type LangCreateInput struct {
	IsActive                bool
	Names                   map[string]string
	ActorID                 int64
	IsSale                  bool
	IsPurchase              bool
	IsDefault               bool
	IsClaim                 bool
	IsReturn                bool
	SystemFileID            *int64
	MemberSettingRelationID *int64
	PrefixType              string
	Code                    string
}

type LangPatch struct {
	IsActive                *bool
	Names                   map[string]string
	ActorID                 int64
	IsSale                  *bool
	IsPurchase              *bool
	IsDefault               *bool
	IsClaim                 *bool
	IsReturn                *bool
	SystemFileIDSet         bool
	SystemFileID            *int64
	MemberSettingRelationID *int64
	Code                    *string
}

type LangRepository struct {
	db *sql.DB
}

func NewLangRepository(db *sql.DB) *LangRepository {
	return &LangRepository{db: db}
}

func (r *LangRepository) List(ctx context.Context, k LangKind, f LangListFilter) ([]LangRow, int, error) {
	spec := langSpecFor(k)
	locale := f.Locale
	if locale == "" {
		locale = "th"
	}
	w, args := langListWhere(k, f, locale)
	n := len(args) + 1

	var total int
	countQ := fmt.Sprintf(`SELECT COUNT(*) FROM %s t LEFT JOIN %s l ON l.%s = t.id AND l.locale = $1 WHERE %s`,
		spec.table, spec.langTable, spec.langFK, w)
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
	orderBy := langOrderBy(f.Sort, f.Order)

	extraCols := langListExtraSelect(k)
	q := fmt.Sprintf(`SELECT t.id, COALESCE(l.name, ''), t.sort_order, t.is_active, t.updated_at%s
FROM %s t LEFT JOIN %s l ON l.%s = t.id AND l.locale = $1
WHERE %s ORDER BY %s LIMIT $%d OFFSET $%d`,
		extraCols, spec.table, spec.langTable, spec.langFK, w, orderBy, n, n+1)
	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var out []LangRow
	for rows.Next() {
		row, err := scanLangListRow(rows, k)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, row)
	}
	return out, total, rows.Err()
}

func (r *LangRepository) Get(ctx context.Context, k LangKind, id int64, locale string) (*LangRow, error) {
	spec := langSpecFor(k)
	if locale == "" {
		locale = "th"
	}
	extraCols := langListExtraSelect(k)
	q := fmt.Sprintf(`SELECT t.id, COALESCE(l.name, ''), t.sort_order, t.is_active, t.updated_at%s
FROM %s t LEFT JOIN %s l ON l.%s = t.id AND l.locale = $2
WHERE t.id = $1 AND t.deleted_at IS NULL`, extraCols, spec.table, spec.langTable, spec.langFK)
	row, err := scanLangListRowSingle(r.db.QueryRowContext(ctx, q, id, locale), k)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	names, err := r.loadNames(ctx, spec, id)
	if err != nil {
		return nil, err
	}
	row.Names = names
	return &row, nil
}

func (r *LangRepository) Create(ctx context.Context, k LangKind, in LangCreateInput) (int64, error) {
	if err := validateNames(in.Names); err != nil {
		return 0, err
	}
	if err := langValidateCreate(k, in); err != nil {
		return 0, err
	}
	if k == LangPrefix {
		taken, err := r.prefixCodeTaken(ctx, in.Code, 0)
		if err != nil {
			return 0, err
		}
		if taken {
			return 0, ErrConflict
		}
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	spec := langSpecFor(k)
	var maxSort int
	maxQ := fmt.Sprintf("SELECT COALESCE(MAX(sort_order), 0) FROM %s WHERE deleted_at IS NULL", spec.table)
	if k == LangPrefix {
		if err := tx.QueryRowContext(ctx, maxQ+" AND type = $1::setting_prefix_type", in.PrefixType).Scan(&maxSort); err != nil {
			return 0, err
		}
	} else if err := tx.QueryRowContext(ctx, maxQ).Scan(&maxSort); err != nil {
		return 0, err
	}

	id, err := langInsert(ctx, tx, k, maxSort+10, in)
	if err != nil {
		return 0, err
	}
	if err := upsertLangNames(ctx, tx, spec, id, in.Names); err != nil {
		return 0, err
	}
	return id, tx.Commit()
}

func (r *LangRepository) Update(ctx context.Context, k LangKind, id int64, p LangPatch) error {
	spec := langSpecFor(k)
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
	if p.Code != nil && k == LangPrefix {
		taken, err := r.prefixCodeTaken(ctx, *p.Code, id)
		if err != nil {
			return err
		}
		if taken {
			return ErrConflict
		}
	}
	if err := langValidatePatch(k, p); err != nil {
		return err
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if err := langUpdateBase(ctx, tx, k, id, p); err != nil {
		return err
	}
	if p.Names != nil {
		if err := upsertLangNames(ctx, tx, spec, id, p.Names); err != nil {
			return err
		}
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	return nil
}

func (r *LangRepository) SoftDelete(ctx context.Context, k LangKind, id int64, actorID int64) error {
	spec := langSpecFor(k)
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

func (r *LangRepository) Reorder(ctx context.Context, k LangKind, dragID, targetID int64, prefixType string, actorID int64) error {
	spec := langSpecFor(k)
	nodes, err := r.loadReorderNodes(ctx, k, prefixType)
	if err != nil {
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
	for id, so := range orderByID {
		if _, err := tx.ExecContext(ctx, fmt.Sprintf(`
UPDATE %s SET sort_order = $2, updated_at = NOW(), updated_by = $3 WHERE id = $1 AND deleted_at IS NULL`, spec.table),
			id, so, nullActor(actorID)); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (r *LangRepository) loadReorderNodes(ctx context.Context, k LangKind, prefixType string) ([]tree.Node, error) {
	spec := langSpecFor(k)
	q := fmt.Sprintf("SELECT id, sort_order FROM %s WHERE deleted_at IS NULL", spec.table)
	var args []any
	if k == LangPrefix {
		if prefixType != "person" && prefixType != "company" {
			return nil, ErrInvalidReorder
		}
		q += " AND type = $1::setting_prefix_type"
		args = append(args, prefixType)
	}
	q += " ORDER BY sort_order ASC, id ASC"
	rows, err := r.db.QueryContext(ctx, q, args...)
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

func (r *LangRepository) loadNames(ctx context.Context, spec langSpec, id int64) (map[string]string, error) {
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

func (r *LangRepository) prefixCodeTaken(ctx context.Context, code string, excludeID int64) (bool, error) {
	var exists bool
	err := r.db.QueryRowContext(ctx, `
SELECT EXISTS(SELECT 1 FROM setting_prefix WHERE code = $1 AND deleted_at IS NULL AND id <> $2)`,
		strings.TrimSpace(code), excludeID).Scan(&exists)
	return exists, err
}

func upsertLangNames(ctx context.Context, tx *sql.Tx, spec langSpec, id int64, names map[string]string) error {
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
