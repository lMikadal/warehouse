package order

import "testing"

func TestSplitIndexFromFamilySKU(t *testing.T) {
	base := "PJB-202609-00001"
	cases := []struct {
		sku  string
		want int
	}{
		{base, 0},
		{base + "-01", 1},
		{base + "-02", 2},
		{"PJB-202609-00002-01", 0},
	}
	for _, tc := range cases {
		if got := splitIndexFromFamilySKU(tc.sku, base); got != tc.want {
			t.Fatalf("splitIndexFromFamilySKU(%q): got %d want %d", tc.sku, got, tc.want)
		}
	}
	if got := splitIndexFromFamilySKU(base+"-01", base); got != 1 {
		t.Fatalf("expected 1")
	}
	max := 0
	for _, sku := range []string{base + "-01", base + "-02"} {
		if n := splitIndexFromFamilySKU(sku, base); n > max {
			max = n
		}
	}
	if formatLinkedSKU(base, max+1) != base+"-03" {
		t.Fatalf("next sku after -01,-02 should be -03")
	}
}

func TestCompareDetailFromJSON(t *testing.T) {
	if got := compareDetailFromJSON(`"Test"`); got != "Test" {
		t.Fatalf("quoted json string: got %q", got)
	}
	if got := compareDetailFromJSON("plain"); got != "plain" {
		t.Fatalf("plain: got %q", got)
	}
	if got := compareDetailFromJSON(""); got != "" {
		t.Fatalf("empty: got %q", got)
	}
}
