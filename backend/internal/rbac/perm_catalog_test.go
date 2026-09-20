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
	code, ok = CodeForRoute("GET", "/api/v1/location/locations/1")
	if !ok || code != "location.location_location.view" {
		t.Fatalf("location get: got %q %v", code, ok)
	}
	code, ok = CodeForRoute("PATCH", "/api/v1/warehouse/lists/move")
	if !ok || code != "warehouse.warehouse_list.update" {
		t.Fatalf("warehouse move: got %q %v", code, ok)
	}
	code, ok = CodeForRoute("GET", "/api/v1/member/tiers")
	if !ok || code != "member.member_tier.view" {
		t.Fatalf("member tier list: got %q %v", code, ok)
	}
	code, ok = CodeForRoute("GET", "/api/v1/member/tiers/stats")
	if !ok || code != "member.member_tier.view" {
		t.Fatalf("member tier stats: got %q %v", code, ok)
	}
	code, ok = CodeForRoute("PATCH", "/api/v1/member/tiers/reorder")
	if !ok || code != "member.member_tier.update" {
		t.Fatalf("member tier reorder: got %q %v", code, ok)
	}
	code, ok = CodeForRoute("GET", "/api/v1/member/tiers/filters")
	if !ok || code != "member.member_tier.view" {
		t.Fatalf("member tier filters: got %q %v", code, ok)
	}
	code, ok = CodeForRoute("GET", "/api/v1/member/settings/businesses/filters")
	if !ok || code != "member.member_setting_business.view" {
		t.Fatalf("member business filters: got %q %v", code, ok)
	}
	code, ok = CodeForRoute("GET", "/api/v1/member/users/stats")
	if !ok || code != "member.member_user.view" {
		t.Fatalf("member user stats: got %q %v", code, ok)
	}
	code, ok = CodeForRoute("GET", "/api/v1/member/users/filters")
	if !ok || code != "member.member_user.view" {
		t.Fatalf("member user filters: got %q %v", code, ok)
	}
	code, ok = CodeForRoute("GET", "/api/v1/order/compares/tree")
	if !ok || code != "order.order_compare.view" {
		t.Fatalf("order compare tree: got %q %v", code, ok)
	}
	code, ok = CodeForRoute("GET", "/api/v1/order/compares/rules")
	if !ok || code != "order.order_compare.view" {
		t.Fatalf("order compare rules: got %q %v", code, ok)
	}
	code, ok = CodeForRoute("PUT", "/api/v1/order/compares/rules")
	if !ok || code != "order.order_compare.update" {
		t.Fatalf("order compare put rules: got %q %v", code, ok)
	}
	code, ok = CodeForRoute("GET", "/api/v1/order/compares/export")
	if !ok || code != "order.order_compare.view" {
		t.Fatalf("order compare export: got %q %v", code, ok)
	}
	code, ok = CodeForRoute("POST", "/api/v1/order/compares/import")
	if !ok || code != "order.order_compare.update" {
		t.Fatalf("order compare import: got %q %v", code, ok)
	}
	code, ok = CodeForRoute("GET", "/api/v1/order/purchases")
	if !ok || code != "order.order_purchase.view" {
		t.Fatalf("order purchase list: got %q %v", code, ok)
	}
	code, ok = CodeForRoute("GET", "/api/v1/order/store-sales")
	if !ok || code != "order.order_store.view" {
		t.Fatalf("order store list: got %q %v", code, ok)
	}
	code, ok = CodeForRoute("GET", "/api/v1/order/store-sales/count")
	if !ok || code != "order.order_store.view" {
		t.Fatalf("order store count: got %q %v", code, ok)
	}
	code, ok = CodeForRoute("GET", "/api/v1/order/store-sales/filters")
	if !ok || code != "order.order_store.view" {
		t.Fatalf("order store filters: got %q %v", code, ok)
	}
}
