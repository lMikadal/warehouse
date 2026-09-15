package system

import "testing"

func TestGeoFilterFacetLevel(t *testing.T) {
	if lvl, ok := geoFilterFacetLevel(GeoProvince, "countries"); !ok || lvl != GeoCountry {
		t.Fatalf("province page countries facet: %v %v", lvl, ok)
	}
	if _, ok := geoFilterFacetLevel(GeoProvince, "provinces"); ok {
		t.Fatal("province page should not allow provinces facet")
	}
	if lvl, ok := geoFilterFacetLevel(GeoDistrict, "provinces"); !ok || lvl != GeoProvince {
		t.Fatalf("district page provinces facet: %v %v", lvl, ok)
	}
	if lvl, ok := geoFilterFacetLevel(GeoSubDistrict, "districts"); !ok || lvl != GeoDistrict {
		t.Fatalf("sub-district page districts facet: %v %v", lvl, ok)
	}
}
