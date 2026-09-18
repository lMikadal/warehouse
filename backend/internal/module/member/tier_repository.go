package member

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/lMikadal/warehouse/backend/internal/tree"
)

type TierRow struct {
	ID            int64
	ParentID      *int64
	TreePath      string
	SortOrder     int
	SystemFileID  *int64
	IsDefault     bool
	IsActive      bool
	PurchaseStart float64
	PurchaseEnd   float64
	Discount      float64
	DiscountType  string
	ScopeType     string
	IsPromotion   bool
	Name          string
	UpdatedAt     time.Time
	Names         map[string]string
	AttributeIDs  []int64
}

type TierListFilter struct {
	Page, Limit    int
	Locale, Search string
	IsActive       *bool
}

type TierCreateInput struct {
	ParentID      *int64
	SystemFileID  *int64
	IsDefault     bool
	IsActive      bool
	PurchaseStart float64
	PurchaseEnd   float64
	Discount      float64
	DiscountType  string
	ScopeType     string
	IsPromotion   bool
	Names         map[string]string
	AttributeIDs  []int64
	ActorID       int64
}

type TierPatch struct {
	SystemFileID  optionalInt64
	IsDefault     *bool
	IsActive      *bool
	PurchaseStart *float64
	PurchaseEnd   *float64
	Discount      *float64
	DiscountType  *string
	ScopeType     *string
	IsPromotion   *bool
	Names         map[string]string
	AttributeIDs  []int64
	SetAttributes bool
	ActorID       int64
}

type TierRepository struct {
	db *sql.DB
}

func NewTierRepository(db *sql.DB) *TierRepository {
	return &TierRepository{db: db}
}

func (r *TierRepository) List(ctx context.Context, f TierListFilter) ([]TierRow, int, error) {
	locale := f.Locale
	if locale == "" {
		locale = "th"
	}
	all, err := r.loadAll(ctx, f.Search, f.IsActive, locale)
	if err != nil {
		return nil, 0, err
	}
	ordered := flattenTierOrder(all)
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
		return []TierRow{}, total, nil
	}
	end := start + limit
	if end > total {
		end = total
	}
	return ordered[start:end], total, nil
}

func flattenTierOrder(rows []TierRow) []TierRow {
	if len(rows) == 0 {
		return rows
	}
	byParent := map[string][]TierRow{}
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
	var out []TierRow
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

func (r *TierRepository) loadAll(ctx context.Context, search string, isActive *bool, locale string) ([]TierRow, error) {
	args := []any{locale}
	clauses := []string{"t.deleted_at IS NULL"}
	n := 2
	if isActive != nil {
		clauses = append(clauses, fmt.Sprintf("t.is_active = $%d", n))
		args = append(args, *isActive)
		n++
	}
	if search != "" {
		clauses = append(clauses, fmt.Sprintf(`EXISTS (SELECT 1 FROM member_tier_language lx WHERE lx.member_tier_id = t.id AND lx.name ILIKE $%d)`, n))
		args = append(args, "%"+search+"%")
		n++
	}
	q := fmt.Sprintf(`
SELECT t.id, t.parent_id, t.tree_path::text, t.sort_order, t.system_file_id, t.is_default, t.is_active,
       t.purchase_start, t.purchase_end, t.discount, t.discount_type::text, t.type::text, t.is_promotion,
       COALESCE(l.name, ''), t.updated_at
FROM member_tier t
LEFT JOIN member_tier_language l ON l.member_tier_id = t.id AND l.locale = $1
WHERE %s ORDER BY t.id`, strings.Join(clauses, " AND "))
	rows, err := r.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []TierRow
	for rows.Next() {
		var row TierRow
		var parent sql.NullInt64
		var fileID sql.NullInt64
		if err := rows.Scan(&row.ID, &parent, &row.TreePath, &row.SortOrder, &fileID, &row.IsDefault, &row.IsActive,
			&row.PurchaseStart, &row.PurchaseEnd, &row.Discount, &row.DiscountType, &row.ScopeType, &row.IsPromotion,
			&row.Name, &row.UpdatedAt); err != nil {
			return nil, err
		}
		if parent.Valid {
			row.ParentID = &parent.Int64
		}
		if fileID.Valid {
			row.SystemFileID = &fileID.Int64
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

func (r *TierRepository) Get(ctx context.Context, id int64, locale string) (*TierRow, error) {
	if locale == "" {
		locale = "th"
	}
	all, err := r.loadAll(ctx, "", nil, locale)
	if err != nil {
		return nil, err
	}
	for _, row := range all {
		if row.ID == id {
			names, err := r.loadTierNames(ctx, id)
			if err != nil {
				return nil, err
			}
			row.Names = names
			attrs, err := r.loadTierAttributes(ctx, id)
			if err != nil {
				return nil, err
			}
			row.AttributeIDs = attrs
			return &row, nil
		}
	}
	return nil, nil
}

func (r *TierRepository) Create(ctx context.Context, in TierCreateInput) (int64, error) {
	if err := validateNames(in.Names); err != nil {
		return 0, err
	}
	if in.DiscountType == "" {
		in.DiscountType = "percent"
	}
	if in.ScopeType == "" {
		in.ScopeType = "all"
	}
	all, err := r.loadAll(ctx, "", nil, "th")
	if err != nil {
		return 0, err
	}
	sortOrder := tree.MaxSortUnderParent(tierToNodes(all), in.ParentID, 0) + 10

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()
	act := nullActor(in.ActorID)
	var id int64
	err = tx.QueryRowContext(ctx, `
INSERT INTO member_tier (parent_id, tree_path, sort_order, system_file_id, is_default, is_active,
  purchase_start, purchase_end, discount, discount_type, type, is_promotion, created_by, updated_by)
VALUES ($1, 'n0'::ltree, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12) RETURNING id`,
		in.ParentID, sortOrder, in.SystemFileID, in.IsDefault, in.IsActive,
		in.PurchaseStart, in.PurchaseEnd, in.Discount, in.DiscountType, in.ScopeType, in.IsPromotion, act).Scan(&id)
	if err != nil {
		return 0, err
	}
	path, err := r.buildTreePath(ctx, tx, id, in.ParentID, all)
	if err != nil {
		return 0, err
	}
	if _, err := tx.ExecContext(ctx, `UPDATE member_tier SET tree_path = $1::ltree WHERE id = $2`, path, id); err != nil {
		return 0, err
	}
	if in.IsDefault {
		if err := clearOtherDefaults(ctx, tx, id); err != nil {
			return 0, err
		}
	}
	if err := upsertTierNames(ctx, tx, id, in.Names); err != nil {
		return 0, err
	}
	if err := replaceTierAttributes(ctx, tx, id, in.AttributeIDs); err != nil {
		return 0, err
	}
	return id, tx.Commit()
}

func (r *TierRepository) Patch(ctx context.Context, id int64, p TierPatch) error {
	row, err := r.Get(ctx, id, "th")
	if err != nil {
		return err
	}
	if row == nil {
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
	act := nullActor(p.ActorID)
	sets := []string{"updated_at = NOW()", fmt.Sprintf("updated_by = $%d", 2)}
	args := []any{id, act}
	n := 3
	if p.IsActive != nil {
		sets = append(sets, fmt.Sprintf("is_active = $%d", n))
		args = append(args, *p.IsActive)
		n++
	}
	if p.IsDefault != nil {
		sets = append(sets, fmt.Sprintf("is_default = $%d", n))
		args = append(args, *p.IsDefault)
		n++
		if *p.IsDefault {
			if err := clearOtherDefaults(ctx, tx, id); err != nil {
				return err
			}
		}
	}
	if p.SystemFileID.Set {
		sets = append(sets, fmt.Sprintf("system_file_id = $%d", n))
		args = append(args, p.SystemFileID.Value)
		n++
	}
	if p.PurchaseStart != nil {
		sets = append(sets, fmt.Sprintf("purchase_start = $%d", n))
		args = append(args, *p.PurchaseStart)
		n++
	}
	if p.PurchaseEnd != nil {
		sets = append(sets, fmt.Sprintf("purchase_end = $%d", n))
		args = append(args, *p.PurchaseEnd)
		n++
	}
	if p.Discount != nil {
		sets = append(sets, fmt.Sprintf("discount = $%d", n))
		args = append(args, *p.Discount)
		n++
	}
	if p.DiscountType != nil {
		sets = append(sets, fmt.Sprintf("discount_type = $%d", n))
		args = append(args, *p.DiscountType)
		n++
	}
	if p.ScopeType != nil {
		sets = append(sets, fmt.Sprintf("type = $%d", n))
		args = append(args, *p.ScopeType)
		n++
	}
	if p.IsPromotion != nil {
		sets = append(sets, fmt.Sprintf("is_promotion = $%d", n))
		args = append(args, *p.IsPromotion)
		n++
	}
	if len(sets) > 2 {
		q := fmt.Sprintf("UPDATE member_tier SET %s WHERE id = $1 AND deleted_at IS NULL", strings.Join(sets, ", "))
		if _, err := tx.ExecContext(ctx, q, args...); err != nil {
			return err
		}
	}
	if p.Names != nil {
		if err := upsertTierNames(ctx, tx, id, p.Names); err != nil {
			return err
		}
	}
	if p.SetAttributes {
		if err := replaceTierAttributes(ctx, tx, id, p.AttributeIDs); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (r *TierRepository) SoftDelete(ctx context.Context, id int64, actorID int64) error {
	res, err := r.db.ExecContext(ctx, `
UPDATE member_tier SET deleted_at = NOW(), updated_at = NOW(), updated_by = $2 WHERE id = $1 AND deleted_at IS NULL`, id, nullActor(actorID))
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *TierRepository) Reorder(ctx context.Context, dragID, targetID, actorID int64) error {
	all, err := r.loadAll(ctx, "", nil, "th")
	if err != nil {
		return err
	}
	next, err := tree.ReorderSiblings(tierToNodes(all), dragID, targetID)
	if err != nil {
		return ErrInvalidReorder
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	act := nullActor(actorID)
	for _, n := range next {
		if _, err := tx.ExecContext(ctx, `UPDATE member_tier SET sort_order = $2, updated_at = NOW(), updated_by = $3 WHERE id = $1 AND deleted_at IS NULL`,
			n.ID, n.SortOrder, act); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (r *TierRepository) Move(ctx context.Context, dragID, targetID int64, zone string, actorID int64) error {
	all, err := r.loadAll(ctx, "", nil, "th")
	if err != nil {
		return err
	}
	nodes := tierToNodes(all)
	next, err := tree.ApplyDrop(nodes, dragID, targetID, zone)
	if err != nil {
		return ErrInvalidReorder
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	act := nullActor(actorID)
	for _, n := range next {
		var parent *int64
		if n.ParentID != nil {
			parent = n.ParentID
		}
		if _, err := tx.ExecContext(ctx, `
UPDATE member_tier SET parent_id = $2, sort_order = $3, tree_path = $4::ltree, updated_at = NOW(), updated_by = $5
WHERE id = $1 AND deleted_at IS NULL`, n.ID, parent, n.SortOrder, n.TreePath, act); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func tierToNodes(rows []TierRow) []tree.Node {
	out := make([]tree.Node, len(rows))
	for i, r := range rows {
		out[i] = tree.Node{ID: r.ID, ParentID: r.ParentID, SortOrder: r.SortOrder, TreePath: r.TreePath}
	}
	return out
}

func (r *TierRepository) buildTreePath(ctx context.Context, tx *sql.Tx, id int64, parentID *int64, all []TierRow) (string, error) {
	rows := append([]TierRow{}, all...)
	found := false
	for i := range rows {
		if rows[i].ID == id {
			rows[i].ParentID = parentID
			found = true
			break
		}
	}
	if !found {
		rows = append(rows, TierRow{ID: id, ParentID: parentID})
	}
	nodes, err := tree.RecomputePaths(tierToNodes(rows))
	if err != nil {
		return "", err
	}
	n := tree.Find(nodes, id)
	if n == nil {
		return "", ErrValidation
	}
	return n.TreePath, nil
}

func clearOtherDefaults(ctx context.Context, tx *sql.Tx, keepID int64) error {
	_, err := tx.ExecContext(ctx, `UPDATE member_tier SET is_default = FALSE, updated_at = NOW() WHERE id <> $1 AND deleted_at IS NULL AND is_default = TRUE`, keepID)
	return err
}

func (r *TierRepository) loadTierNames(ctx context.Context, id int64) (map[string]string, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT locale, name FROM member_tier_language WHERE member_tier_id = $1`, id)
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

func upsertTierNames(ctx context.Context, tx *sql.Tx, id int64, names map[string]string) error {
	for _, loc := range []string{"th", "en"} {
		name := strings.TrimSpace(names[loc])
		_, err := tx.ExecContext(ctx, `
INSERT INTO member_tier_language (member_tier_id, locale, name) VALUES ($1, $2, $3)
ON CONFLICT (member_tier_id, locale) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()`, id, loc, name)
		if err != nil {
			return err
		}
	}
	return nil
}

func (r *TierRepository) loadTierAttributes(ctx context.Context, id int64) ([]int64, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT product_attribute_id FROM member_tier_attribute WHERE member_tier_id = $1`, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []int64
	for rows.Next() {
		var a int64
		if err := rows.Scan(&a); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func replaceTierAttributes(ctx context.Context, tx *sql.Tx, tierID int64, ids []int64) error {
	if _, err := tx.ExecContext(ctx, `DELETE FROM member_tier_attribute WHERE member_tier_id = $1`, tierID); err != nil {
		return err
	}
	for _, attrID := range ids {
		if attrID <= 0 {
			continue
		}
		if _, err := tx.ExecContext(ctx, `
INSERT INTO member_tier_attribute (member_tier_id, product_attribute_id) VALUES ($1, $2)
ON CONFLICT DO NOTHING`, tierID, attrID); err != nil {
			return err
		}
	}
	return nil
}

// Tier relation CRUD

type TierRelationRow struct {
	ID                     int64     `json:"id"`
	MemberSettingRelationID int64    `json:"member_setting_relation_id"`
	PurchaseStart          float64   `json:"purchase_start"`
	PurchaseEnd            float64   `json:"purchase_end"`
	Discount               float64   `json:"discount"`
	DiscountType           string    `json:"discount_type"`
	ScopeType              string    `json:"type"`
	IsPromotion            bool      `json:"is_promotion"`
	AttributeIDs           []int64   `json:"attribute_ids,omitempty"`
	UpdatedAt              time.Time `json:"updated_at"`
}

func (r *TierRepository) ListRelations(ctx context.Context, tierID int64) ([]TierRelationRow, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT id, member_setting_relation_id, purchase_start, purchase_end, discount, discount_type::text, type::text, is_promotion, updated_at
FROM member_tier_relation WHERE member_tier_id = $1 AND deleted_at IS NULL ORDER BY id`, tierID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []TierRelationRow
	for rows.Next() {
		var row TierRelationRow
		if err := rows.Scan(&row.ID, &row.MemberSettingRelationID, &row.PurchaseStart, &row.PurchaseEnd,
			&row.Discount, &row.DiscountType, &row.ScopeType, &row.IsPromotion, &row.UpdatedAt); err != nil {
			return nil, err
		}
		attrs, _ := r.loadRelationAttributes(ctx, row.ID)
		row.AttributeIDs = attrs
		out = append(out, row)
	}
	return out, rows.Err()
}

func (r *TierRepository) CreateRelation(ctx context.Context, tierID int64, relID int64, in TierRelationRow, actorID int64) (int64, error) {
	act := nullActor(actorID)
	dt := in.DiscountType
	if dt == "" {
		dt = "percent"
	}
	st := in.ScopeType
	if st == "" {
		st = "all"
	}
	var id int64
	err := r.db.QueryRowContext(ctx, `
INSERT INTO member_tier_relation (member_tier_id, member_setting_relation_id, purchase_start, purchase_end, discount, discount_type, type, is_promotion, created_by, updated_by)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9) RETURNING id`,
		tierID, relID, in.PurchaseStart, in.PurchaseEnd, in.Discount, dt, st, in.IsPromotion, act).Scan(&id)
	if err != nil {
		return 0, err
	}
	if err := replaceRelationAttributes(ctx, r.db, id, in.AttributeIDs); err != nil {
		return 0, err
	}
	return id, nil
}

func (r *TierRepository) PatchRelation(ctx context.Context, relationID int64, in TierRelationRow, actorID int64) error {
	res, err := r.db.ExecContext(ctx, `
UPDATE member_tier_relation SET purchase_start = $2, purchase_end = $3, discount = $4, discount_type = $5, type = $6, is_promotion = $7,
  updated_at = NOW(), updated_by = $8
WHERE id = $1 AND deleted_at IS NULL`,
		relationID, in.PurchaseStart, in.PurchaseEnd, in.Discount, in.DiscountType, in.ScopeType, in.IsPromotion, nullActor(actorID))
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	if in.AttributeIDs != nil {
		return replaceRelationAttributes(ctx, r.db, relationID, in.AttributeIDs)
	}
	return nil
}

func (r *TierRepository) DeleteRelation(ctx context.Context, relationID int64, actorID int64) error {
	res, err := r.db.ExecContext(ctx, `
UPDATE member_tier_relation SET deleted_at = NOW(), updated_at = NOW(), updated_by = $2 WHERE id = $1 AND deleted_at IS NULL`, relationID, nullActor(actorID))
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *TierRepository) loadRelationAttributes(ctx context.Context, relationID int64) ([]int64, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT product_attribute_id FROM member_tier_relation_attribute WHERE member_tier_relation_id = $1`, relationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []int64
	for rows.Next() {
		var a int64
		if err := rows.Scan(&a); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func replaceRelationAttributes(ctx context.Context, db dbExec, relationID int64, ids []int64) error {
	if _, err := db.ExecContext(ctx, `DELETE FROM member_tier_relation_attribute WHERE member_tier_relation_id = $1`, relationID); err != nil {
		return err
	}
	for _, attrID := range ids {
		if attrID <= 0 {
			continue
		}
		if _, err := db.ExecContext(ctx, `
INSERT INTO member_tier_relation_attribute (member_tier_relation_id, product_attribute_id) VALUES ($1, $2)`, relationID, attrID); err != nil {
			return err
		}
	}
	return nil
}

type dbExec interface {
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
}
