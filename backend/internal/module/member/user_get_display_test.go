package member

import (
	"database/sql"
	"testing"
)

func TestPutNullString(t *testing.T) {
	m := map[string]any{}
	putNullString(m, "website_province_name", sql.NullString{String: "Bangkok", Valid: true})
	if m["website_province_name"] != "Bangkok" {
		t.Fatalf("expected name, got %v", m["website_province_name"])
	}
	putNullString(m, "website_district_name", sql.NullString{})
	if _, ok := m["website_district_name"]; ok {
		t.Fatal("expected absent key for invalid null string")
	}
	putNullString(m, "website_sub_district_name", sql.NullString{String: "  ", Valid: true})
	if _, ok := m["website_sub_district_name"]; ok {
		t.Fatal("expected whitespace-only name to be omitted")
	}
}

func TestUserDetailLocale(t *testing.T) {
	if userDetailLocale("") != "th" {
		t.Fatal("expected th fallback")
	}
	if userDetailLocale("en") != "en" {
		t.Fatal("expected en")
	}
}
