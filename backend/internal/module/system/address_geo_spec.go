package system

// GeoLevel is one row in the system address hierarchy (country → sub-district).
type GeoLevel int

const (
	GeoCountry GeoLevel = iota
	GeoProvince
	GeoDistrict
	GeoSubDistrict
)

type geoSpec struct {
	table      string
	langTable  string
	langFK     string
	parentCol  string // empty for country
	hasPostcode bool
}

func geoSpecFor(level GeoLevel) geoSpec {
	switch level {
	case GeoCountry:
		return geoSpec{
			table: "system_country", langTable: "system_country_language", langFK: "system_country_id",
		}
	case GeoProvince:
		return geoSpec{
			table: "system_province", langTable: "system_province_language", langFK: "system_province_id",
			parentCol: "system_country_id",
		}
	case GeoDistrict:
		return geoSpec{
			table: "system_district", langTable: "system_district_language", langFK: "system_district_id",
			parentCol: "system_province_id",
		}
	case GeoSubDistrict:
		return geoSpec{
			table:     "system_sub_district",
			langTable: "system_sub_district_language",
			langFK:    "system_sub_district_id",
			parentCol: "system_district_id",
			hasPostcode: true,
		}
	default:
		panic("unknown GeoLevel")
	}
}
