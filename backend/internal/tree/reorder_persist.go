package tree

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
)

// ParentScopedReorderTarget identifies a whitelisted child table scoped by a parent FK.
type ParentScopedReorderTarget int

const (
	ReorderSupplierContact ParentScopedReorderTarget = iota
	ReorderSupplierBank
)

var errUnknownReorderTarget = errors.New("unknown reorder target")

// ErrInvalidReorder is returned when drag_id or target_id is not valid for the sibling set.
var ErrInvalidReorder = errors.New("invalid reorder")

func parentScopedReorderSpec(t ParentScopedReorderTarget) (table, parentColumn string, ok bool) {
	switch t {
	case ReorderSupplierContact:
		return "supplier_contact", "supplier_user_id", true
	case ReorderSupplierBank:
		return "supplier_bank", "supplier_user_id", true
	default:
		return "", "", false
	}
}

// PersistParentScopedSiblingReorder loads sibling rows, reorders in memory, and persists sort_order.
func PersistParentScopedSiblingReorder(
	ctx context.Context,
	db *sql.DB,
	target ParentScopedReorderTarget,
	parentID, dragID, targetID, actorID int64,
) error {
	table, parentCol, ok := parentScopedReorderSpec(target)
	if !ok {
		return errUnknownReorderTarget
	}
	q := fmt.Sprintf(`
SELECT id, sort_order FROM %s
WHERE %s = $1 AND deleted_at IS NULL
ORDER BY sort_order ASC, id ASC`, table, parentCol)
	rows, err := db.QueryContext(ctx, q, parentID)
	if err != nil {
		return err
	}
	defer rows.Close()
	var nodes []Node
	for rows.Next() {
		var n Node
		if err := rows.Scan(&n.ID, &n.SortOrder); err != nil {
			return err
		}
		nodes = append(nodes, n)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	next, err := ReorderSiblings(nodes, dragID, targetID)
	if err != nil {
		return ErrInvalidReorder
	}
	orderByID := map[int64]int{}
	for _, n := range next {
		orderByID[n.ID] = n.SortOrder
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	upd := fmt.Sprintf(`
UPDATE %s SET sort_order = $3, updated_at = CURRENT_TIMESTAMP, updated_by = $4
WHERE id = $1 AND %s = $2 AND deleted_at IS NULL`, table, parentCol)
	for id, so := range orderByID {
		if _, err := tx.ExecContext(ctx, upd, id, parentID, so, actorID); err != nil {
			return err
		}
	}
	return tx.Commit()
}
