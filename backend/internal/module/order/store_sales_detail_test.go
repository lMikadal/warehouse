package order

import "testing"

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
