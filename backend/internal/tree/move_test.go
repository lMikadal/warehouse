package tree

import "testing"

func TestApplyDrop_siblingAfter(t *testing.T) {
	pid := int64(1)
	rows := []Node{
		{ID: 1, TreePath: "n1", SortOrder: 10},
		{ID: 2, ParentID: &pid, TreePath: "n1.n2", SortOrder: 10},
		{ID: 3, ParentID: &pid, TreePath: "n1.n3", SortOrder: 20},
	}
	next, err := ApplyDrop(rows, 2, 3, "after")
	if err != nil {
		t.Fatal(err)
	}
	r2 := Find(next, 2)
	r3 := Find(next, 3)
	if r2 == nil || r3 == nil || r2.SortOrder <= r3.SortOrder {
		t.Fatalf("expected drag 2 after 3, sort orders %d vs %d", r2.SortOrder, r3.SortOrder)
	}
}

func TestReorderSiblings_flat(t *testing.T) {
	rows := []Node{
		{ID: 1, SortOrder: 10},
		{ID: 2, SortOrder: 20},
		{ID: 3, SortOrder: 30},
	}
	next, err := ReorderSiblings(rows, 1, 3)
	if err != nil {
		t.Fatal(err)
	}
	r1 := Find(next, 1)
	r3 := Find(next, 3)
	if r1 == nil || r3 == nil || r1.SortOrder <= r3.SortOrder {
		t.Fatalf("want id 1 after 3 in order, got sort %d vs %d", r1.SortOrder, r3.SortOrder)
	}
}
