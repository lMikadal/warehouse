package system

import "testing"

func TestSortMenuTree_DFSOrder(t *testing.T) {
	pid1 := int64(1)
	rows := []MenuRow{
		{ID: 1, SortOrder: 100},
		{ID: 2, ParentID: &pid1, SortOrder: 200},
		{ID: 3, ParentID: &pid1, SortOrder: 100},
	}
	got := sortMenuTree(rows)
	if len(got) != 3 {
		t.Fatalf("len=%d", len(got))
	}
	if got[0].ID != 1 || got[1].ID != 3 || got[2].ID != 2 {
		t.Fatalf("order=%v,%v,%v", got[0].ID, got[1].ID, got[2].ID)
	}
}
