package member

import "testing"

func TestSettingRelationFilterLabel(t *testing.T) {
	got := settingRelationFilterLabel("Biz", "Credit", "Group")
	if got != "Biz · Credit · Group" {
		t.Fatalf("label: got %q", got)
	}
}

func TestSettingRelationBusinessTitle(t *testing.T) {
	if got := settingRelationBusinessTitle("Biz", "Grp"); got != "BizGrp" {
		t.Fatalf("title concat: got %q", got)
	}
	if got := settingRelationBusinessTitle("Biz", "Biz"); got != "Biz" {
		t.Fatalf("title same: got %q", got)
	}
}

func TestTierFilterFacet(t *testing.T) {
	if !tierFilterFacet("setting_relations") {
		t.Fatal("want true")
	}
	if tierFilterFacet("businesses") {
		t.Fatal("want false")
	}
}
