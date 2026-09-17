package product

import "github.com/lMikadal/warehouse/backend/internal/tree"

func validateCategoryParent(rows []Row, rowID int64, newParentID *int64) error {
	if newParentID != nil && *newParentID == rowID {
		return ErrValidation
	}
	if newParentID != nil && tree.IsInvalidParent(rowsToNodes(rows), rowID, newParentID) {
		return ErrValidation
	}
	return nil
}

func validateCarParent(rows []Row, typeCar string, parentID *int64) error {
	switch typeCar {
	case "brand":
		if parentID != nil {
			return ErrValidation
		}
	case "model":
		if parentID == nil {
			return ErrValidation
		}
		p := findRow(rows, *parentID)
		if p == nil || p.Type != "car" || p.TypeCar == nil || *p.TypeCar != "brand" {
			return ErrValidation
		}
	case "engine":
		if parentID == nil {
			return ErrValidation
		}
		p := findRow(rows, *parentID)
		if p == nil || p.Type != "car" || p.TypeCar == nil || *p.TypeCar != "model" {
			return ErrValidation
		}
	default:
		return ErrValidation
	}
	return nil
}

func findRow(rows []Row, id int64) *Row {
	for i := range rows {
		if rows[i].ID == id {
			return &rows[i]
		}
	}
	return nil
}

func rowsToNodes(rows []Row) []tree.Node {
	out := make([]tree.Node, len(rows))
	for i, r := range rows {
		out[i] = tree.Node{ID: r.ID, ParentID: r.ParentID, SortOrder: r.SortOrder, TreePath: r.TreePath}
	}
	return out
}

func mergeNodesIntoRows(rows []Row, nodes []tree.Node) []Row {
	byID := map[int64]Row{}
	for _, r := range rows {
		byID[r.ID] = r
	}
	out := make([]Row, len(nodes))
	for i, n := range nodes {
		r := byID[n.ID]
		r.ParentID = n.ParentID
		r.SortOrder = n.SortOrder
		r.TreePath = n.TreePath
		out[i] = r
	}
	return out
}
