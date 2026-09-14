package system

import "testing"

func TestApplyTreeDrop_siblingAfter(t *testing.T) {
	pid := int64(1)
	rows := []MenuRow{
		{ID: 1, TreePath: "n1", SortOrder: 10},
		{ID: 2, ParentID: &pid, TreePath: "n1.n2", SortOrder: 10},
		{ID: 3, ParentID: &pid, TreePath: "n1.n3", SortOrder: 20},
	}
	next, err := applyTreeDrop(rows, 2, 3, "after")
	if err != nil {
		t.Fatal(err)
	}
	r2 := findMenuRow(next, 2)
	r3 := findMenuRow(next, 3)
	if r2 == nil || r3 == nil || r2.SortOrder <= r3.SortOrder {
		t.Fatalf("expected drag 2 after 3, sort orders %d vs %d", r2.SortOrder, r3.SortOrder)
	}
}
