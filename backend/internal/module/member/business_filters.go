package member

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/labstack/echo/v5"
	"github.com/lMikadal/warehouse/backend/internal/api"
	applog "github.com/lMikadal/warehouse/backend/internal/log"
)

type businessFilterItem struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

type businessFiltersResponse struct {
	Items []businessFilterItem `json:"items"`
	Meta  api.ListMeta         `json:"meta"`
}

func businessFilterKind(facet string) (SettingKind, bool) {
	switch strings.TrimSpace(strings.ToLower(facet)) {
	case "credits":
		return SettingCredit, true
	case "groups":
		return SettingGroup, true
	default:
		return 0, false
	}
}

func (h *SettingHandler) listFilters(c *echo.Context) error {
	if h.k != SettingBusiness {
		return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
	}
	kind, ok := businessFilterKind(c.QueryParam("facet"))
	if !ok {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid or missing facet"})
	}
	locale := api.LocaleFromRequest(c)
	q := api.ParsePageQuery(c)
	active := true
	f := SettingListFilter{Page: q.Page, Limit: q.Limit, Locale: locale, Search: strings.TrimSpace(c.QueryParam("search")), IsActive: &active}

	if id, ok := businessFilterQueryID(c); ok {
		row, err := h.repo.Get(c.Request().Context(), kind, id, locale)
		if err != nil {
			applog.HTTPError(c, "member business filters by id", err)
			return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load filters"})
		}
		if row == nil {
			return c.JSON(http.StatusOK, businessFiltersResponse{Items: []businessFilterItem{}, Meta: api.ListMeta{Total: 0, Page: 1, Limit: q.Limit}})
		}
		return c.JSON(http.StatusOK, businessFiltersResponse{
			Items: []businessFilterItem{{ID: row.ID, Name: row.Name}},
			Meta:  api.ListMeta{Total: 1, Page: 1, Limit: q.Limit},
		})
	}

	rows, total, err := h.repo.List(c.Request().Context(), kind, f)
	if err != nil {
		applog.HTTPError(c, "member business filters list", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load filters"})
	}
	items := make([]businessFilterItem, len(rows))
	for i, r := range rows {
		items[i] = businessFilterItem{ID: r.ID, Name: r.Name}
	}
	return c.JSON(http.StatusOK, businessFiltersResponse{
		Items: items,
		Meta:  api.ListMeta{Total: int64(total), Page: q.Page, Limit: q.Limit},
	})
}

func businessFilterQueryID(c *echo.Context) (int64, bool) {
	v := strings.TrimSpace(c.QueryParam("id"))
	if v == "" {
		return 0, false
	}
	id, err := strconv.ParseInt(v, 10, 64)
	if err != nil || id <= 0 {
		return 0, false
	}
	return id, true
}
