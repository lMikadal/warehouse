package rbac

import "testing"

func TestWavePermissionsCountAndCodes(t *testing.T) {
	rows := WavePermissions()
	if len(rows) != 24 {
		t.Fatalf("got %d rows, want 24", len(rows))
	}
	seen := make(map[int64]struct{})
	for _, r := range rows {
		if _, ok := seen[r.ID]; ok {
			t.Fatalf("duplicate id %d", r.ID)
		}
		seen[r.ID] = struct{}{}
		wantCode := r.Module + "." + r.Type + "." + r.Action
		if r.Code != wantCode {
			t.Fatalf("code %q want %q", r.Code, wantCode)
		}
	}
}

func TestCodeForRoute(t *testing.T) {
	code, ok := CodeForRoute("PATCH", "/api/v1/system/menus/move")
	if !ok || code != "system.system_menu.update" {
		t.Fatalf("move: got %q %v", code, ok)
	}
	code, ok = CodeForRoute("GET", "/api/v1/admin/users/5")
	if !ok || code != "admin.admin_user.view" {
		t.Fatalf("user get: got %q %v", code, ok)
	}
	code, ok = CodeForRoute("PATCH", "/api/v1/system/menus/reorder")
	if !ok || code != "system.system_menu.update" {
		t.Fatalf("reorder prefix: got %q %v", code, ok)
	}
}
