package member

import "testing"

func TestValidateNames(t *testing.T) {
	if err := validateNames(map[string]string{"th": "ไทย", "en": "English"}); err != nil {
		t.Fatal(err)
	}
	if err := validateNames(map[string]string{"th": "", "en": "English"}); err != ErrValidation {
		t.Fatalf("expected validation error, got %v", err)
	}
}
