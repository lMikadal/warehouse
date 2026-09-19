package member

import "testing"

func TestUserFilterFacet_productBrands(t *testing.T) {
	f, ok := userFilterFacet("product_brands")
	if !ok || f != "product_brands" {
		t.Fatalf("product_brands: got %q %v", f, ok)
	}
}

func TestUserFilterFacet_productBrandCategories(t *testing.T) {
	f, ok := userFilterFacet("product_brand_categories")
	if !ok || f != "product_brand_categories" {
		t.Fatalf("product_brand_categories: got %q %v", f, ok)
	}
}
