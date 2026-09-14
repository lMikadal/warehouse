package system

import "github.com/lMikadal/warehouse/backend/internal/tree"

func menuToNodes(rows []MenuRow) []tree.Node {
	out := make([]tree.Node, len(rows))
	for i, r := range rows {
		out[i] = tree.Node{ID: r.ID, ParentID: r.ParentID, SortOrder: r.SortOrder, TreePath: r.TreePath}
	}
	return out
}

func mergeMenuNodes(orig []MenuRow, nodes []tree.Node) []MenuRow {
	byID := make(map[int64]MenuRow, len(orig))
	for _, r := range orig {
		byID[r.ID] = r
	}
	out := make([]MenuRow, len(nodes))
	for i, n := range nodes {
		r := byID[n.ID]
		r.ParentID = n.ParentID
		r.SortOrder = n.SortOrder
		r.TreePath = n.TreePath
		out[i] = r
	}
	return out
}

func findMenuRow(rows []MenuRow, id int64) *MenuRow {
	for i := range rows {
		if rows[i].ID == id {
			return &rows[i]
		}
	}
	return nil
}

func recomputeAllTreePaths(rows []MenuRow) ([]MenuRow, error) {
	nodes, err := tree.RecomputePaths(menuToNodes(rows))
	if err != nil {
		return nil, err
	}
	return mergeMenuNodes(rows, nodes), nil
}

func maxSortUnderParent(rows []MenuRow, parentID *int64, excludeID int64) int {
	return tree.MaxSortUnderParent(menuToNodes(rows), parentID, excludeID)
}

func sameParent(a, b *int64) bool {
	return tree.SameParent(a, b)
}

func isInvalidMenuParent(rows []MenuRow, menuID int64, newParentID *int64) bool {
	return tree.IsInvalidParent(menuToNodes(rows), menuID, newParentID)
}

func applyTreeDrop(rows []MenuRow, dragID, targetID int64, zone string) ([]MenuRow, error) {
	nodes, err := tree.ApplyDrop(menuToNodes(rows), dragID, targetID, zone)
	if err != nil {
		return nil, err
	}
	return mergeMenuNodes(rows, nodes), nil
}

func subtreeIDs(rows []MenuRow, rootID int64) []int64 {
	return tree.SubtreeIDs(menuToNodes(rows), rootID)
}
