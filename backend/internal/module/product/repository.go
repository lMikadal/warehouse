package product

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
	Type      string
	TypeCar   *string
	ParentID  *int64
	TreePath  string
	SortOrder int
	IsActive  bool
	IsStopped bool
	Name      string
	UpdatedAt time.Time
	Names     map[string]string
	BrandIDs  []int64
}

type ListFilter struct {
	AttrType       string
	Page, Limit    int
	Locale, Search string
	IsActive       *bool
}

type CreateInput struct {
	AttrType  string
	TypeCar   *string
	ParentID  *int64
	IsActive  bool
	Names     map[string]string
	BrandIDs  []int64
	ActorID   int64
}

type Patch struct {
	IsActive *bool
	Names    map[string]string
	ParentID optionalInt64
	TypeCar  *string
	BrandIDs []int64
	SetBrand bool
	ActorID  int64
}

type optionalInt64 struct {
	Set   bool
	Value *int64
}

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func nullActor(id int64) sql.NullInt64 {
	if id <= 0 {
		return sql.NullInt64{}
	}
	return sql.NullInt64{Int64: id, Valid: true}
}

func validateNames(names map[string]string) error {
	if strings.TrimSpace(names["th"]) == "" || strings.TrimSpace(names["en"]) == "" {
		return ErrValidation
	}
	return nil
}

func (r *Repository) List(ctx context.Context, f ListFilter) ([]Row, int, error) {
	locale := f.Locale
	if locale == "" {
		locale = "th"
	}
	all, err := r.loadByType(ctx, f.AttrType, f.Search, f.IsActive, locale)
	if err != nil {
		return nil, 0, err
	}
	ordered := flattenTreeOrder(all)
	total := len(ordered)
	limit := f.Limit
	if limit <= 0 {
		limit = 10
	}
	page := f.Page
	if page <= 0 {
		page = 1
	}
	start := (page - 1) * limit
	if start >= total {
		return []Row{}, total, nil
	}
	end := start + limit
	if end > total {
		end = total
	}
	return ordered[start:end], total, nil
}

func flattenTreeOrder(rows []Row) []Row {
	if len(rows) == 0 {
		return rows
	}
	byParent := map[string][]Row{}
	for _, row := range rows {
		key := "null"
		if row.ParentID != nil {
			key = fmt.Sprintf("%d", *row.ParentID)
		}
		byParent[key] = append(byParent[key], row)
	}
	for k := range byParent {
		s := byParent[k]
		for i := 0; i < len(s); i++ {
			for j := i + 1; j < len(s); j++ {
				if s[j].SortOrder < s[i].SortOrder || (s[j].SortOrder == s[i].SortOrder && s[j].ID < s[i].ID) {
					s[i], s[j] = s[j], s[i]
				}
			}
		}
		byParent[k] = s
	}
	var out []Row
	var walk func(parentID *int64)
	walk = func(parentID *int64) {
		key := "null"
		if parentID != nil {
			key = fmt.Sprintf("%d", *parentID)
		}
		for _, row := range byParent[key] {
			out = append(out, row)
			id := row.ID
			walk(&id)
		}
	}
	walk(nil)
	return out
}

func (r *Repository) loadByType(ctx context.Context, attrType, search string, isActive *bool, locale string) ([]Row, error) {
	args := []any{attrType, locale}
	clauses := []string{"t.deleted_at IS NULL", "t.type = $1"}
	n := 3
	if isActive != nil {
		clauses = append(clauses, fmt.Sprintf("t.is_active = $%d", n))
		args = append(args, *isActive)
		n++
	}
	if search != "" {
		clauses = append(clauses, fmt.Sprintf(`(
			EXISTS (SELECT 1 FROM product_attribute_language lx
				WHERE lx.product_attribute_id = t.id AND lx.name ILIKE $%d)
			OR CAST(t.id AS TEXT) = $%d)`, n, n))
		args = append(args, "%"+search+"%")
		n++
	}
	where := strings.Join(clauses, " AND ")
	q := fmt.Sprintf(`SELECT t.id, t.type, t.type_car::text, t.parent_id, t.tree_path::text, t.sort_order,
t.is_active, t.is_stopped, t.updated_at, COALESCE(l.name, '')
FROM product_attribute t
LEFT JOIN product_attribute_language l ON l.product_attribute_id = t.id AND l.locale = $2
WHERE %s`, where)

	rows, err := r.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Row
	for rows.Next() {
		var row Row
		var typeCar sql.NullString
		var parent sql.NullInt64
		if err := rows.Scan(&row.ID, &row.Type, &typeCar, &parent, &row.TreePath, &row.SortOrder,
			&row.IsActive, &row.IsStopped, &row.UpdatedAt, &row.Name); err != nil {
			return nil, err
		}
		if typeCar.Valid {
			s := typeCar.String
			row.TypeCar = &s
		}
		if parent.Valid {
			row.ParentID = &parent.Int64
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

func (r *Repository) Get(ctx context.Context, id int64, attrType, locale string) (*Row, error) {
	if locale == "" {
		locale = "th"
	}
	q := `SELECT t.id, t.type, t.type_car::text, t.parent_id, t.tree_path::text, t.sort_order,
t.is_active, t.is_stopped, t.updated_at, COALESCE(l.name, '')
FROM product_attribute t
LEFT JOIN product_attribute_language l ON l.product_attribute_id = t.id AND l.locale = $2
WHERE t.id = $1 AND t.deleted_at IS NULL AND t.type = $3`
	var row Row
	var typeCar sql.NullString
	var parent sql.NullInt64
	err := r.db.QueryRowContext(ctx, q, id, locale, attrType).Scan(
		&row.ID, &row.Type, &typeCar, &parent, &row.TreePath, &row.SortOrder,
		&row.IsActive, &row.IsStopped, &row.UpdatedAt, &row.Name,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	if typeCar.Valid {
		s := typeCar.String
		row.TypeCar = &s
	}
	if parent.Valid {
		row.ParentID = &parent.Int64
	}
	names, err := r.loadNames(ctx, id)
	if err != nil {
		return nil, err
	}
	row.Names = names
	if attrType == "category" {
		row.BrandIDs, err = r.loadBrandIDs(ctx, id)
		if err != nil {
			return nil, err
		}
	}
	return &row, nil
}

func (r *Repository) loadNames(ctx context.Context, id int64) (map[string]string, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT locale, name FROM product_attribute_language WHERE product_attribute_id = $1`, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	names := map[string]string{}
	for rows.Next() {
		var loc, name string
		if err := rows.Scan(&loc, &name); err != nil {
			return nil, err
		}
		names[loc] = name
	}
	return names, rows.Err()
}

func (r *Repository) loadBrandIDs(ctx context.Context, categoryID int64) ([]int64, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT product_attribute_id FROM product_attribute_relation WHERE related_id = $1 ORDER BY product_attribute_id`, categoryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

func (r *Repository) Create(ctx context.Context, in CreateInput) (int64, error) {
	if err := validateNames(in.Names); err != nil {
		return 0, err
	}
	all, err := r.loadByType(ctx, in.AttrType, "", nil, "th")
	if err != nil {
		return 0, err
	}
	switch in.AttrType {
	case "brand":
		in.ParentID = nil
		in.TypeCar = nil
	case "category":
		if err := validateCategoryParent(all, 0, in.ParentID); err != nil {
			return 0, err
		}
		in.TypeCar = nil
	case "car":
		if in.TypeCar == nil {
			return 0, ErrValidation
		}
		if err := validateCarParent(all, *in.TypeCar, in.ParentID); err != nil {
			return 0, err
		}
	default:
		return 0, ErrValidation
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	sortOrder := maxSortUnderParent(all, in.ParentID, 0) + 100
	var id int64
	act := nullActor(in.ActorID)
	err = tx.QueryRowContext(ctx, `
INSERT INTO product_attribute (type, type_car, parent_id, tree_path, sort_order, is_active, is_stopped, created_by, updated_by)
VALUES ($1, $2, $3, 'n0'::ltree, $4, $5, FALSE, $6, $6) RETURNING id`,
		in.AttrType, in.TypeCar, in.ParentID, sortOrder, in.IsActive, act).Scan(&id)
	if err != nil {
		return 0, err
	}
	path, err := r.buildTreePath(ctx, tx, id, in.ParentID, in.AttrType)
	if err != nil {
		return 0, err
	}
	if _, err := tx.ExecContext(ctx, `UPDATE product_attribute SET tree_path = $1::ltree WHERE id = $2`, path, id); err != nil {
		return 0, err
	}
	if err := upsertNames(ctx, tx, id, in.Names); err != nil {
		return 0, err
	}
	if in.AttrType == "category" {
		if err := syncBrandRelations(ctx, tx, id, in.BrandIDs); err != nil {
			return 0, err
		}
	}
	return id, tx.Commit()
}

func maxSortUnderParent(rows []Row, parentID *int64, excludeID int64) int {
	return tree.MaxSortUnderParent(rowsToNodes(rows), parentID, excludeID)
}

func (r *Repository) buildTreePath(ctx context.Context, tx *sql.Tx, id int64, parentID *int64, attrType string) (string, error) {
	all, err := r.loadByTypeTx(ctx, tx, attrType)
	if err != nil {
		return "", err
	}
	// include new row placeholder
	found := false
	for _, row := range all {
		if row.ID == id {
			found = true
			break
		}
	}
	if !found {
		all = append(all, Row{ID: id, ParentID: parentID})
	} else {
		for i := range all {
			if all[i].ID == id {
				all[i].ParentID = parentID
			}
		}
	}
	nodes, err := tree.RecomputePaths(rowsToNodes(all))
	if err != nil {
		return "", err
	}
	n := tree.Find(nodes, id)
	if n == nil {
		return "", ErrValidation
	}
	return n.TreePath, nil
}

func (r *Repository) loadByTypeTx(ctx context.Context, tx *sql.Tx, attrType string) ([]Row, error) {
	q := `SELECT id, type, type_car::text, parent_id, tree_path::text, sort_order, is_active, is_stopped, updated_at
FROM product_attribute WHERE deleted_at IS NULL AND type = $1`
	rows, err := tx.QueryContext(ctx, q, attrType)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Row
	for rows.Next() {
		var row Row
		var typeCar sql.NullString
		var parent sql.NullInt64
		if err := rows.Scan(&row.ID, &row.Type, &typeCar, &parent, &row.TreePath, &row.SortOrder,
			&row.IsActive, &row.IsStopped, &row.UpdatedAt); err != nil {
			return nil, err
		}
		if typeCar.Valid {
			s := typeCar.String
			row.TypeCar = &s
		}
		if parent.Valid {
			row.ParentID = &parent.Int64
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

func upsertNames(ctx context.Context, tx *sql.Tx, id int64, names map[string]string) error {
	for _, loc := range []string{"th", "en"} {
		name := strings.TrimSpace(names[loc])
		if name == "" {
			continue
		}
		_, err := tx.ExecContext(ctx, `
INSERT INTO product_attribute_language (product_attribute_id, locale, name)
VALUES ($1, $2, $3)
ON CONFLICT (product_attribute_id, locale) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()`, id, loc, name)
		if err != nil {
			return err
		}
	}
	return nil
}

func syncBrandRelations(ctx context.Context, tx *sql.Tx, categoryID int64, brandIDs []int64) error {
	if _, err := tx.ExecContext(ctx, `DELETE FROM product_attribute_relation WHERE related_id = $1`, categoryID); err != nil {
		return err
	}
	for _, bid := range brandIDs {
		if bid <= 0 {
			continue
		}
		var ok bool
		if err := tx.QueryRowContext(ctx,
			`SELECT EXISTS(SELECT 1 FROM product_attribute WHERE id = $1 AND type = 'brand' AND deleted_at IS NULL)`, bid).Scan(&ok); err != nil {
			return err
		}
		if !ok {
			return ErrValidation
		}
		if _, err := tx.ExecContext(ctx,
			`INSERT INTO product_attribute_relation (product_attribute_id, related_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, bid, categoryID); err != nil {
			return err
		}
	}
	return nil
}

func (r *Repository) Update(ctx context.Context, id int64, attrType string, p Patch) error {
	cur, err := r.Get(ctx, id, attrType, "th")
	if err != nil {
		return err
	}
	if cur == nil {
		return ErrNotFound
	}
	if p.Names != nil {
		if err := validateNames(p.Names); err != nil {
			return ErrValidation
		}
	}
	all, err := r.loadByType(ctx, attrType, "", nil, "th")
	if err != nil {
		return err
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	act := nullActor(p.ActorID)

	newParent := cur.ParentID
	if p.ParentID.Set {
		newParent = p.ParentID.Value
	}
	newTypeCar := cur.TypeCar
	if p.TypeCar != nil {
		newTypeCar = p.TypeCar
	}

	switch attrType {
	case "brand":
		newParent = nil
	case "category":
		if p.ParentID.Set {
			if err := validateCategoryParent(all, id, newParent); err != nil {
				return err
			}
		}
	case "car":
		if p.TypeCar != nil || p.ParentID.Set {
			tc := ""
			if newTypeCar != nil {
				tc = *newTypeCar
			}
			if err := validateCarParent(all, tc, newParent); err != nil {
				return err
			}
		}
	}

	if p.IsActive != nil {
		if _, err := tx.ExecContext(ctx, `
UPDATE product_attribute SET is_active = $2, updated_at = NOW(), updated_by = $3
WHERE id = $1 AND deleted_at IS NULL`, id, *p.IsActive, act); err != nil {
			return err
		}
	}

	needsTree := p.ParentID.Set || (attrType == "car" && (p.TypeCar != nil || p.ParentID.Set))
	if needsTree || p.TypeCar != nil {
		if _, err := tx.ExecContext(ctx, `
UPDATE product_attribute SET parent_id = $2, type_car = $3, updated_at = NOW(), updated_by = $4
WHERE id = $1 AND deleted_at IS NULL`, id, newParent, newTypeCar, act); err != nil {
			return err
		}
		all2, err := r.loadByTypeTx(ctx, tx, attrType)
		if err != nil {
			return err
		}
		nodes, err := tree.RecomputePaths(rowsToNodes(all2))
		if err != nil {
			return err
		}
		for _, n := range nodes {
			if _, err := tx.ExecContext(ctx, `UPDATE product_attribute SET tree_path = $2::ltree, sort_order = $3, parent_id = $4 WHERE id = $1`,
				n.ID, n.TreePath, n.SortOrder, n.ParentID); err != nil {
				return err
			}
		}
	} else if p.IsActive != nil {
		// already updated
	} else {
		if _, err := tx.ExecContext(ctx, `UPDATE product_attribute SET updated_at = NOW(), updated_by = $2 WHERE id = $1`, id, act); err != nil {
			return err
		}
	}

	if p.Names != nil {
		if err := upsertNames(ctx, tx, id, p.Names); err != nil {
			return err
		}
	}
	if attrType == "category" && p.SetBrand {
		if err := syncBrandRelations(ctx, tx, id, p.BrandIDs); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (r *Repository) SoftDelete(ctx context.Context, id int64, attrType string, actorID int64) error {
	cur, err := r.Get(ctx, id, attrType, "th")
	if err != nil || cur == nil {
		if cur == nil {
			return ErrNotFound
		}
		return err
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	act := nullActor(actorID)
	if _, err := tx.ExecContext(ctx, `
UPDATE product_attribute SET deleted_at = NOW(), updated_at = NOW(), updated_by = $2
WHERE id = $1 AND deleted_at IS NULL`, id, act); err != nil {
		return err
	}
	if attrType == "category" || attrType == "brand" {
		if _, err := tx.ExecContext(ctx, `
DELETE FROM product_attribute_relation
WHERE related_id = $1 OR product_attribute_id = $1`, id); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (r *Repository) Reorder(ctx context.Context, attrType string, dragID, targetID int64, actorID int64) error {
	all, err := r.loadByType(ctx, attrType, "", nil, "th")
	if err != nil {
		return err
	}
	drag := findRow(all, dragID)
	target := findRow(all, targetID)
	if drag == nil || target == nil {
		return ErrInvalidReorder
	}
	if !tree.SameParent(drag.ParentID, target.ParentID) {
		return ErrInvalidReorder
	}
	if attrType == "car" {
		if drag.TypeCar == nil || target.TypeCar == nil || *drag.TypeCar != *target.TypeCar {
			return ErrDragSiblingOnly
		}
	}
	nodes := rowsToNodes(all)
	sibs := siblingSlice(all, drag.ParentID)
	next, err := tree.ReorderSiblings(nodes, dragID, targetID)
	if err != nil {
		return ErrInvalidReorder
	}
	orderByID := map[int64]int{}
	for _, n := range next {
		orderByID[n.ID] = n.SortOrder
	}
	_ = sibs
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	act := nullActor(actorID)
	for id, so := range orderByID {
		if _, err := tx.ExecContext(ctx, `
UPDATE product_attribute SET sort_order = $2, updated_at = NOW(), updated_by = $3
WHERE id = $1 AND deleted_at IS NULL`, id, so, act); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func siblingSlice(rows []Row, parentID *int64) []Row {
	var out []Row
	for _, r := range rows {
		if tree.SameParent(r.ParentID, parentID) {
			out = append(out, r)
		}
	}
	return out
}

func (r *Repository) Move(ctx context.Context, attrType string, dragID, targetID int64, zone string, actorID int64) error {
	if attrType != "category" && attrType != "car" {
		return ErrValidation
	}
	all, err := r.loadByType(ctx, attrType, "", nil, "th")
	if err != nil {
		return err
	}
	drag := findRow(all, dragID)
	if drag == nil || findRow(all, targetID) == nil {
		return ErrValidation
	}
	next, err := tree.ApplyDrop(rowsToNodes(all), dragID, targetID, zone)
	if err != nil {
		return ErrValidation
	}
	updated := tree.Find(next, dragID)
	if updated == nil {
		return ErrValidation
	}
	if attrType == "category" {
		if err := validateCategoryParent(all, dragID, updated.ParentID); err != nil {
			return err
		}
	} else {
		typeCar := ""
		if drag.TypeCar != nil {
			typeCar = *drag.TypeCar
		}
		if err := validateCarParent(all, typeCar, updated.ParentID); err != nil {
			return err
		}
	}
	merged := mergeNodesIntoRows(all, next)
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	act := nullActor(actorID)
	for _, row := range merged {
		if _, err := tx.ExecContext(ctx, `
UPDATE product_attribute SET parent_id = $2, sort_order = $3, tree_path = $4::ltree, updated_at = NOW(), updated_by = $5
WHERE id = $1`, row.ID, row.ParentID, row.SortOrder, row.TreePath, act); err != nil {
			return err
		}
	}
	// Recompute paths for entire type after move (descendants)
	all2, err := r.loadByTypeTx(ctx, tx, attrType)
	if err != nil {
		return err
	}
	nodes, err := tree.RecomputePaths(rowsToNodes(all2))
	if err != nil {
		return err
	}
	for _, n := range nodes {
		if _, err := tx.ExecContext(ctx, `UPDATE product_attribute SET tree_path = $2::ltree, parent_id = $3, sort_order = $4 WHERE id = $1`,
			n.ID, n.TreePath, n.ParentID, n.SortOrder); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// ponytail: List loads all rows of a type into memory for tree flatten — upgrade with SQL recursive CTE if counts exceed ~1000.
