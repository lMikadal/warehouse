package system

import (
	"database/sql"
	"fmt"
	"strings"
)

type geoListWhere struct {
	Clause  string
	Args    []any
	NextArg int
}

func buildGeoListWhere(level GeoLevel, spec geoSpec, f GeoListFilter, locale string) geoListWhere {
	w := "t.deleted_at IS NULL"
	args := []any{locale}
	n := 2

	if f.IsActive != nil {
		w += fmt.Sprintf(" AND t.is_active = $%d", n)
		args = append(args, *f.IsActive)
		n++
	}
	if f.SystemCountryID != nil && spec.parentCol != "" {
		switch level {
		case GeoProvince:
			w += fmt.Sprintf(" AND t.system_country_id = $%d", n)
			args = append(args, *f.SystemCountryID)
			n++
		case GeoDistrict:
			w += fmt.Sprintf(" AND EXISTS (SELECT 1 FROM system_province p WHERE p.id = t.system_province_id AND p.system_country_id = $%d AND p.deleted_at IS NULL)", n)
			args = append(args, *f.SystemCountryID)
			n++
		case GeoSubDistrict:
			w += fmt.Sprintf(` AND EXISTS (
				SELECT 1 FROM system_district d
				JOIN system_province p ON p.id = d.system_province_id AND p.deleted_at IS NULL
				WHERE d.id = t.system_district_id AND d.deleted_at IS NULL AND p.system_country_id = $%d)`, n)
			args = append(args, *f.SystemCountryID)
			n++
		}
	}
	if f.SystemProvinceID != nil && (level == GeoDistrict || level == GeoSubDistrict) {
		col := "t.system_province_id"
		if level == GeoSubDistrict {
			w += fmt.Sprintf(" AND EXISTS (SELECT 1 FROM system_district d WHERE d.id = t.system_district_id AND d.system_province_id = $%d AND d.deleted_at IS NULL)", n)
		} else {
			w += fmt.Sprintf(" AND %s = $%d", col, n)
		}
		args = append(args, *f.SystemProvinceID)
		n++
	}
	if f.SystemDistrictID != nil && level == GeoSubDistrict {
		w += fmt.Sprintf(" AND t.system_district_id = $%d", n)
		args = append(args, *f.SystemDistrictID)
		n++
	}
	if q := strings.TrimSpace(f.Search); q != "" {
		like := "%" + strings.ToLower(q) + "%"
		w += fmt.Sprintf(` AND (
			LOWER(COALESCE(l.name, '')) LIKE $%d OR LOWER(COALESCE(t.sku, '')) LIKE $%d
			OR EXISTS (SELECT 1 FROM %s lx WHERE lx.%s = t.id AND LOWER(lx.name) LIKE $%d)
		)`, n, n, spec.langTable, spec.langFK, n)
		if spec.hasPostcode {
			w += fmt.Sprintf(" OR LOWER(COALESCE(t.postcode, '')) LIKE $%d", n)
		}
		args = append(args, like)
		n++
	}

	return geoListWhere{Clause: w, Args: args, NextArg: n}
}

type geoParentSelect struct {
	selectSQL string
	labelSQL  string
	scanExtra int
}

func geoListParentSelect(level GeoLevel, localeParam int) geoParentSelect {
	localePh := fmt.Sprintf("$%d", localeParam)
	switch level {
	case GeoProvince:
		return geoParentSelect{
			selectSQL: ", t.system_country_id",
			labelSQL: fmt.Sprintf(
				", (SELECT COALESCE(cl.name, '') FROM system_country_language cl WHERE cl.system_country_id = t.system_country_id AND cl.locale = %s LIMIT 1)",
				localePh,
			),
			scanExtra: 1,
		}
	case GeoDistrict:
		return geoParentSelect{
			selectSQL: ", t.system_province_id",
			labelSQL: fmt.Sprintf(
				", (SELECT COALESCE(pl.name, '') FROM system_province_language pl WHERE pl.system_province_id = t.system_province_id AND pl.locale = %s LIMIT 1)",
				localePh,
			),
			scanExtra: 1,
		}
	case GeoSubDistrict:
		return geoParentSelect{
			selectSQL: ", t.system_district_id",
			labelSQL: fmt.Sprintf(
				", (SELECT COALESCE(dl.name, '') FROM system_district_language dl WHERE dl.system_district_id = t.system_district_id AND dl.locale = %s LIMIT 1)",
				localePh,
			),
			scanExtra: 1,
		}
	default:
		return geoParentSelect{}
	}
}

func geoDefaultListOrder(level GeoLevel) string {
	const tail = "t.sort_order ASC, t.created_at ASC, t.id ASC"
	switch level {
	case GeoCountry:
		return tail
	case GeoProvince:
		return "COALESCE((SELECT c.sort_order FROM system_country c WHERE c.id = t.system_country_id AND c.deleted_at IS NULL), 0) ASC, t.system_country_id ASC, " + tail
	case GeoDistrict:
		return "COALESCE((SELECT p.sort_order FROM system_province p WHERE p.id = t.system_province_id AND p.deleted_at IS NULL), 0) ASC, t.system_province_id ASC, " + tail
	case GeoSubDistrict:
		return "COALESCE((SELECT d.sort_order FROM system_district d WHERE d.id = t.system_district_id AND d.deleted_at IS NULL), 0) ASC, t.system_district_id ASC, " + tail
	default:
		return tail
	}
}

func geoOrderBy(sort, order string, level GeoLevel) string {
	col := strings.TrimSpace(sort)
	ord := strings.ToLower(strings.TrimSpace(order))
	if col == "" || (ord != "asc" && ord != "desc") {
		return geoDefaultListOrder(level)
	}
	switch col {
	case "sku":
		return fmt.Sprintf("t.sku %s NULLS LAST, t.id ASC", strings.ToUpper(ord))
	case "name":
		return fmt.Sprintf("l.name %s NULLS LAST, t.id ASC", strings.ToUpper(ord))
	case "is_active":
		return fmt.Sprintf("t.is_active %s, t.id ASC", strings.ToUpper(ord))
	case "updated_at":
		return fmt.Sprintf("t.updated_at %s, t.id ASC", strings.ToUpper(ord))
	case "postcode":
		if level == GeoSubDistrict {
			return fmt.Sprintf("t.postcode %s NULLS LAST, t.id ASC", strings.ToUpper(ord))
		}
	}
	return geoDefaultListOrder(level)
}

func scanGeoListRow(rows *sql.Rows, level GeoLevel, hasPostcode bool, parentExtra int) (GeoRow, error) {
	var row GeoRow
	dest := []any{&row.ID, &row.SKU, &row.Name, &row.SortOrder, &row.IsActive, &row.UpdatedAt}
	if hasPostcode {
		dest = append(dest, &row.Postcode)
	}
	var parentID sql.NullInt64
	var parentLabel sql.NullString
	if parentExtra > 0 {
		dest = append(dest, &parentID, &parentLabel)
	}
	if err := rows.Scan(dest...); err != nil {
		return GeoRow{}, err
	}
	if parentID.Valid {
		switch level {
		case GeoProvince:
			row.SystemCountryID = parentID
		case GeoDistrict:
			row.SystemProvinceID = parentID
		case GeoSubDistrict:
			row.SystemDistrictID = parentID
		}
	}
	if parentLabel.Valid {
		row.ParentLabel = parentLabel.String
	}
	return row, nil
}
