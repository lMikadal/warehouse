package rbac

// PermPage is one API resource with six CRUD-style actions in system_permission.
type PermPage struct {
	Module   string
	Type     string
	Resource string
	StartID  int64
}

// WavePermPages is the RBAC wave catalog (24 rows). Keep in sync with seeds/init/02–05_*.sql.
var WavePermPages = []PermPage{
	{Module: "system", Type: "system_menu", Resource: "/api/v1/system/menus", StartID: 1},
	{Module: "system", Type: "system_permission", Resource: "/api/v1/system/permissions", StartID: 7},
	{Module: "admin", Type: "admin_user", Resource: "/api/v1/admin/users", StartID: 13},
	{Module: "admin", Type: "admin_role", Resource: "/api/v1/admin/roles", StartID: 19},
}

// CatalogPermPages are seeded in 06_system_permission_catalog.sql (routing only; no StartID).
var CatalogPermPages = []PermPage{
	{Module: "admin", Type: "admin_language", Resource: "/api/v1/system/languages"},
	{Module: "admin", Type: "system_country", Resource: "/api/v1/system/countries"},
	{Module: "admin", Type: "system_province", Resource: "/api/v1/system/provinces"},
	{Module: "admin", Type: "system_district", Resource: "/api/v1/system/districts"},
	{Module: "admin", Type: "system_sub_district", Resource: "/api/v1/system/sub-districts"},
	{Module: "setting", Type: "setting_bank", Resource: "/api/v1/setting/banks"},
	{Module: "setting", Type: "setting_vat", Resource: "/api/v1/setting/vat"},
	{Module: "setting", Type: "setting_payment_method", Resource: "/api/v1/setting/payment-methods"},
	{Module: "setting", Type: "setting_sale_channel", Resource: "/api/v1/setting/sale-channels"},
	{Module: "setting", Type: "setting_code", Resource: "/api/v1/setting/codes"},
	{Module: "setting", Type: "setting_claim_reason", Resource: "/api/v1/setting/claim-reasons"},
	{Module: "setting", Type: "setting_prefix", Resource: "/api/v1/setting/prefixes"},
	{Module: "supplier", Type: "supplier_user", Resource: "/api/v1/supplier/users"},
	{Module: "location", Type: "location_location", Resource: "/api/v1/location/locations"},
}

func routePermPages() []PermPage {
	return append(append([]PermPage{}, WavePermPages...), CatalogPermPages...)
}

var actions = []struct {
	Action string
	Method string
	Active bool
}{
	{"view", "GET", true},
	{"create", "POST", true},
	{"update", "PATCH", true},
	{"delete", "DELETE", true},
	{"import", "POST", false},
	{"export", "GET", false},
}

// PermissionRow describes one seeded system_permission row.
type PermissionRow struct {
	ID       int64
	Code     string
	Module   string
	Type     string
	Action   string
	Resource string
	Method   string
	IsActive bool
}

// WavePermissions expands WavePermPages into 24 permission rows.
func WavePermissions() []PermissionRow {
	var out []PermissionRow
	for _, page := range WavePermPages {
		id := page.StartID
		for _, a := range actions {
			out = append(out, PermissionRow{
				ID:       id,
				Code:     page.Module + "." + page.Type + "." + a.Action,
				Module:   page.Module,
				Type:     page.Type,
				Action:   a.Action,
				Resource: page.Resource,
				Method:   a.Method,
				IsActive: a.Active,
			})
			id++
		}
	}
	return out
}

// CodeForRoute returns the permission code for an HTTP method on a wave resource path.
func CodeForRoute(method, path string) (string, bool) {
	for _, page := range routePermPages() {
		if !matchResource(path, page.Resource) {
			continue
		}
		action := methodToAction(method, path)
		if action == "" {
			return "", false
		}
		return page.Module + "." + page.Type + "." + action, true
	}
	return "", false
}

func matchResource(path, resource string) bool {
	if path == resource {
		return true
	}
	prefix := resource + "/"
	return len(path) > len(prefix) && path[:len(prefix)] == prefix
}

func methodToAction(method, path string) string {
	switch method {
	case "GET":
		return "view"
	case "POST":
		return "create"
	case "PATCH", "PUT":
		return "update"
	case "DELETE":
		return "delete"
	default:
		_ = path
		return ""
	}
}
