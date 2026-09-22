package system

import (
	"context"
	"database/sql"
	"strings"
)

// PermissionMatrixGroup is one root sidebar section with assignable menu rows.
type PermissionMatrixGroup struct {
	RootID    int64                 `json:"root_id"`
	RootLabel string                `json:"root_label"`
	Rows      []PermissionMatrixRow `json:"rows"`
}

// PermissionMatrixRow is one navigable menu leaf and its permission ids by action.
type PermissionMatrixRow struct {
	MenuID      int64            `json:"menu_id"`
	Label       string           `json:"label"`
	Permissions map[string]int64 `json:"permissions"`
}

type matrixMenuRow struct {
	id        int64
	parentID  sql.NullInt64
	path      sql.NullString
	sortOrder int
	isDialog  bool
	label     string
	perms     map[string]int64
}

func (r *MenuPermissionRepository) PermissionMatrix(ctx context.Context, locale string) ([]PermissionMatrixGroup, error) {
	if locale == "" {
		locale = "th"
	}
	rows, err := r.db.QueryContext(ctx, `
SELECT
  m.id, m.parent_id, m.path, m.sort_order, m.is_dialog,
  COALESCE(ml.name, '') AS menu_name,
  sp.id AS perm_id, sp.action
FROM system_menu m
LEFT JOIN system_menu_language ml ON ml.system_menu_id = m.id AND ml.locale = $1
LEFT JOIN system_menu_permission smp ON smp.system_menu_id = m.id
LEFT JOIN system_permission sp ON sp.id = smp.system_permission_id AND sp.deleted_at IS NULL AND sp.is_active = TRUE
WHERE m.deleted_at IS NULL AND m.is_active = TRUE
ORDER BY m.sort_order ASC, m.id ASC`, locale)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	byID := make(map[int64]*matrixMenuRow)
	var order []int64
	for rows.Next() {
		var id int64
		var parentID sql.NullInt64
		var path sql.NullString
		var sortOrder int
		var isDialog bool
		var menuName string
		var permID sql.NullInt64
		var action sql.NullString
		if err := rows.Scan(&id, &parentID, &path, &sortOrder, &isDialog, &menuName, &permID, &action); err != nil {
			return nil, err
		}
		row, ok := byID[id]
		if !ok {
			row = &matrixMenuRow{
				id: id, parentID: parentID, path: path, sortOrder: sortOrder, isDialog: isDialog,
				label: menuName, perms: make(map[string]int64),
			}
			byID[id] = row
			order = append(order, id)
		}
		if permID.Valid && action.Valid {
			row.perms[action.String] = permID.Int64
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	parentByID := make(map[int64]sql.NullInt64, len(byID))
	for id, row := range byID {
		parentByID[id] = row.parentID
	}

	rootLabel := func(menuID int64) string {
		rootID := rootMenuID(menuID, parentByID)
		if r := byID[rootID]; r != nil {
			return r.label
		}
		return ""
	}

	type groupAcc struct {
		rootID int64
		label  string
		rows   []PermissionMatrixRow
	}
	groupsByRoot := make(map[int64]*groupAcc)

	for _, id := range order {
		row := byID[id]
		if !isMatrixMenuRow(row) {
			continue
		}
		rootID := rootMenuID(id, parentByID)
		g := groupsByRoot[rootID]
		if g == nil {
			g = &groupAcc{rootID: rootID, label: rootLabel(id)}
			groupsByRoot[rootID] = g
		}
		perms := make(map[string]int64, len(row.perms))
		for action, permID := range row.perms {
			perms[action] = permID
		}
		g.rows = append(g.rows, PermissionMatrixRow{
			MenuID: id, Label: row.label, Permissions: perms,
		})
	}

	var rootOrder []int64
	for _, id := range order {
		row := byID[id]
		if !row.parentID.Valid {
			rootOrder = append(rootOrder, id)
		}
	}

	var out []PermissionMatrixGroup
	for _, rootID := range rootOrder {
		g := groupsByRoot[rootID]
		if g == nil || len(g.rows) == 0 {
			continue
		}
		out = append(out, PermissionMatrixGroup{
			RootID: g.rootID, RootLabel: g.label, Rows: g.rows,
		})
	}
	return out, nil
}

func isMatrixMenuRow(row *matrixMenuRow) bool {
	if row == nil || row.isDialog {
		return false
	}
	if !row.path.Valid || strings.TrimSpace(row.path.String) == "" {
		return false
	}
	p := strings.ToLower(row.path.String)
	if strings.Contains(p, "dashboard") {
		return false
	}
	return len(row.perms) > 0
}

func rootMenuID(menuID int64, parentByID map[int64]sql.NullInt64) int64 {
	seen := make(map[int64]struct{})
	cur := menuID
	for {
		if _, ok := seen[cur]; ok {
			return menuID
		}
		seen[cur] = struct{}{}
		p, ok := parentByID[cur]
		if !ok || !p.Valid {
			return cur
		}
		cur = p.Int64
	}
}
