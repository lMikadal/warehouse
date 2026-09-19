package order

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"
)

type CompareRepository struct {
	db *sql.DB
}

func NewCompareRepository(db *sql.DB) *CompareRepository {
	return &CompareRepository{db: db}
}

type categoryRow struct {
	ID        int64
	ParentID  *int64
	SortOrder int
	Name      string
}

type TreeNode struct {
	ID             int64      `json:"id"`
	Name           string     `json:"name"`
	SystemFileID   *int64     `json:"system_file_id,omitempty"`
	CategoryCount  int        `json:"category_count,omitempty"`
	IsDefined      bool       `json:"is_defined"`
	Children       []TreeNode `json:"children"`
}

type brandListRow struct {
	ID           int64
	Name         string
	SystemFileID *int64
}

type RuleLine struct {
	MemberSettingRelationID int64   `json:"member_setting_relation_id"`
	BusinessName            string  `json:"business_name"`
	GroupName               string  `json:"group_name"`
	CreditName              string  `json:"credit_name"`
	Discount                float64 `json:"discount"`
	DiscountType            string  `json:"discount_type"`
	RuleID                  *int64  `json:"rule_id,omitempty"`
}

type RuleWrite struct {
	MemberSettingRelationID int64   `json:"member_setting_relation_id"`
	Discount                float64 `json:"discount"`
	DiscountType            string  `json:"discount_type"`
}

type ExportRow struct {
	ID                      int64    `json:"id"`
	BrandID                 int64    `json:"brand_id"`
	BrandName               string   `json:"brand_name"`
	CategoryID              *int64   `json:"category_id"`
	CategoryName            string   `json:"category_name"`
	MemberSettingRelationID int64    `json:"member_setting_relation_id"`
	Discount                float64  `json:"discount"`
	DiscountType            string   `json:"discount_type"`
	UpdatedAt               time.Time `json:"updated_at"`
}

func nullActor(id int64) sql.NullInt64 {
	if id <= 0 {
		return sql.NullInt64{}
	}
	return sql.NullInt64{Int64: id, Valid: true}
}

func (r *CompareRepository) ListBrandTree(ctx context.Context, locale string, page, limit int, search string) ([]TreeNode, int64, error) {
	if locale == "" {
		locale = "th"
	}
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 10
	}
	search = strings.TrimSpace(search)

	countQ := `SELECT COUNT(*) FROM product_attribute b
WHERE b.deleted_at IS NULL AND b.type = 'brand' AND b.is_active = TRUE`
	args := []any{}
	n := 1
	if search != "" {
		countQ += fmt.Sprintf(` AND EXISTS (
			SELECT 1 FROM product_attribute_language bl
			WHERE bl.product_attribute_id = b.id AND bl.locale = $%d AND bl.name ILIKE $%d)`, n, n+1)
		args = append(args, locale, "%"+search+"%")
		n += 2
	}
	var total int64
	if err := r.db.QueryRowContext(ctx, countQ, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	listQ := `SELECT b.id, COALESCE(bl.name, ''), b.system_file_id
FROM product_attribute b
LEFT JOIN product_attribute_language bl ON bl.product_attribute_id = b.id AND bl.locale = $1
WHERE b.deleted_at IS NULL AND b.type = 'brand' AND b.is_active = TRUE`
	listArgs := []any{locale}
	ln := 2
	if search != "" {
		listQ += fmt.Sprintf(` AND EXISTS (
			SELECT 1 FROM product_attribute_language bl2
			WHERE bl2.product_attribute_id = b.id AND bl2.locale = $1 AND bl2.name ILIKE $%d)`, ln)
		listArgs = append(listArgs, "%"+search+"%")
		ln++
	}
	listQ += fmt.Sprintf(` ORDER BY b.sort_order ASC, b.id ASC LIMIT $%d OFFSET $%d`, ln, ln+1)
	offset := (page - 1) * limit
	listArgs = append(listArgs, limit, offset)

	rows, err := r.db.QueryContext(ctx, listQ, listArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var brands []brandListRow
	for rows.Next() {
		var b brandListRow
		var fileID sql.NullInt64
		if err := rows.Scan(&b.ID, &b.Name, &fileID); err != nil {
			return nil, 0, err
		}
		if fileID.Valid {
			b.SystemFileID = &fileID.Int64
		}
		brands = append(brands, b)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	out := make([]TreeNode, 0, len(brands))
	for _, b := range brands {
		children, catCount, err := r.buildBrandCategoryTree(ctx, locale, b.ID)
		if err != nil {
			return nil, 0, err
		}
		brandDefined, err := r.scopeIsDefined(ctx, b.ID, nil)
		if err != nil {
			return nil, 0, err
		}
		for i := range children {
			def, err := r.scopeIsDefined(ctx, b.ID, &children[i].ID)
			if err != nil {
				return nil, 0, err
			}
			children[i].IsDefined = def
			if err := r.markCategoryDefined(ctx, b.ID, &children[i]); err != nil {
				return nil, 0, err
			}
		}
		node := TreeNode{
			ID:            b.ID,
			Name:          b.Name,
			CategoryCount: catCount,
			IsDefined:     brandDefined,
			Children:      children,
		}
		if b.SystemFileID != nil {
			node.SystemFileID = b.SystemFileID
		}
		out = append(out, node)
	}
	return out, total, nil
}

func (r *CompareRepository) markCategoryDefined(ctx context.Context, brandID int64, node *TreeNode) error {
	for i := range node.Children {
		def, err := r.scopeIsDefined(ctx, brandID, &node.Children[i].ID)
		if err != nil {
			return err
		}
		node.Children[i].IsDefined = def
		if err := r.markCategoryDefined(ctx, brandID, &node.Children[i]); err != nil {
			return err
		}
	}
	return nil
}

func (r *CompareRepository) buildBrandCategoryTree(ctx context.Context, locale string, brandID int64) ([]TreeNode, int, error) {
	linked, err := r.loadLinkedCategoryIDs(ctx, brandID)
	if err != nil {
		return nil, 0, err
	}
	if len(linked) == 0 {
		return []TreeNode{}, 0, nil
	}
	allIDs, err := r.expandCategoryAncestors(ctx, linked)
	if err != nil {
		return nil, 0, err
	}
	cats, err := r.loadCategoriesByIDs(ctx, locale, allIDs)
	if err != nil {
		return nil, 0, err
	}
	roots := buildCategoryForest(cats, linked)
	return roots, len(allIDs), nil
}

func (r *CompareRepository) loadLinkedCategoryIDs(ctx context.Context, brandID int64) ([]int64, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT par.related_id FROM product_attribute_relation par
INNER JOIN product_attribute c ON c.id = par.related_id AND c.deleted_at IS NULL AND c.type = 'category' AND c.is_active = TRUE
WHERE par.product_attribute_id = $1`, brandID)
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

func (r *CompareRepository) expandCategoryAncestors(ctx context.Context, seed []int64) ([]int64, error) {
	set := map[int64]struct{}{}
	for _, id := range seed {
		set[id] = struct{}{}
	}
	for {
		added := false
		for id := range set {
			var parent sql.NullInt64
			err := r.db.QueryRowContext(ctx,
				`SELECT parent_id FROM product_attribute WHERE id = $1 AND deleted_at IS NULL AND type = 'category'`, id).Scan(&parent)
			if err != nil {
				if errors.Is(err, sql.ErrNoRows) {
					continue
				}
				return nil, err
			}
			if parent.Valid {
				if _, ok := set[parent.Int64]; !ok {
					set[parent.Int64] = struct{}{}
					added = true
				}
			}
		}
		if !added {
			break
		}
	}
	out := make([]int64, 0, len(set))
	for id := range set {
		out = append(out, id)
	}
	sort.Slice(out, func(i, j int) bool { return out[i] < out[j] })
	return out, nil
}

func (r *CompareRepository) loadCategoriesByIDs(ctx context.Context, locale string, ids []int64) ([]categoryRow, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	// ponytail: bounded category set per brand page row; IN list from linked+ancestors
	placeholders := make([]string, len(ids))
	args := []any{locale}
	for i, id := range ids {
		placeholders[i] = fmt.Sprintf("$%d", i+2)
		args = append(args, id)
	}
	q := fmt.Sprintf(`SELECT t.id, t.parent_id, t.sort_order, COALESCE(l.name, '')
FROM product_attribute t
LEFT JOIN product_attribute_language l ON l.product_attribute_id = t.id AND l.locale = $1
WHERE t.id IN (%s) AND t.deleted_at IS NULL AND t.type = 'category'`, strings.Join(placeholders, ","))
	rows, err := r.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []categoryRow
	for rows.Next() {
		var c categoryRow
		var parent sql.NullInt64
		if err := rows.Scan(&c.ID, &parent, &c.SortOrder, &c.Name); err != nil {
			return nil, err
		}
		if parent.Valid {
			c.ParentID = &parent.Int64
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func buildCategoryForest(all []categoryRow, linked []int64) []TreeNode {
	linkedSet := map[int64]struct{}{}
	for _, id := range linked {
		linkedSet[id] = struct{}{}
	}
	byID := map[int64]categoryRow{}
	for _, c := range all {
		byID[c.ID] = c
	}
	byParent := map[string][]categoryRow{}
	for _, c := range all {
		key := "null"
		if c.ParentID != nil {
			key = fmt.Sprintf("%d", *c.ParentID)
		}
		byParent[key] = append(byParent[key], c)
	}
	for k := range byParent {
		s := byParent[k]
		sort.Slice(s, func(i, j int) bool {
			if s[i].SortOrder != s[j].SortOrder {
				return s[i].SortOrder < s[j].SortOrder
			}
			return s[i].ID < s[j].ID
		})
		byParent[k] = s
	}

	var roots []TreeNode
	for id := range linkedSet {
		c, ok := byID[id]
		if !ok {
			continue
		}
		if c.ParentID != nil {
			if _, inSet := byID[*c.ParentID]; inSet {
				continue
			}
		}
		roots = append(roots, buildTreeNode(c, byParent))
	}
	sort.Slice(roots, func(i, j int) bool {
		return roots[i].Name < roots[j].Name
	})
	return roots
}

func buildTreeNode(c categoryRow, byParent map[string][]categoryRow) TreeNode {
	key := fmt.Sprintf("%d", c.ID)
	kids := byParent[key]
	children := make([]TreeNode, 0, len(kids))
	for _, ch := range kids {
		children = append(children, buildTreeNode(ch, byParent))
	}
	return TreeNode{ID: c.ID, Name: c.Name, Children: children}
}

func (r *CompareRepository) scopeIsDefined(ctx context.Context, brandID int64, categoryID *int64) (bool, error) {
	var exists bool
	if categoryID == nil {
		err := r.db.QueryRowContext(ctx, `
SELECT EXISTS(
  SELECT 1 FROM discount_rule dr
  WHERE dr.brand_attribute_id = $1 AND dr.category_attribute_id IS NULL
    AND dr.deleted_at IS NULL AND dr.discount > 0)`, brandID).Scan(&exists)
		return exists, err
	}
	err := r.db.QueryRowContext(ctx, `
SELECT EXISTS(
  SELECT 1 FROM discount_rule dr
  WHERE dr.brand_attribute_id = $1 AND dr.category_attribute_id = $2
    AND dr.deleted_at IS NULL AND dr.discount > 0)`, brandID, *categoryID).Scan(&exists)
	return exists, err
}

func (r *CompareRepository) ValidateBrand(ctx context.Context, brandID int64) error {
	var ok bool
	err := r.db.QueryRowContext(ctx,
		`SELECT EXISTS(SELECT 1 FROM product_attribute WHERE id = $1 AND deleted_at IS NULL AND type = 'brand' AND is_active = TRUE)`,
		brandID).Scan(&ok)
	if err != nil {
		return err
	}
	if !ok {
		return ErrNotFound
	}
	return nil
}

func (r *CompareRepository) ValidateCategoryForBrand(ctx context.Context, brandID, categoryID int64) error {
	var ok bool
	err := r.db.QueryRowContext(ctx, `
SELECT EXISTS(
  SELECT 1 FROM product_attribute_relation par
  INNER JOIN product_attribute c ON c.id = par.related_id AND c.deleted_at IS NULL AND c.type = 'category'
  WHERE par.product_attribute_id = $1 AND par.related_id = $2)`, brandID, categoryID).Scan(&ok)
	if err != nil {
		return err
	}
	if !ok {
		return ErrValidation
	}
	return nil
}

const rulesFrom = `
FROM member_setting_relation r
INNER JOIN member_setting_business b ON b.id = r.business_id AND b.deleted_at IS NULL AND b.is_active = TRUE
LEFT JOIN member_setting_business_language bl ON bl.member_setting_business_id = b.id AND bl.locale = $1
LEFT JOIN member_setting_credit_language cl ON cl.member_setting_credit_id = r.credit_id AND cl.locale = $1
LEFT JOIN member_setting_group_language gl ON gl.member_setting_group_id = r.group_id AND gl.locale = $1
WHERE r.deleted_at IS NULL AND r.is_active = TRUE`

func (r *CompareRepository) ListRules(ctx context.Context, locale string, brandID int64, categoryID *int64) ([]RuleLine, error) {
	if locale == "" {
		locale = "th"
	}
	if err := r.ValidateBrand(ctx, brandID); err != nil {
		return nil, err
	}
	if categoryID != nil {
		if err := r.ValidateCategoryForBrand(ctx, brandID, *categoryID); err != nil {
			return nil, err
		}
	}

	q := `SELECT r.id, COALESCE(bl.name, ''), COALESCE(gl.name, ''), COALESCE(cl.name, '') ` + rulesFrom + ` ORDER BY r.id ASC`
	rows, err := r.db.QueryContext(ctx, q, locale)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var lines []RuleLine
	for rows.Next() {
		var relID int64
		var business, group, credit string
		if err := rows.Scan(&relID, &business, &group, &credit); err != nil {
			return nil, err
		}
		lines = append(lines, RuleLine{
			MemberSettingRelationID: relID,
			BusinessName:            business,
			GroupName:               group,
			CreditName:              credit,
			DiscountType:            "percent",
		})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	discounts, err := r.loadScopeDiscounts(ctx, brandID, categoryID)
	if err != nil {
		return nil, err
	}
	for i := range lines {
		if d, ok := discounts[lines[i].MemberSettingRelationID]; ok {
			lines[i].Discount = d.Discount
			lines[i].DiscountType = d.DiscountType
			lines[i].RuleID = &d.ID
		}
	}
	return lines, nil
}

type discountVal struct {
	ID           int64
	Discount     float64
	DiscountType string
}

func (r *CompareRepository) loadScopeDiscounts(ctx context.Context, brandID int64, categoryID *int64) (map[int64]discountVal, error) {
	var rows *sql.Rows
	var err error
	if categoryID == nil {
		rows, err = r.db.QueryContext(ctx, `
SELECT id, member_setting_relation_id, discount, discount_type::text
FROM discount_rule
WHERE brand_attribute_id = $1 AND category_attribute_id IS NULL AND deleted_at IS NULL`, brandID)
	} else {
		rows, err = r.db.QueryContext(ctx, `
SELECT id, member_setting_relation_id, discount, discount_type::text
FROM discount_rule
WHERE brand_attribute_id = $1 AND category_attribute_id = $2 AND deleted_at IS NULL`, brandID, *categoryID)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[int64]discountVal{}
	for rows.Next() {
		var id, relID int64
		var discount float64
		var dtype string
		if err := rows.Scan(&id, &relID, &discount, &dtype); err != nil {
			return nil, err
		}
		out[relID] = discountVal{ID: id, Discount: discount, DiscountType: dtype}
	}
	return out, rows.Err()
}

func (r *CompareRepository) SaveRules(ctx context.Context, brandID int64, categoryID *int64, rules []RuleWrite, actorID int64) error {
	if err := r.ValidateBrand(ctx, brandID); err != nil {
		return err
	}
	if categoryID != nil {
		if err := r.ValidateCategoryForBrand(ctx, brandID, *categoryID); err != nil {
			return err
		}
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	for _, rule := range rules {
		dtype := strings.TrimSpace(rule.DiscountType)
		if dtype == "" {
			dtype = "percent"
		}
		if dtype != "percent" && dtype != "baht" {
			return ErrValidation
		}
		if rule.Discount < 0 || (dtype == "percent" && rule.Discount > 100) {
			return ErrValidation
		}
		if rule.MemberSettingRelationID <= 0 {
			return ErrValidation
		}
		var relOK bool
		if err := tx.QueryRowContext(ctx,
			`SELECT EXISTS(SELECT 1 FROM member_setting_relation WHERE id = $1 AND deleted_at IS NULL AND is_active = TRUE)`,
			rule.MemberSettingRelationID).Scan(&relOK); err != nil {
			return err
		}
		if !relOK {
			return ErrValidation
		}

		if rule.Discount <= 0 {
			if categoryID == nil {
				_, err = tx.ExecContext(ctx, `
UPDATE discount_rule SET deleted_at = NOW(), updated_at = NOW(), updated_by = $3
WHERE brand_attribute_id = $1 AND category_attribute_id IS NULL AND member_setting_relation_id = $2 AND deleted_at IS NULL`,
					brandID, rule.MemberSettingRelationID, nullActor(actorID))
			} else {
				_, err = tx.ExecContext(ctx, `
UPDATE discount_rule SET deleted_at = NOW(), updated_at = NOW(), updated_by = $4
WHERE brand_attribute_id = $1 AND category_attribute_id = $2 AND member_setting_relation_id = $3 AND deleted_at IS NULL`,
					brandID, *categoryID, rule.MemberSettingRelationID, nullActor(actorID))
			}
			if err != nil {
				return err
			}
			continue
		}

		var existingID sql.NullInt64
		if categoryID == nil {
			err = tx.QueryRowContext(ctx, `
SELECT id FROM discount_rule
WHERE brand_attribute_id = $1 AND category_attribute_id IS NULL AND member_setting_relation_id = $2
ORDER BY deleted_at NULLS FIRST LIMIT 1`, brandID, rule.MemberSettingRelationID).Scan(&existingID)
		} else {
			err = tx.QueryRowContext(ctx, `
SELECT id FROM discount_rule
WHERE brand_attribute_id = $1 AND category_attribute_id = $2 AND member_setting_relation_id = $3
ORDER BY deleted_at NULLS FIRST LIMIT 1`, brandID, *categoryID, rule.MemberSettingRelationID).Scan(&existingID)
		}
		if err != nil && !errors.Is(err, sql.ErrNoRows) {
			return err
		}

		if existingID.Valid {
			_, err = tx.ExecContext(ctx, `
UPDATE discount_rule SET discount = $2, discount_type = $3::discount_unit, deleted_at = NULL,
  updated_at = NOW(), updated_by = $4
WHERE id = $1`, existingID.Int64, rule.Discount, dtype, nullActor(actorID))
		} else if categoryID == nil {
			_, err = tx.ExecContext(ctx, `
INSERT INTO discount_rule (brand_attribute_id, category_attribute_id, member_setting_relation_id, discount, discount_type, created_by, updated_by)
VALUES ($1, NULL, $2, $3, $4::discount_unit, $5, $5)`, brandID, rule.MemberSettingRelationID, rule.Discount, dtype, nullActor(actorID))
		} else {
			_, err = tx.ExecContext(ctx, `
INSERT INTO discount_rule (brand_attribute_id, category_attribute_id, member_setting_relation_id, discount, discount_type, created_by, updated_by)
VALUES ($1, $2, $3, $4, $5::discount_unit, $6, $6)`, brandID, *categoryID, rule.MemberSettingRelationID, rule.Discount, dtype, nullActor(actorID))
		}
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (r *CompareRepository) ExportAll(ctx context.Context, locale string) ([]ExportRow, error) {
	if locale == "" {
		locale = "th"
	}
	q := `
SELECT dr.id, dr.brand_attribute_id, COALESCE(bl.name, ''), dr.category_attribute_id, COALESCE(cl.name, ''),
  dr.member_setting_relation_id, dr.discount, dr.discount_type::text, dr.updated_at
FROM discount_rule dr
INNER JOIN product_attribute b ON b.id = dr.brand_attribute_id AND b.deleted_at IS NULL
LEFT JOIN product_attribute_language bl ON bl.product_attribute_id = b.id AND bl.locale = $1
LEFT JOIN product_attribute c ON c.id = dr.category_attribute_id
LEFT JOIN product_attribute_language cl ON cl.product_attribute_id = c.id AND cl.locale = $1
WHERE dr.deleted_at IS NULL AND dr.discount > 0
ORDER BY dr.brand_attribute_id, dr.category_attribute_id NULLS FIRST, dr.member_setting_relation_id`
	rows, err := r.db.QueryContext(ctx, q, locale)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []ExportRow
	for rows.Next() {
		var row ExportRow
		var catID sql.NullInt64
		if err := rows.Scan(&row.ID, &row.BrandID, &row.BrandName, &catID, &row.CategoryName,
			&row.MemberSettingRelationID, &row.Discount, &row.DiscountType, &row.UpdatedAt); err != nil {
			return nil, err
		}
		if catID.Valid {
			row.CategoryID = &catID.Int64
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

type ImportRule struct {
	BrandID                 int64   `json:"brand_id"`
	CategoryID              *int64  `json:"category_id"`
	MemberSettingRelationID int64   `json:"member_setting_relation_id"`
	Discount                float64 `json:"discount"`
	DiscountType            string  `json:"discount_type"`
}

func importScopeKey(brandID int64, categoryID *int64) string {
	if categoryID == nil {
		return fmt.Sprintf("b:%d", brandID)
	}
	return fmt.Sprintf("b:%d:c:%d", brandID, *categoryID)
}

func (r *CompareRepository) ImportRules(ctx context.Context, items []ImportRule, actorID int64) error {
	type scope struct {
		brandID    int64
		categoryID *int64
	}
	byScope := map[string]scope{}
	rulesByKey := map[string][]RuleWrite{}
	for _, it := range items {
		key := importScopeKey(it.BrandID, it.CategoryID)
		if _, ok := byScope[key]; !ok {
			cat := it.CategoryID
			byScope[key] = scope{brandID: it.BrandID, categoryID: cat}
		}
		rulesByKey[key] = append(rulesByKey[key], RuleWrite{
			MemberSettingRelationID: it.MemberSettingRelationID,
			Discount:                it.Discount,
			DiscountType:            it.DiscountType,
		})
	}
	for key, sc := range byScope {
		if err := r.SaveRules(ctx, sc.brandID, sc.categoryID, rulesByKey[key], actorID); err != nil {
			return err
		}
	}
	return nil
}
