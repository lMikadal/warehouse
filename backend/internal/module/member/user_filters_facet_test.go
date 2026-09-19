package member

import "testing"

func TestUserFilterFacet_productBrands(t *testing.T) {
	f, ok := userFilterFacet("product_brands")
	if !ok || f != "product_brands" {
		t.Fatalf("product_brands: got %q %v", f, ok)
	}
}
