package member

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/labstack/echo/v5"
	"github.com/lMikadal/warehouse/backend/internal/api"
	"github.com/lMikadal/warehouse/backend/internal/module/setting"
	applog "github.com/lMikadal/warehouse/backend/internal/log"
)

type userFilterItem struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

type userFiltersResponse struct {
	Items []userFilterItem `json:"items"`
	Meta  api.ListMeta     `json:"meta"`
}

type userStatsResponse struct {
	TotalCustomers int64   `json:"total_customers"`
	ActiveMembers  int64   `json:"active_members"`
	NewThisMonth   int64   `json:"new_this_month"`
	SalesThisMonth float64 `json:"sales_this_month"`
}

func userFilterFacet(facet string) (string, bool) {
	switch strings.TrimSpace(strings.ToLower(facet)) {
	case "businesses", "setting_relations", "tiers", "prefixes", "admin_users", "product_items", "member_credits":
		return strings.TrimSpace(strings.ToLower(facet)), true
	default:
		return "", false
	}
}

func (h *UserHandler) stats(c *echo.Context) error {
	row, err := h.repo.Stats(c.Request().Context())
	if err != nil {
		applog.HTTPError(c, "member user stats", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load stats"})
	}
	return c.JSON(http.StatusOK, userStatsResponse{
		TotalCustomers: row.TotalCustomers,
		ActiveMembers:  row.ActiveMembers,
		NewThisMonth:   row.NewThisMonth,
		SalesThisMonth: row.SalesThisMonth,
	})
}

func (h *UserHandler) listFilters(c *echo.Context) error {
	facet, ok := userFilterFacet(c.QueryParam("facet"))
	if !ok {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid or missing facet"})
	}
	locale := api.LocaleFromRequest(c)
	q := api.ParsePageQuery(c)
	search := strings.TrimSpace(c.QueryParam("search"))
	id := userFilterQueryID(c)

	switch facet {
	case "setting_relations":
		return h.userSettingRelationFilters(c, locale, q, search, id)
	case "prefixes":
		return h.userPrefixFilters(c, locale, q, search, id)
	case "member_credits":
		return h.userCreditFilters(c, locale, q, search, id)
	case "businesses":
		rows, total, err := h.repo.FilterBusinesses(c.Request().Context(), locale, q.Page, q.Limit, search, id)
		if err != nil {
			applog.HTTPError(c, "member user filters businesses", err)
			return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load filters"})
		}
		return c.JSON(http.StatusOK, userFiltersToResponse(rows, total, q))
	case "tiers":
		rows, total, err := h.repo.FilterTiers(c.Request().Context(), locale, q.Page, q.Limit, search, id)
		if err != nil {
			applog.HTTPError(c, "member user filters tiers", err)
			return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load filters"})
		}
		return c.JSON(http.StatusOK, userFiltersToResponse(rows, total, q))
	case "admin_users":
		rows, total, err := h.repo.FilterAdminUsers(c.Request().Context(), q.Page, q.Limit, search, id)
		if err != nil {
			applog.HTTPError(c, "member user filters admin users", err)
			return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load filters"})
		}
		return c.JSON(http.StatusOK, userFiltersToResponse(rows, total, q))
	case "product_items":
		rows, total, err := h.repo.FilterProductItems(c.Request().Context(), locale, q.Page, q.Limit, search, id)
		if err != nil {
			applog.HTTPError(c, "member user filters product items", err)
			return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load filters"})
		}
		return c.JSON(http.StatusOK, userFiltersToResponse(rows, total, q))
	default:
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid facet"})
	}
}

func (h *UserHandler) userSettingRelationFilters(c *echo.Context, locale string, q api.PageQuery, search string, id int64) error {
	filter := SettingRelationFilterQuery{
		Page:   q.Page,
		Limit:  q.Limit,
		Search: search,
		Locale: locale,
	}
	if id > 0 {
		filter.ID = id
	}
	items, total, err := h.rel.ListSettingRelationFilters(c.Request().Context(), filter)
	if err != nil {
		applog.HTTPError(c, "member user filters setting relations", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load filters"})
	}
	out := make([]userFilterItem, len(items))
	for i, row := range items {
		out[i] = userFilterItem{ID: row.ID, Name: row.Name}
	}
	return c.JSON(http.StatusOK, userFiltersResponse{
		Items: out,
		Meta:  api.ListMeta{Total: total, Page: q.Page, Limit: q.Limit},
	})
}

func (h *UserHandler) userPrefixFilters(c *echo.Context, locale string, q api.PageQuery, search string, id int64) error {
	if h.lang == nil {
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "filters unavailable"})
	}
	active := true
	f := setting.LangListFilter{Page: q.Page, Limit: q.Limit, Locale: locale, Search: search, IsActive: &active}
	if v := strings.TrimSpace(c.QueryParam("member_type")); v == "person" {
		person := true
		f.IsPerson = &person
	} else if v == "company" {
		company := true
		f.IsCompany = &company
	}
	if id > 0 {
		row, err := h.lang.Get(c.Request().Context(), setting.LangPrefix, id, locale)
		if err != nil {
			applog.HTTPError(c, "member user filters prefix by id", err)
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
	rows, total, err := h.lang.List(c.Request().Context(), setting.LangPrefix, f)
	if err != nil {
		applog.HTTPError(c, "member user filters prefixes", err)
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

func (h *UserHandler) userCreditFilters(c *echo.Context, locale string, q api.PageQuery, search string, id int64) error {
	if h.set == nil {
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "filters unavailable"})
	}
	active := true
	f := SettingListFilter{Page: q.Page, Limit: q.Limit, Locale: locale, Search: search, IsActive: &active}
	if id > 0 {
		row, err := h.set.Get(c.Request().Context(), SettingCredit, id, locale)
		if err != nil {
			applog.HTTPError(c, "member user filters credit by id", err)
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
	rows, total, err := h.set.List(c.Request().Context(), SettingCredit, f)
	if err != nil {
		applog.HTTPError(c, "member user filters credits", err)
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

func userFiltersToResponse(rows []userFilterRow, total int64, q api.PageQuery) userFiltersResponse {
	items := make([]userFilterItem, len(rows))
	for i, r := range rows {
		items[i] = userFilterItem{ID: r.ID, Name: r.Name}
	}
	return userFiltersResponse{
		Items: items,
		Meta:  api.ListMeta{Total: total, Page: q.Page, Limit: q.Limit},
	}
}

func userFilterQueryID(c *echo.Context) int64 {
	v := strings.TrimSpace(c.QueryParam("id"))
	if v == "" {
		return 0
	}
	id, err := strconv.ParseInt(v, 10, 64)
	if err != nil || id <= 0 {
		return 0
	}
	return id
}
