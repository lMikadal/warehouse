package system

import "strings"

// geoFilterFacetLevel maps a filters request facet to the geo level queried for lookup rows.
// pageLevel is the resource that owns the /filters route (permission scope).
func geoFilterFacetLevel(pageLevel GeoLevel, facet string) (GeoLevel, bool) {
	facet = strings.TrimSpace(strings.ToLower(facet))
	switch pageLevel {
	case GeoProvince:
		if facet == "countries" {
			return GeoCountry, true
		}
	case GeoDistrict:
		switch facet {
		case "countries":
			return GeoCountry, true
		case "provinces":
			return GeoProvince, true
		}
	case GeoSubDistrict:
		switch facet {
		case "countries":
			return GeoCountry, true
		case "provinces":
			return GeoProvince, true
		case "districts":
			return GeoDistrict, true
		}
	}
	return 0, false
}
