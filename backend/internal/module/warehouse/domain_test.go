package warehouse

import (
	"errors"
	"testing"
)

func TestValidParent(t *testing.T) {
	if !validParent("shelf", "zone") {
		t.Fatal("shelf under zone")
	}
	if validParent("shelf", "warehouse") {
		t.Fatal("shelf not under warehouse directly in allowedChildTypes")
	}
	if !validParent("bin", "rack") {
		t.Fatal("bin under rack")
	}
	if !validParent("zone", "warehouse") {
		t.Fatal("zone under warehouse")
	}
}

func TestErrZoneQuotaDistinctFromValidation(t *testing.T) {
	if errors.Is(ErrZoneQuota, ErrValidation) {
		t.Fatal("zone quota must not match generic validation")
	}
}
