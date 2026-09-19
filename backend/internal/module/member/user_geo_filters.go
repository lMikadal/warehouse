package member

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/labstack/echo/v5"
	"github.com/lMikadal/warehouse/backend/internal/api"
	"github.com/lMikadal/warehouse/backend/internal/module/system"
	applog "github.com/lMikadal/warehouse/backend/internal/log"
)

func memberUserGeoFilterLevel(facet string) (system.GeoLevel, bool) {
	switch strings.TrimSpace(strings.ToLower(facet)) {
	case "provinces":
		return system.GeoProvince, true
	case "districts":
		return system.GeoDistrict, true
	case "sub_districts":
		return system.GeoSubDistrict, true
	default:
		return 0, false
	}
}

func userFilterQueryInt64Optional(c *echo.Context, key string) *int64 {
	v := strings.TrimSpace(c.QueryParam(key))
	if v == "" {
		return nil
	}
	id, err := strconv.ParseInt(v, 10, 64)
	if err != nil || id <= 0 {
		return nil
	}
	return &id
}

func (h *UserHandler) userGeoFilters(c *echo.Context, facet string) error {
	if h.geo == nil {
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "geo filters unavailable"})
	}
	level, ok := memberUserGeoFilterLevel(facet)
	if !ok {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid facet"})
	}
	q := api.ParsePageQuery(c)
	locale := api.LocaleFromRequest(c)
	active := true
	f := system.GeoListFilter{
		Page: q.Page, Limit: q.Limit, Locale: locale,
		Search: strings.TrimSpace(c.QueryParam("search")), IsActive: &active,
		Sort: "name", Order: "asc",
	}
	f.SystemCountryID = userFilterQueryInt64Optional(c, "system_country_id")
	f.SystemProvinceID = userFilterQueryInt64Optional(c, "system_province_id")
	f.SystemDistrictID = userFilterQueryInt64Optional(c, "system_district_id")

	if id := userFilterQueryID(c); id > 0 {
		row, err := h.geo.Get(c.Request().Context(), level, id, locale)
		if err != nil {
			applog.HTTPError(c, "member user geo filters by id", err)
			return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load filters"})
		}
		if row == nil {
			return c.JSON(http.StatusOK, userFiltersResponse{Items: []userFilterItem{}, Meta: api.ListMeta{Total: 0, Page: 1, Limit: q.Limit}})
		}
		return c.JSON(http.StatusOK, userFiltersResponse{
			Items: []userFilterItem{{ID: row.ID, Name: row.Name}},
			Meta:  api.ListMeta{Total: 1, Page: 1, Limit: q.Limit},
		})
	}

	rows, total, err := h.geo.List(c.Request().Context(), level, f)
	if err != nil {
		applog.HTTPError(c, "member user geo filters list", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load filters"})
	}
	items := make([]userFilterItem, len(rows))
	for i, r := range rows {
		items[i] = userFilterItem{ID: r.ID, Name: r.Name}
	}
	return c.JSON(http.StatusOK, userFiltersResponse{
		Items: items,
		Meta:  api.ListMeta{Total: int64(total), Page: q.Page, Limit: q.Limit},
	})
}
