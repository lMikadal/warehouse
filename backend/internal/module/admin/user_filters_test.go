package admin

import "testing"

func TestRoleDisplayName_prefersLocale(t *testing.T) {
	names := map[string]string{"th": "ไทย", "en": "English"}
	if got := roleDisplayName(names, "en"); got != "English" {
		t.Fatalf("en locale: got %q", got)
	}
	if got := roleDisplayName(names, "th"); got != "ไทย" {
		t.Fatalf("th locale: got %q", got)
	}
}
