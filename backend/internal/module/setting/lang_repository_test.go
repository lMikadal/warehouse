package setting

import "testing"

func TestValidateNames(t *testing.T) {
	if err := validateNames(map[string]string{"th": "a", "en": "b"}); err != nil {
		t.Fatal(err)
	}
	if err := validateNames(map[string]string{"th": "", "en": "b"}); err != ErrValidation {
		t.Fatalf("want validation, got %v", err)
	}
}

func TestLangValidateCreateClaimReason(t *testing.T) {
	if err := langValidateCreate(LangClaimReason, LangCreateInput{}); err != ErrValidation {
		t.Fatalf("want validation when no claim/return flags")
	}
	if err := langValidateCreate(LangClaimReason, LangCreateInput{IsClaim: true}); err != nil {
		t.Fatal(err)
	}
}
