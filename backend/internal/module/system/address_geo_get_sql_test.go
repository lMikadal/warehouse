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
