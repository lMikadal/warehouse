package system

import (
	"strings"
	"testing"
)

func TestGeoListParentSelectLocalePlaceholder(t *testing.T) {
	list := geoListParentSelect(GeoProvince, 1)
	if !strings.Contains(list.labelSQL, "locale = $1") {
		t.Fatalf("list labelSQL want locale=$1, got %q", list.labelSQL)
	}
	get := geoListParentSelect(GeoProvince, 2)
	if !strings.Contains(get.labelSQL, "locale = $2") {
		t.Fatalf("get labelSQL want locale=$2, got %q", get.labelSQL)
	}
}

func TestGeoDefaultListOrder(t *testing.T) {
	country := geoDefaultListOrder(GeoCountry)
	if strings.Contains(country, "system_country") {
		t.Fatalf("country default should not reference parent subquery, got %q", country)
	}
	if !strings.Contains(country, "t.sort_order ASC") {
		t.Fatalf("country default missing row sort_order, got %q", country)
	}

	province := geoDefaultListOrder(GeoProvince)
	if !strings.Contains(province, "system_country") || !strings.Contains(province, "c.sort_order") {
		t.Fatalf("province default want parent country sort_order, got %q", province)
	}
	if !strings.Contains(province, "t.system_country_id ASC") {
		t.Fatalf("province default want country FK tiebreaker, got %q", province)
	}

	district := geoDefaultListOrder(GeoDistrict)
	if !strings.Contains(district, "system_province") || !strings.Contains(district, "p.sort_order") {
		t.Fatalf("district default want parent province sort_order, got %q", district)
	}
	if !strings.Contains(district, "t.system_province_id ASC") {
		t.Fatalf("district default want province FK tiebreaker, got %q", district)
	}

	sub := geoDefaultListOrder(GeoSubDistrict)
	if !strings.Contains(sub, "system_district") || !strings.Contains(sub, "d.sort_order") {
		t.Fatalf("sub-district default want parent district sort_order, got %q", sub)
	}
	if !strings.Contains(sub, "t.system_district_id ASC") {
		t.Fatalf("sub-district default want district FK tiebreaker, got %q", sub)
	}
}
