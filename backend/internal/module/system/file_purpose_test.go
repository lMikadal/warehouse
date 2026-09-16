package system

import "testing"

func TestValidPurpose(t *testing.T) {
	if !ValidPurpose("setting_bank_logo") {
		t.Fatal("expected setting_bank_logo valid")
	}
	if ValidPurpose("not_a_purpose") {
		t.Fatal("expected unknown purpose invalid")
	}
}
