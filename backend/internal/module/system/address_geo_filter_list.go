package system

import "context"

// GeoFilterListItem is one row for parent/cascade geo filter pickers.
type GeoFilterListItem struct {
	ID   int64
	Name string
}

// GeoFilterListParams drives active geo rows for filter comboboxes.
type GeoFilterListParams struct {
	Page, Limit      int
	Locale, Search   string
	SystemCountryID  *int64
	SystemProvinceID *int64
	SystemDistrictID *int64
	ID               int64 // when > 0, resolve label for one row (ignores Search)
}

// GeoFilterListResult holds items and list meta for filter responses.
type GeoFilterListResult struct {
	Items []GeoFilterListItem
	Total int64
	Page  int
	Limit int
}

// GeoFilterList loads active geo rows for filter pickers (name sort, optional cascade).
func GeoFilterList(ctx context.Context, repo *AddressGeoRepository, level GeoLevel, p GeoFilterListParams) (GeoFilterListResult, error) {
	limit := p.Limit
	if limit < 1 {
		limit = 10
	}
	page := p.Page
	if page < 1 {
		page = 1
	}
	out := GeoFilterListResult{Page: page, Limit: limit}

	if p.ID > 0 {
		out.Page = 1
		row, err := repo.Get(ctx, level, p.ID, p.Locale)
		if err != nil {
			return GeoFilterListResult{}, err
		}
		if row == nil {
			out.Total = 0
			out.Items = []GeoFilterListItem{}
			return out, nil
		}
		out.Total = 1
		out.Items = []GeoFilterListItem{{ID: row.ID, Name: row.Name}}
		return out, nil
	}

	active := true
	f := GeoListFilter{
		Page: page, Limit: limit, Locale: p.Locale, Search: p.Search, IsActive: &active,
		Sort: "name", Order: "asc",
		SystemCountryID: p.SystemCountryID, SystemProvinceID: p.SystemProvinceID,
		SystemDistrictID: p.SystemDistrictID,
	}
	rows, total, err := repo.List(ctx, level, f)
	if err != nil {
		return GeoFilterListResult{}, err
	}
	items := make([]GeoFilterListItem, len(rows))
	for i, r := range rows {
		items[i] = GeoFilterListItem{ID: r.ID, Name: r.Name}
	}
	out.Items = items
	out.Total = int64(total)
	return out, nil
}
