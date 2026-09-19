package member

import "testing"

func TestBusinessFilterKind(t *testing.T) {
	if _, ok := businessFilterKind("credits"); !ok {
		t.Fatal("credits")
	}
	if _, ok := businessFilterKind("groups"); !ok {
		t.Fatal("groups")
	}
	if _, ok := businessFilterKind("businesses"); ok {
		t.Fatal("want false")
	}
}
