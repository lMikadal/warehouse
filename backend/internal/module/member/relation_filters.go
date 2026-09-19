package member

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

type SettingRelationFilterItem struct {
	ID            int64  `json:"id"`
	BusinessID    int64  `json:"business_id"`
	CreditID      int64  `json:"credit_id"`
	GroupID       int64  `json:"group_id"`
	Name          string `json:"name"`
	BusinessTitle string `json:"business_title"`
	CreditName    string `json:"credit_name"`
	GroupName     string `json:"group_name"`
}

type SettingRelationFilterQuery struct {
	Page   int
	Limit  int
	Search string
	ID     int64
	Locale string
}

func settingRelationFilterLabel(business, credit, group string) string {
	parts := []string{}
	for _, p := range []string{strings.TrimSpace(business), strings.TrimSpace(credit), strings.TrimSpace(group)} {
		if p != "" {
			parts = append(parts, p)
		}
	}
	if len(parts) == 0 {
		return ""
	}
	return strings.Join(parts, " · ")
}

func settingRelationBusinessTitle(business, group string) string {
	business = strings.TrimSpace(business)
	group = strings.TrimSpace(group)
	if group != "" && group != business {
		return business + group
	}
	if business != "" {
		return business
	}
	return "—"
}

const settingRelationFilterFrom = `
FROM member_setting_relation r
INNER JOIN member_setting_business b ON b.id = r.business_id AND b.deleted_at IS NULL AND b.is_active = TRUE
LEFT JOIN member_setting_business_language bl ON bl.member_setting_business_id = b.id AND bl.locale = $1
LEFT JOIN member_setting_credit_language cl ON cl.member_setting_credit_id = r.credit_id AND cl.locale = $1
LEFT JOIN member_setting_group_language gl ON gl.member_setting_group_id = r.group_id AND gl.locale = $1
WHERE r.deleted_at IS NULL AND r.is_active = TRUE`

func (r *RelationRepository) ListSettingRelationFilters(ctx context.Context, q SettingRelationFilterQuery) ([]SettingRelationFilterItem, int64, error) {
	locale := q.Locale
	if locale == "" {
		locale = "th"
	}
	if q.ID > 0 {
		row, err := r.loadOneSettingRelationFilter(ctx, locale, q.ID)
		if err != nil {
			return nil, 0, err
		}
		if row == nil {
			return []SettingRelationFilterItem{}, 0, nil
		}
		return []SettingRelationFilterItem{*row}, 1, nil
	}
	search := strings.TrimSpace(q.Search)
	page := q.Page
	if page < 1 {
		page = 1
	}
	limit := q.Limit
	if limit < 1 {
		limit = 10
	}
	offset := (page - 1) * limit

	clauses := []string{settingRelationFilterFrom}
	args := []any{locale}
	n := 2
	if search != "" {
		clauses = append(clauses, fmt.Sprintf(` AND (COALESCE(bl.name, '') ILIKE $%d OR COALESCE(cl.name, '') ILIKE $%d OR COALESCE(gl.name, '') ILIKE $%d)`, n, n, n))
		args = append(args, "%"+search+"%")
		n++
	}
	whereSQL := strings.Join(clauses, "")

	var total int64
	countQ := `SELECT COUNT(*) ` + whereSQL
	if err := r.db.QueryRowContext(ctx, countQ, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	listQ := `SELECT r.id, r.business_id, r.credit_id, r.group_id, COALESCE(bl.name, ''), COALESCE(cl.name, ''), COALESCE(gl.name, '') ` + whereSQL +
		fmt.Sprintf(` ORDER BY b.id ASC, r.id ASC LIMIT $%d OFFSET $%d`, n, n+1)
	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, listQ, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var out []SettingRelationFilterItem
	for rows.Next() {
		item, err := scanSettingRelationFilterItem(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, item)
	}
	if out == nil {
		out = []SettingRelationFilterItem{}
	}
	return out, total, rows.Err()
}

type filterScanner interface {
	Scan(dest ...any) error
}

func scanSettingRelationFilterItem(rows filterScanner) (SettingRelationFilterItem, error) {
	var id, businessID, creditID, groupID int64
	var business, credit, group string
	if err := rows.Scan(&id, &businessID, &creditID, &groupID, &business, &credit, &group); err != nil {
		return SettingRelationFilterItem{}, err
	}
	name := settingRelationFilterLabel(business, credit, group)
	if name == "" {
		name = fmt.Sprintf("#%d", id)
	}
	return SettingRelationFilterItem{
		ID:            id,
		BusinessID:    businessID,
		CreditID:      creditID,
		GroupID:       groupID,
		Name:          name,
		BusinessTitle: settingRelationBusinessTitle(business, group),
		CreditName:    strings.TrimSpace(credit),
		GroupName:     strings.TrimSpace(group),
	}, nil
}

func (r *RelationRepository) loadOneSettingRelationFilter(ctx context.Context, locale string, id int64) (*SettingRelationFilterItem, error) {
	q := `SELECT r.id, r.business_id, r.credit_id, r.group_id, COALESCE(bl.name, ''), COALESCE(cl.name, ''), COALESCE(gl.name, '') ` + settingRelationFilterFrom + ` AND r.id = $2`
	row := r.db.QueryRowContext(ctx, q, locale, id)
	item, err := scanSettingRelationFilterItem(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &item, nil
}
