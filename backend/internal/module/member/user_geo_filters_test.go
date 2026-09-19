package member

import (
	"testing"

	"github.com/lMikadal/warehouse/backend/internal/module/system"
)

func TestMemberUserGeoFilterLevel(t *testing.T) {
	lvl, ok := memberUserGeoFilterLevel("provinces")
	if !ok || lvl != system.GeoProvince {
		t.Fatalf("provinces: %v %v", lvl, ok)
	}
	lvl, ok = memberUserGeoFilterLevel("districts")
	if !ok || lvl != system.GeoDistrict {
		t.Fatalf("districts: %v %v", lvl, ok)
	}
	lvl, ok = memberUserGeoFilterLevel("sub_districts")
	if !ok || lvl != system.GeoSubDistrict {
		t.Fatalf("sub_districts: %v %v", lvl, ok)
	}
	if _, ok := memberUserGeoFilterLevel("countries"); ok {
		t.Fatal("countries should not be a member user geo facet")
	}
}

func TestUserFilterFacet_geo(t *testing.T) {
	for _, facet := range []string{"provinces", "districts", "sub_districts"} {
		f, ok := userFilterFacet(facet)
		if !ok || f != facet {
			t.Fatalf("%s: got %q %v", facet, f, ok)
		}
	}
}
