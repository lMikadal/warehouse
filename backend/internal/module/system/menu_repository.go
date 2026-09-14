package system

import (
	"context"
	"database/sql"
	"fmt"
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
	Page     int
	Limit    int
	Locale   string
	Search   string
	IsActive *bool
}

func (r *MenuRepository) List(ctx context.Context, f MenuListFilter) ([]MenuRow, int64, error) {
	all, err := r.loadAll(ctx)
	if err != nil {
		return nil, 0, err
	}
	sorted := sortMenuTree(all)
	if f.IsActive != nil {
		sorted = filterMenuActive(sorted, *f.IsActive)
	}
	if f.Search != "" {
		sorted = filterMenuSearch(sorted, f.Search)
	}
	total := int64(len(sorted))
	start := (f.Page - 1) * f.Limit
	if start > len(sorted) {
		return []MenuRow{}, total, nil
	}
	end := start + f.Limit
	if end > len(sorted) {
		end = len(sorted)
	}
	return sorted[start:end], total, nil
}

func (r *MenuRepository) loadAll(ctx context.Context) ([]MenuRow, error) {
	query := `
SELECT
  m.id, m.icon, m.module, m.path, m.parent_id, m.tree_path::text, m.sort_order,
  m.is_active, m.is_superadmin_only, m.is_dialog,
  m.created_at, m.updated_at, m.deleted_at, m.created_by, m.updated_by
FROM system_menu m
WHERE m.deleted_at IS NULL
ORDER BY m.id`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var all []MenuRow
	for rows.Next() {
		var row MenuRow
		if err := rows.Scan(
			&row.ID, &row.Icon, &row.Module, &row.Path, &row.ParentID, &row.TreePath, &row.SortOrder,
			&row.IsActive, &row.IsSuperadminOnly, &row.IsDialog,
			&row.CreatedAt, &row.UpdatedAt, &row.DeletedAt, &row.CreatedBy, &row.UpdatedBy,
		); err != nil {
			return nil, err
		}
		all = append(all, row)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if err := r.attachNames(ctx, all); err != nil {
		return nil, err
	}
	return all, nil
}

func (r *MenuRepository) attachNames(ctx context.Context, menus []MenuRow) error {
	if len(menus) == 0 {
		return nil
	}
	idIndex := make(map[int64]int, len(menus))
	for i, m := range menus {
		idIndex[m.ID] = i
	}
	langRows, err := r.db.QueryContext(ctx, `
SELECT system_menu_id, locale, name FROM system_menu_language`)
	if err != nil {
		return err
	}
	defer langRows.Close()
	for langRows.Next() {
		var menuID int64
		var locale, name string
		if err := langRows.Scan(&menuID, &locale, &name); err != nil {
			return err
		}
		if i, ok := idIndex[menuID]; ok {
			if menus[i].Names == nil {
				menus[i].Names = map[string]string{}
			}
			menus[i].Names[locale] = name
		}
	}
	return langRows.Err()
}

func filterMenuActive(rows []MenuRow, active bool) []MenuRow {
	out := make([]MenuRow, 0, len(rows))
	for _, row := range rows {
		if row.IsActive == active {
			out = append(out, row)
		}
	}
	return out
}

func filterMenuSearch(rows []MenuRow, q string) []MenuRow {
	q = strings.ToLower(q)
	out := make([]MenuRow, 0, len(rows))
	for _, row := range rows {
		if strings.Contains(strings.ToLower(rowName(row, "th")), q) ||
			strings.Contains(strings.ToLower(rowName(row, "en")), q) ||
			strings.Contains(strings.ToLower(row.Module), q) ||
			strings.Contains(strings.ToLower(ptrStr(row.Path)), q) {
			out = append(out, row)
		}
	}
	return out
}

func rowName(row MenuRow, locale string) string {
	if row.Names != nil && row.Names[locale] != "" {
		return row.Names[locale]
	}
	return row.Name
}

func ptrStr(p *string) string {
	if p == nil {
		return ""
	}
	return *p
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

type MenuCreateInput struct {
	ParentID  *int64
	Module    string
	Path      *string
	IsActive  bool
	Names     map[string]string
	ActorID   int64
}

func (r *MenuRepository) Create(ctx context.Context, in MenuCreateInput) (MenuRow, error) {
	all, err := r.loadAll(ctx)
	if err != nil {
		return MenuRow{}, err
	}
	if in.ParentID != nil {
		if findMenuRow(all, *in.ParentID) == nil {
			return MenuRow{}, fmt.Errorf("invalid parent")
		}
	}
	sortOrder := maxSortUnderParent(all, in.ParentID, 0) + 100
	var id int64
	err = r.db.QueryRowContext(ctx, `
INSERT INTO system_menu (icon, module, path, parent_id, tree_path, sort_order, is_active, created_by, updated_by)
VALUES (NULL, $1, $2, $3, 'n0', $4, $5, $6, $6)
RETURNING id`, in.Module, in.Path, in.ParentID, sortOrder, in.IsActive, nullInt64(in.ActorID)).Scan(&id)
	if err != nil {
		return MenuRow{}, err
	}
	if err := r.rebuildAllTreePaths(ctx); err != nil {
		return MenuRow{}, err
	}
	if err := r.upsertNames(ctx, id, in.Names); err != nil {
		return MenuRow{}, err
	}
	return r.GetByID(ctx, id)
}

func (r *MenuRepository) rebuildAllTreePaths(ctx context.Context) error {
	all, err := r.loadAll(ctx)
	if err != nil {
		return err
	}
	rebuilt, err := recomputeAllTreePaths(all)
	if err != nil {
		return err
	}
	for _, row := range rebuilt {
		_, err = r.db.ExecContext(ctx, `UPDATE system_menu SET tree_path = $1::ltree WHERE id = $2`, row.TreePath, row.ID)
		if err != nil {
			return err
		}
	}
	return nil
}

type MenuUpdateInput struct {
	Names    map[string]string
	IsActive *bool
	ParentID *int64
	ActorID  int64
}

func (r *MenuRepository) Update(ctx context.Context, id int64, in MenuUpdateInput) (MenuRow, error) {
	all, err := r.loadAll(ctx)
	if err != nil {
		return MenuRow{}, err
	}
	prev := findMenuRow(all, id)
	if prev == nil {
		return MenuRow{}, sql.ErrNoRows
	}
	if in.ParentID != nil && isInvalidMenuParent(all, id, in.ParentID) {
		return MenuRow{}, fmt.Errorf("invalid parent")
	}
	parentID := prev.ParentID
	if in.ParentID != nil {
		parentID = in.ParentID
	}
	sortOrder := prev.SortOrder
	if in.ParentID != nil && !sameParent(prev.ParentID, in.ParentID) {
		sortOrder = maxSortUnderParent(all, parentID, id) + 100
	}
	isActive := prev.IsActive
	if in.IsActive != nil {
		isActive = *in.IsActive
	}
	_, err = r.db.ExecContext(ctx, `
UPDATE system_menu
SET parent_id = $2, sort_order = $3, is_active = $4, updated_at = NOW(), updated_by = $5
WHERE id = $1 AND deleted_at IS NULL`,
		id, parentID, sortOrder, isActive, nullInt64(in.ActorID))
	if err != nil {
		return MenuRow{}, err
	}
	all, err = r.loadAll(ctx)
	if err != nil {
		return MenuRow{}, err
	}
	rebuilt, err := recomputeAllTreePaths(all)
	if err != nil {
		return MenuRow{}, err
	}
	for _, row := range rebuilt {
		_, err = r.db.ExecContext(ctx, `UPDATE system_menu SET tree_path = $1::ltree, sort_order = $2, parent_id = $3 WHERE id = $4`,
			row.TreePath, row.SortOrder, row.ParentID, row.ID)
		if err != nil {
			return MenuRow{}, err
		}
	}
	if in.Names != nil {
		if err := r.upsertNames(ctx, id, in.Names); err != nil {
			return MenuRow{}, err
		}
	}
	return r.GetByID(ctx, id)
}

func (r *MenuRepository) Move(ctx context.Context, dragID, targetID int64, zone string, actorID int64) error {
	all, err := r.loadAll(ctx)
	if err != nil {
		return err
	}
	next, err := applyTreeDrop(all, dragID, targetID, zone)
	if err != nil {
		return err
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	for _, row := range next {
		_, err = tx.ExecContext(ctx, `
UPDATE system_menu SET parent_id = $2, sort_order = $3, tree_path = $4::ltree, updated_at = NOW(), updated_by = $5
WHERE id = $1`, row.ID, row.ParentID, row.SortOrder, row.TreePath, nullInt64(actorID))
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (r *MenuRepository) SoftDeleteSubtree(ctx context.Context, rootID int64, actorID int64) error {
	all, err := r.loadAll(ctx)
	if err != nil {
		return err
	}
	ids := subtreeIDs(all, rootID)
	if len(ids) == 0 {
		return sql.ErrNoRows
	}
	for _, id := range ids {
		_, err = r.db.ExecContext(ctx, `
UPDATE system_menu SET deleted_at = NOW(), updated_at = NOW(), updated_by = $2 WHERE id = $1`, id, nullInt64(actorID))
		if err != nil {
			return err
		}
	}
	return nil
}

func (r *MenuRepository) GetByID(ctx context.Context, id int64) (MenuRow, error) {
	all, err := r.loadAll(ctx)
	if err != nil {
		return MenuRow{}, err
	}
	row := findMenuRow(all, id)
	if row == nil {
		return MenuRow{}, sql.ErrNoRows
	}
	return *row, nil
}

func (r *MenuRepository) upsertNames(ctx context.Context, menuID int64, names map[string]string) error {
	for locale, name := range names {
		if locale != "th" && locale != "en" {
			continue
		}
		_, err := r.db.ExecContext(ctx, `
INSERT INTO system_menu_language (system_menu_id, locale, name)
VALUES ($1, $2, $3)
ON CONFLICT (system_menu_id, locale) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()`,
			menuID, locale, name)
		if err != nil {
			return err
		}
	}
	return nil
}

func nullInt64(id int64) sql.NullInt64 {
	if id <= 0 {
		return sql.NullInt64{}
	}
	return sql.NullInt64{Int64: id, Valid: true}
}
