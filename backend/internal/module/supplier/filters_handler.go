package supplier

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/labstack/echo/v5"
	"github.com/lMikadal/warehouse/backend/internal/api"
	"github.com/lMikadal/warehouse/backend/internal/module/setting"
	applog "github.com/lMikadal/warehouse/backend/internal/log"
)

type filterItem struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

type filtersResponse struct {
	Items []filterItem `json:"items"`
	Meta  api.ListMeta `json:"meta"`
}

func supplierFilterFacet(facet string) (setting.LangKind, bool) {
	switch strings.TrimSpace(strings.ToLower(facet)) {
	case "prefixes":
		return setting.LangPrefix, true
	case "banks":
		return setting.LangBank, true
	default:
		return 0, false
	}
}

func (h *Handler) listFilters(c *echo.Context) error {
	kind, ok := supplierFilterFacet(c.QueryParam("facet"))
	if !ok {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid or missing facet"})
	}
	ctx := c.Request().Context()
	locale := api.LocaleFromRequest(c)
	q := api.ParsePageQuery(c)
	active := true
	f := setting.LangListFilter{Page: q.Page, Limit: q.Limit, Locale: locale, Search: strings.TrimSpace(c.QueryParam("search")), IsActive: &active}
	if kind == setting.LangPrefix {
		company := true
		f.IsCompany = &company
	}
	if id, ok := filterQueryID(c); ok {
		row, err := h.lang.Get(ctx, kind, id, locale)
		if err != nil {
			applog.HTTPError(c, "supplier user filters by id", err)
			return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load filters"})
		}
		if row == nil {
			return c.JSON(http.StatusOK, filtersResponse{Items: []filterItem{}, Meta: api.ListMeta{Total: 0, Page: 1, Limit: q.Limit}})
		}
		return c.JSON(http.StatusOK, filtersResponse{
			Items: []filterItem{{ID: row.ID, Name: row.Name}},
			Meta:  api.ListMeta{Total: 1, Page: 1, Limit: q.Limit},
		})
	}
	rows, total, err := h.lang.List(ctx, kind, f)
	if err != nil {
		applog.HTTPError(c, "supplier user filters list", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load filters"})
	}
	items := make([]filterItem, len(rows))
	for i, r := range rows {
		items[i] = filterItem{ID: r.ID, Name: r.Name}
	}
	return c.JSON(http.StatusOK, filtersResponse{
		Items: items,
		Meta:  api.ListMeta{Total: int64(total), Page: q.Page, Limit: q.Limit},
	})
}

func filterQueryID(c *echo.Context) (int64, bool) {
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
