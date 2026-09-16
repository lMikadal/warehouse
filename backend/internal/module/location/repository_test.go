package location

import "testing"

func TestValidateNames(t *testing.T) {
	if err := validateNames(map[string]string{"th": "a", "en": "b"}); err != nil {
		t.Fatal(err)
	}
	if err := validateNames(map[string]string{"th": "", "en": "b"}); err != ErrValidation {
		t.Fatalf("want validation, got %v", err)
	}
}
