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

type stubPermissionChecker struct {
	allowed map[string]bool
}

func (s stubPermissionChecker) HasPermission(_ context.Context, _ int64, code string) (bool, error) {
	return s.allowed[code], nil
}

func TestFilterNavNodes_superadminOnlyGroupShowsChildWithView(t *testing.T) {
	path := "/admin/system/menu"
	nodes := []navTreeNode{
		{row: MenuRow{ID: 2, IsSuperadminOnly: true}, children: []navTreeNode{
			{row: MenuRow{ID: 3, IsSuperadminOnly: true, Path: &path}},
		}},
	}
	roleID := int64(6)
	p := pkgauth.Principal{UserType: "staff", RoleID: &roleID}
	checker := stubPermissionChecker{allowed: map[string]bool{
		"system.system_menu.view": true,
	}}
	viewCodes := map[int64]string{3: "system.system_menu.view"}
	out := filterNavNodes(context.Background(), checker, p, nodes, viewCodes)
	if len(out) != 1 || len(out[0].children) != 1 {
		t.Fatalf("expected admin group + menu leaf for view permission, got %+v", out)
	}
}

func TestToNavNodes_dialogIncludesPath(t *testing.T) {
	viewPath := "/admin/warehouse/list/view"
	nodes := []navTreeNode{
		{row: MenuRow{ID: 27, Path: &viewPath, IsDialog: true}},
	}
	out := toNavNodes(nodes)
	if len(out) != 1 || out[0].Path == nil {
		t.Fatalf("expected path on dialog nav node, got %+v", out)
	}
	if *out[0].Path != viewPath {
		t.Fatalf("path = %q, want %q", *out[0].Path, viewPath)
	}
	if !out[0].IsDialog {
		t.Fatal("expected is_dialog true")
	}
}

func strPtr(s string) *string { return &s }
