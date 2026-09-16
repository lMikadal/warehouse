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
	code, ok = CodeForRoute("GET", "/api/v1/system/languages/3")
	if !ok || code != "admin.admin_language.view" {
		t.Fatalf("language get: got %q %v", code, ok)
	}
	code, ok = CodeForRoute("PATCH", "/api/v1/system/languages/reorder")
	if !ok || code != "admin.admin_language.update" {
		t.Fatalf("language reorder: got %q %v", code, ok)
	}
	code, ok = CodeForRoute("GET", "/api/v1/system/menus/permission-matrix")
	if !ok || code != "system.system_menu.view" {
		t.Fatalf("permission matrix: got %q %v", code, ok)
	}
	code, ok = CodeForRoute("GET", "/api/v1/setting/banks/1")
	if !ok || code != "setting.setting_bank.view" {
		t.Fatalf("setting bank get: got %q %v", code, ok)
	}
	code, ok = CodeForRoute("PATCH", "/api/v1/setting/banks/reorder")
	if !ok || code != "setting.setting_bank.update" {
		t.Fatalf("setting bank reorder: got %q %v", code, ok)
	}
	code, ok = CodeForRoute("PATCH", "/api/v1/setting/vat/1")
	if !ok || code != "setting.setting_vat.update" {
		t.Fatalf("setting vat patch: got %q %v", code, ok)
	}
}
