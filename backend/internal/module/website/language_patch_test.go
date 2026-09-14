package website

import "testing"

func TestResolveLanguageUpdate_DeactivateDefaultConflict(t *testing.T) {
	cur := LanguageRow{IsActive: true, IsDefault: true}
	active := false
	patch := LanguagePatch{IsActive: &active}
	_, _, _, _, err := resolveLanguageUpdate(cur, patch)
	if err != ErrDeactivateDefault {
		t.Fatalf("got %v want ErrDeactivateDefault", err)
	}
}

func TestResolveLanguageUpdate_SetDefaultForcesActive(t *testing.T) {
	cur := LanguageRow{IsActive: false, IsDefault: false}
	def := true
	patch := LanguagePatch{IsDefault: &def}
	_, _, active, isDefault, err := resolveLanguageUpdate(cur, patch)
	if err != nil {
		t.Fatal(err)
	}
	if !active || !isDefault {
		t.Fatalf("active=%v default=%v", active, isDefault)
	}
}
