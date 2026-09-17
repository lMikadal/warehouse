package product

import "testing"

func TestCategoryFilterFacet(t *testing.T) {
	if _, ok := categoryFilterFacet(""); ok {
		t.Fatal("empty facet")
	}
	if attr, ok := categoryFilterFacet("brands"); !ok || attr != "brand" {
		t.Fatalf("brands: got %q %v", attr, ok)
	}
}

func TestListFilterFacet(t *testing.T) {
	for _, f := range []string{"categories", "brands", "suppliers", "sale_channels", "warehouse_bins", "cars"} {
		if _, ok := listFilterFacet(f); !ok {
			t.Fatalf("expected ok for %q", f)
		}
	}
	if _, ok := listFilterFacet("prefixes"); ok {
		t.Fatal("prefixes not allowed on list filters")
	}
}

func TestItemBrowseFilterFacet(t *testing.T) {
	if _, ok := itemBrowseFilterFacet("suppliers"); ok {
		t.Fatal("suppliers not on item browse filters")
	}
	if _, ok := itemBrowseFilterFacet("categories"); !ok {
		t.Fatal("categories allowed")
	}
}
