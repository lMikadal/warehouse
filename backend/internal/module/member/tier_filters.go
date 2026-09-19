package member

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/labstack/echo/v5"
	"github.com/lMikadal/warehouse/backend/internal/api"
	applog "github.com/lMikadal/warehouse/backend/internal/log"
)

type tierFiltersResponse struct {
	Items []SettingRelationFilterItem `json:"items"`
	Meta  api.ListMeta                `json:"meta"`
}

func tierFilterFacet(facet string) bool {
	return strings.TrimSpace(strings.ToLower(facet)) == "setting_relations"
}

func (h *TierHandler) listFilters(c *echo.Context) error {
	if !tierFilterFacet(c.QueryParam("facet")) {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid or missing facet"})
	}
	q := api.ParsePageQuery(c)
	filter := SettingRelationFilterQuery{
		Page:   q.Page,
		Limit:  q.Limit,
		Search: strings.TrimSpace(c.QueryParam("search")),
		Locale: api.LocaleFromRequest(c),
	}
	if v := strings.TrimSpace(c.QueryParam("id")); v != "" {
		id, err := strconv.ParseInt(v, 10, 64)
		if err != nil || id <= 0 {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid id"})
		}
		filter.ID = id
	}
	items, total, err := h.rel.ListSettingRelationFilters(c.Request().Context(), filter)
	if err != nil {
		applog.HTTPError(c, "member tier filters", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load filters"})
	}
	return c.JSON(http.StatusOK, tierFiltersResponse{
		Items: items,
		Meta:  api.ListMeta{Total: total, Page: q.Page, Limit: q.Limit},
	})
}
