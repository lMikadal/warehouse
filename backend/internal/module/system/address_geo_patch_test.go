package system

import "testing"

func TestValidateGeoNames(t *testing.T) {
	if err := validateGeoNames(map[string]string{"th": "ไทย", "en": "Thai"}); err != nil {
		t.Fatal(err)
	}
	if err := validateGeoNames(map[string]string{"th": "", "en": "x"}); err != ErrGeoValidation {
		t.Fatalf("got %v", err)
	}
}

func TestValidateGeoParent_ProvinceRequiresCountry(t *testing.T) {
	err := validateGeoParent(GeoProvince, GeoCreateInput{Names: map[string]string{"th": "a", "en": "b"}})
	if err != ErrGeoValidation {
		t.Fatalf("got %v", err)
	}
}
