package supplier

import "testing"

func TestValidateTel(t *testing.T) {
	if !validTel("02-1234567") {
		t.Fatal("expected valid tel")
	}
	if validTel("02 abc") {
		t.Fatal("expected invalid tel")
	}
}

func TestValidateBankInput(t *testing.T) {
	if validateBankInput(BankInput{}) == "" {
		t.Fatal("expected required error")
	}
	if validateBankInput(BankInput{SettingBankID: 1, Name: "a", Number: "1"}) != "" {
		t.Fatal("expected valid bank")
	}
}
