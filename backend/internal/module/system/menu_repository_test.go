package system

import (
	"testing"
	"time"
)

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

func TestFilterMenuTreePreservingAncestors_Search(t *testing.T) {
	pid1 := int64(1)
	rows := sortMenuTree([]MenuRow{
		{ID: 1, Module: "admin", Names: map[string]string{"th": "Root", "en": "Root"}},
		{ID: 2, ParentID: &pid1, Module: "child", Names: map[string]string{"th": "MatchMe", "en": "MatchMe"}},
	})
	got := filterMenuTreePreservingAncestors(rows, func(row MenuRow) bool {
		return menuRowMatchesSearch(row, "matchme")
	})
	if len(got) != 2 {
		t.Fatalf("len=%d want 2 (child + ancestor)", len(got))
	}
	if got[0].ID != 1 || got[1].ID != 2 {
		t.Fatalf("ids=%d,%d", got[0].ID, got[1].ID)
	}
}

func TestFilterMenuTreePreservingAncestors_Status(t *testing.T) {
	pid1 := int64(1)
	rows := sortMenuTree([]MenuRow{
		{ID: 1, IsActive: true},
		{ID: 2, ParentID: &pid1, IsActive: false},
	})
	active := true
	got := filterMenuTreePreservingAncestors(rows, func(row MenuRow) bool {
		return rowMatchesListFilter(row, MenuListFilter{IsActive: &active})
	})
	if len(got) != 1 || got[0].ID != 1 {
		t.Fatalf("got=%v", idsOf(got))
	}
}

func TestSortMenuRowsByColumn_ModuleDesc(t *testing.T) {
	now := time.Now()
	rows := []MenuRow{
		{ID: 1, Module: "alpha", CreatedAt: now},
		{ID: 2, Module: "zeta", CreatedAt: now},
	}
	got := sortMenuRowsByColumn(rows, "module", "desc", "th")
	if got[0].Module != "zeta" || got[1].Module != "alpha" {
		t.Fatalf("order=%s,%s", got[0].Module, got[1].Module)
	}
}

func idsOf(rows []MenuRow) []int64 {
	out := make([]int64, len(rows))
	for i, r := range rows {
		out[i] = r.ID
	}
	return out
}
