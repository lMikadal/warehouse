package system

import (
	"context"
	"database/sql"
	"sort"
	"strings"
)

type MenuRepository struct {
	db *sql.DB
}

func NewMenuRepository(db *sql.DB) *MenuRepository {
	return &MenuRepository{db: db}
}

type MenuListFilter struct {
	Page   int
	Limit  int
	Locale string
	Search string
}

func (r *MenuRepository) List(ctx context.Context, f MenuListFilter) ([]MenuRow, int64, error) {
	locale := f.Locale
	if locale == "" {
		locale = "th"
	}

	countQuery := `SELECT COUNT(*) FROM system_menu m WHERE m.deleted_at IS NULL`
	var total int64
	if err := r.db.QueryRowContext(ctx, countQuery).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := `
SELECT
  m.id, m.icon, m.module, m.path, m.parent_id, m.tree_path::text, m.sort_order,
  m.is_active, m.is_superadmin_only, m.is_dialog,
  m.created_at, m.updated_at, m.deleted_at, m.created_by, m.updated_by,
  COALESCE(l.name, '') AS name
FROM system_menu m
LEFT JOIN system_menu_language l ON l.system_menu_id = m.id AND l.locale = $1
WHERE m.deleted_at IS NULL
ORDER BY m.parent_id NULLS FIRST, m.sort_order ASC, m.id ASC`

	rows, err := r.db.QueryContext(ctx, query, locale)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var all []MenuRow
	for rows.Next() {
		var row MenuRow
		if err := rows.Scan(
			&row.ID, &row.Icon, &row.Module, &row.Path, &row.ParentID, &row.TreePath, &row.SortOrder,
			&row.IsActive, &row.IsSuperadminOnly, &row.IsDialog,
			&row.CreatedAt, &row.UpdatedAt, &row.DeletedAt, &row.CreatedBy, &row.UpdatedBy,
			&row.Name,
		); err != nil {
			return nil, 0, err
		}
		all = append(all, row)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	sorted := sortMenuTree(all)
	if f.Search != "" {
		sorted = filterMenuSearch(sorted, f.Search)
		total = int64(len(sorted))
	}

	start := (f.Page - 1) * f.Limit
	if start > len(sorted) {
		return []MenuRow{}, total, nil
	}
	end := start + f.Limit
	if end > len(sorted) {
		end = len(sorted)
	}
	page := sorted[start:end]
	return page, total, nil
}

func filterMenuSearch(rows []MenuRow, q string) []MenuRow {
	q = strings.ToLower(q)
	out := make([]MenuRow, 0, len(rows))
	for _, row := range rows {
		if strings.Contains(strings.ToLower(row.Name), q) || strings.Contains(strings.ToLower(row.Module), q) {
			out = append(out, row)
		}
	}
	return out
}

func sortMenuTree(rows []MenuRow) []MenuRow {
	byParent := map[int64][]MenuRow{}
	var roots []MenuRow
	for _, row := range rows {
		if row.ParentID == nil {
			roots = append(roots, row)
			continue
		}
		pid := *row.ParentID
		byParent[pid] = append(byParent[pid], row)
	}
	var out []MenuRow
	siblingLess := func(a, b MenuRow) bool {
		if a.SortOrder != b.SortOrder {
			return a.SortOrder < b.SortOrder
		}
		return a.ID < b.ID
	}
	sort.Slice(roots, func(i, j int) bool { return siblingLess(roots[i], roots[j]) })

	var walk func(MenuRow)
	walk = func(n MenuRow) {
		out = append(out, n)
		kids := byParent[n.ID]
		sort.Slice(kids, func(i, j int) bool { return siblingLess(kids[i], kids[j]) })
		for _, c := range kids {
			walk(c)
		}
	}
	for _, r := range roots {
		walk(r)
	}
	return out
}
