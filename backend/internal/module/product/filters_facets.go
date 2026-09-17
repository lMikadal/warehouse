package product

import "strings"

func categoryFilterFacet(facet string) (string, bool) {
	switch strings.TrimSpace(strings.ToLower(facet)) {
	case "brands":
		return "brand", true
	default:
		return "", false
	}
}

func listFilterFacet(facet string) (string, bool) {
	switch strings.TrimSpace(strings.ToLower(facet)) {
	case "categories", "brands", "suppliers", "sale_channels", "warehouse_bins", "cars":
		return strings.TrimSpace(strings.ToLower(facet)), true
	default:
		return "", false
	}
}

func itemBrowseFilterFacet(facet string) (string, bool) {
	switch strings.TrimSpace(strings.ToLower(facet)) {
	case "categories", "brands":
		return strings.TrimSpace(strings.ToLower(facet)), true
	default:
		return "", false
	}
}
