package member

import "testing"

func TestLocaleHistoryTitle(t *testing.T) {
	names := map[string]string{"th": "สร้างสมาชิก", "en": "Member created"}
	if got := localeHistoryTitle(names, "en"); got != "Member created" {
		t.Fatalf("en: got %q", got)
	}
	if got := localeHistoryTitle(names, "th"); got != "สร้างสมาชิก" {
		t.Fatalf("th: got %q", got)
	}
	if got := localeHistoryTitle(map[string]string{"th": "ไทย"}, "en"); got != "ไทย" {
		t.Fatalf("fallback th: got %q", got)
	}
}

func TestMemberCreatedDescriptions(t *testing.T) {
	d := memberCreatedDescriptions(" Somchai ")
	if d["th"] != "เพิ่มรายชื่อ Somchai" || d["en"] != "Added Somchai" {
		t.Fatalf("unexpected descriptions: %#v", d)
	}
}

func TestHistoryTitlesValidate(t *testing.T) {
	for _, titles := range []map[string]string{
		historyTitleMemberCreated,
		historyTitleFileUploaded,
		historyTitleDiscountAdded,
	} {
		if err := validateNames(titles); err != nil {
			t.Fatalf("validateNames: %v", err)
		}
	}
}
