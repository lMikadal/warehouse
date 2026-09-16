package supplier

import (
	"testing"

	"github.com/lMikadal/warehouse/backend/internal/tree"
)

func TestReorderBanksSiblingOrder(t *testing.T) {
	nodes := []tree.Node{
		{ID: 10, SortOrder: 100},
		{ID: 20, SortOrder: 200},
	}
	next, err := tree.ReorderSiblings(nodes, 10, 20)
	if err != nil {
		t.Fatal(err)
	}
	r10 := tree.Find(next, 10)
	r20 := tree.Find(next, 20)
	if r10 == nil || r20 == nil || r10.SortOrder <= r20.SortOrder {
		t.Fatalf("want id 10 after 20, sort %d vs %d", r10.SortOrder, r20.SortOrder)
	}
}

func TestReorderContactsSiblingOrder(t *testing.T) {
	nodes := []tree.Node{
		{ID: 10, SortOrder: 100},
		{ID: 20, SortOrder: 200},
		{ID: 30, SortOrder: 300},
	}
	next, err := tree.ReorderSiblings(nodes, 10, 30)
	if err != nil {
		t.Fatal(err)
	}
	r10 := tree.Find(next, 10)
	r30 := tree.Find(next, 30)
	if r10 == nil || r30 == nil || r10.SortOrder <= r30.SortOrder {
		t.Fatalf("want id 10 after 30, sort %d vs %d", r10.SortOrder, r30.SortOrder)
	}
	_, err = tree.ReorderSiblings(nodes, 99, 20)
	if err == nil {
		t.Fatal("expected error for unknown drag id")
	}
}
