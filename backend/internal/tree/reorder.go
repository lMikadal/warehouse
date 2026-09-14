package tree

import "fmt"

// ReorderSiblings moves dragID to targetID's position among nodes with the same ParentID as drag (before removal).
// Sort orders are rewritten as (index+1)*10 for the affected sibling group.
func ReorderSiblings(nodes []Node, dragID, targetID int64) ([]Node, error) {
	dragRow := Find(nodes, dragID)
	targetRow := Find(nodes, targetID)
	if dragRow == nil || targetRow == nil || dragID == targetID {
		return nil, fmt.Errorf("invalid reorder")
	}
	parentID := dragRow.ParentID
	if !SameParent(parentID, targetRow.ParentID) {
		return nil, fmt.Errorf("sibling scope mismatch")
	}
	sibs := siblingsUnderParent(nodes, parentID, 0)
	fromIdx, toIdx := -1, -1
	for i, r := range sibs {
		if r.ID == dragID {
			fromIdx = i
		}
		if r.ID == targetID {
			toIdx = i
		}
	}
	if fromIdx < 0 || toIdx < 0 {
		return nil, fmt.Errorf("invalid reorder")
	}
	reordered := append([]Node{}, sibs...)
	reordered = append(reordered[:fromIdx], reordered[fromIdx+1:]...)
	// Match design crud-list: insert at drop index in the post-removal slice (splice absTo after absFrom).
	insertAt := toIdx
	if insertAt > len(reordered) {
		insertAt = len(reordered)
	}
	reordered = append(reordered[:insertAt], append([]Node{*dragRow}, reordered[insertAt:]...)...)

	orderByID := map[int64]int{}
	for i, r := range reordered {
		orderByID[r.ID] = (i + 1) * 10
	}
	next := make([]Node, len(nodes))
	for i, r := range nodes {
		nr := r
		if so, ok := orderByID[r.ID]; ok && nr.SortOrder != so {
			nr.SortOrder = so
		}
		next[i] = nr
	}
	return next, nil
}
