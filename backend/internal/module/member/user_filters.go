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
	ID          int64   `json:"id"`
	Name        string  `json:"name"`
	SKU         string  `json:"sku,omitempty"`
	ProductName string  `json:"product_name,omitempty"`
	BrandName   string  `json:"brand_name,omitempty"`
	BrandID     *int64  `json:"brand_id,omitempty"`
	Price       float64 `json:"price,omitempty"`
	ParentID    *int64  `json:"parent_id,omitempty"`
	SortOrder   *int32  `json:"sort_order,omitempty"`
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
	case "businesses", "business_relations", "setting_relations", "tiers", "prefixes", "admin_users", "product_items", "product_brands", "product_brand_categories", "member_credits":
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
	case "business_relations":
		return h.userBusinessRelationFilters(c, locale)
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
		brandID := userFilterBrandID(c)
		categoryID := userFilterCategoryID(c)
		rows, total, err := h.repo.FilterProductItems(c.Request().Context(), locale, q.Page, q.Limit, search, id, brandID, categoryID)
		if err != nil {
			applog.HTTPError(c, "member user filters product items", err)
			return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load filters"})
		}
		return c.JSON(http.StatusOK, userProductItemsToResponse(rows, total, q))
	case "product_brands":
		rows, total, err := h.repo.FilterProductBrands(c.Request().Context(), locale, q.Page, q.Limit, search, id)
		if err != nil {
			applog.HTTPError(c, "member user filters product brands", err)
			return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load filters"})
		}
		return c.JSON(http.StatusOK, userFiltersToResponse(rows, total, q))
	case "product_brand_categories":
		brandID := userFilterBrandID(c)
		if brandID <= 0 {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "brand_id is required"})
		}
		rows, total, err := h.repo.FilterProductBrandCategories(c.Request().Context(), locale, brandID)
		if err != nil {
			applog.HTTPError(c, "member user filters product brand categories", err)
			return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load filters"})
		}
		return c.JSON(http.StatusOK, userProductBrandCategoriesToResponse(rows, total, q))
	default:
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid facet"})
	}
}

type userSettingRelationFilterItem struct {
	ID            int64  `json:"id"`
	BusinessID    int64  `json:"business_id"`
	CreditID      int64  `json:"credit_id"`
	GroupID       int64  `json:"group_id"`
	Name          string `json:"name"`
	BusinessTitle string `json:"business_title,omitempty"`
	CreditName    string `json:"credit_name,omitempty"`
	GroupName     string `json:"group_name,omitempty"`
}

type userBusinessRelationsResponse struct {
	Items []RelationRow `json:"items"`
}

func (h *UserHandler) userBusinessRelationFilters(c *echo.Context, locale string) error {
	businessID := userFilterBusinessID(c)
	if businessID <= 0 {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "business_id required"})
	}
	rows, err := h.rel.ListByBusiness(c.Request().Context(), businessID, locale)
	if err != nil {
		applog.HTTPError(c, "member user filters business relations", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load filters"})
	}
	if rows == nil {
		rows = []RelationRow{}
	}
	return c.JSON(http.StatusOK, userBusinessRelationsResponse{Items: rows})
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
	out := make([]userSettingRelationFilterItem, len(items))
	for i, row := range items {
		out[i] = userSettingRelationFilterItem{
			ID:            row.ID,
			BusinessID:    row.BusinessID,
			CreditID:      row.CreditID,
			GroupID:       row.GroupID,
			Name:          row.Name,
			BusinessTitle: row.BusinessTitle,
			CreditName:    row.CreditName,
			GroupName:     row.GroupName,
		}
	}
	return c.JSON(http.StatusOK, struct {
		Items []userSettingRelationFilterItem `json:"items"`
		Meta  api.ListMeta                    `json:"meta"`
	}{
		Items: out,
		Meta:  api.ListMeta{Total: total, Page: q.Page, Limit: q.Limit},
	})
}

func userFilterBusinessID(c *echo.Context) int64 {
	v := strings.TrimSpace(c.QueryParam("business_id"))
	if v == "" {
		return 0
	}
	id, err := strconv.ParseInt(v, 10, 64)
	if err != nil || id <= 0 {
		return 0
	}
	return id
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

func userFilterBrandID(c *echo.Context) int64 {
	v := strings.TrimSpace(c.QueryParam("brand_id"))
	if v == "" {
		return 0
	}
	id, err := strconv.ParseInt(v, 10, 64)
	if err != nil || id <= 0 {
		return 0
	}
	return id
}

func userFilterCategoryID(c *echo.Context) int64 {
	v := strings.TrimSpace(c.QueryParam("category_id"))
	if v == "" {
		return 0
	}
	id, err := strconv.ParseInt(v, 10, 64)
	if err != nil || id <= 0 {
		return 0
	}
	return id
}

func userProductBrandCategoriesToResponse(rows []userProductBrandCategoryRow, total int64, q api.PageQuery) userFiltersResponse {
	items := make([]userFilterItem, len(rows))
	for i, r := range rows {
		item := userFilterItem{ID: r.ID, Name: r.Name}
		if r.ParentID.Valid {
			pid := r.ParentID.Int64
			item.ParentID = &pid
		}
		sortOrder := r.SortOrder
		item.SortOrder = &sortOrder
		items[i] = item
	}
	return userFiltersResponse{
		Items: items,
		Meta:  api.ListMeta{Total: total, Page: q.Page, Limit: q.Limit},
	}
}

func userProductItemsToResponse(rows []userProductItemFilterRow, total int64, q api.PageQuery) userFiltersResponse {
	items := make([]userFilterItem, len(rows))
	for i, r := range rows {
		item := userFilterItem{
			ID:          r.ID,
			Name:        r.Name,
			SKU:         r.SKU,
			ProductName: r.ProductName,
			BrandName:   r.BrandName,
			Price:       r.Price,
		}
		if r.BrandID.Valid {
			bid := r.BrandID.Int64
			item.BrandID = &bid
		}
		items[i] = item
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
