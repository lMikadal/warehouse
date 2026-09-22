package member

import (
	"net/http"
	"strings"

	"github.com/lMikadal/warehouse/backend/internal/api"
	applog "github.com/lMikadal/warehouse/backend/internal/log"
	"github.com/lMikadal/warehouse/backend/internal/module/system"
	"github.com/labstack/echo/v5"
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
	p := system.GeoFilterListParams{
		Page: q.Page, Limit: q.Limit, Locale: locale,
		Search:           strings.TrimSpace(c.QueryParam("search")),
		SystemCountryID:  api.QueryOptionalInt64(c, "system_country_id"),
		SystemProvinceID: api.QueryOptionalInt64(c, "system_province_id"),
		SystemDistrictID: api.QueryOptionalInt64(c, "system_district_id"),
	}
	if id := userFilterQueryID(c); id > 0 {
		p.ID = id
	}
	result, err := system.GeoFilterList(c.Request().Context(), h.geo, level, p)
	if err != nil {
		applog.HTTPError(c, "member user geo filters", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load filters"})
	}
	items := make([]userFilterItem, len(result.Items))
	for i, r := range result.Items {
		items[i] = userFilterItem{ID: r.ID, Name: r.Name}
	}
	return c.JSON(http.StatusOK, userFiltersResponse{
		Items: items,
		Meta:  api.ListMeta{Total: result.Total, Page: result.Page, Limit: result.Limit},
	})
}
