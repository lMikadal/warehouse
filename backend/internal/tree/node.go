package tree

// Node is the minimal fields for LTREE self-FK reorder and path rebuild.
type Node struct {
	ID        int64
	ParentID  *int64
	SortOrder int
	TreePath  string
}

func SameParent(a, b *int64) bool {
	if a == nil && b == nil {
		return true
	}
	if a == nil || b == nil {
		return false
	}
	return *a == *b
}

func Find(nodes []Node, id int64) *Node {
	for i := range nodes {
		if nodes[i].ID == id {
			return &nodes[i]
		}
	}
	return nil
}

func MaxSortUnderParent(nodes []Node, parentID *int64, excludeID int64) int {
	max := 0
	for _, r := range nodes {
		if excludeID != 0 && r.ID == excludeID {
			continue
		}
		if SameParent(r.ParentID, parentID) && r.SortOrder > max {
			max = r.SortOrder
		}
	}
	return max
}

func sortSiblings(rows []Node) {
	for i := 0; i < len(rows); i++ {
		for j := i + 1; j < len(rows); j++ {
			if rows[j].SortOrder < rows[i].SortOrder || (rows[j].SortOrder == rows[i].SortOrder && rows[j].ID < rows[i].ID) {
				rows[i], rows[j] = rows[j], rows[i]
			}
		}
	}
}

func siblingsUnderParent(nodes []Node, parentID *int64, excludeID int64) []Node {
	var out []Node
	for _, r := range nodes {
		if excludeID != 0 && r.ID == excludeID {
			continue
		}
		if SameParent(r.ParentID, parentID) {
			out = append(out, r)
		}
	}
	sortSiblings(out)
	return out
}
