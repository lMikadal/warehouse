package system

import (
	"context"
	"testing"

	pkgauth "github.com/lMikadal/warehouse/backend/internal/auth"
)

func TestFilterNavNodes_superadminUnfiltered(t *testing.T) {
	nodes := []navTreeNode{
		{row: MenuRow{ID: 2, IsSuperadminOnly: true}, children: []navTreeNode{
			{row: MenuRow{ID: 3, Path: strPtr("/admin/system/menu")}},
		}},
	}
	p := pkgauth.Principal{UserType: "superadmin"}
	out := filterNavNodes(context.Background(), nil, p, nodes, map[int64]string{})
	if len(out) != 1 || len(out[0].children) != 1 {
		t.Fatalf("superadmin should keep tree: %+v", out)
	}
}

func TestFilterNavNodes_hidesLeafWithoutViewJunction(t *testing.T) {
	path := "/admin/setting/bank"
	nodes := []navTreeNode{
		{row: MenuRow{ID: 14}, children: []navTreeNode{
			{row: MenuRow{ID: 15, Path: &path}},
		}},
	}
	roleID := int64(2)
	p := pkgauth.Principal{UserType: "staff", RoleID: &roleID}
	out := filterNavNodes(context.Background(), pkgauth.NewRBAC(nil), p, nodes, map[int64]string{})
	if len(out) != 0 {
		t.Fatalf("expected empty tree without view junction, got %d roots", len(out))
	}
}

func TestMenuViewAllowed_requiresJunctionCode(t *testing.T) {
	roleID := int64(2)
	p := pkgauth.Principal{UserType: "staff", RoleID: &roleID}
	if menuViewAllowed(context.Background(), pkgauth.NewRBAC(nil), p, 12, map[int64]string{}) {
		t.Fatal("missing junction should deny")
	}
}

func strPtr(s string) *string { return &s }
