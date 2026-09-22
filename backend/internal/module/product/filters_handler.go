package product

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/lMikadal/warehouse/backend/internal/api"
	applog "github.com/lMikadal/warehouse/backend/internal/log"
	"github.com/lMikadal/warehouse/backend/internal/module/setting"
	"github.com/lMikadal/warehouse/backend/internal/module/supplier"
	"github.com/lMikadal/warehouse/backend/internal/module/warehouse"
	"github.com/labstack/echo/v5"
)

type FiltersHandler struct {
	product   *Repository
	supplier  *supplier.Repository
	lang      *setting.LangRepository
	warehouse *warehouse.Repository
}

func NewFiltersHandler(product *Repository, sup *supplier.Repository, lang *setting.LangRepository, wh *warehouse.Repository) *FiltersHandler {
	return &FiltersHandler{product: product, supplier: sup, lang: lang, warehouse: wh}
}

func (h *FiltersHandler) CategoryFilters(c *echo.Context) error {
	attrType, ok := categoryFilterFacet(c.QueryParam("facet"))
	if !ok {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid or missing facet"})
	}
	return h.respondAttributeFilters(c, attrType)
}

func (h *FiltersHandler) ListFilters(c *echo.Context) error {
	facet, ok := listFilterFacet(c.QueryParam("facet"))
	if !ok {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid or missing facet"})
	}
	return h.respondListFacet(c, facet)
}

func (h *FiltersHandler) ItemBrowseFilters(c *echo.Context) error {
	facet, ok := itemBrowseFilterFacet(c.QueryParam("facet"))
	if !ok {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid or missing facet"})
	}
	return h.respondListFacet(c, facet)
}

// CarFilters serves GET .../filters?facet=cars (type_car, parent_id query params).
func (h *FiltersHandler) CarFilters(c *echo.Context) error {
	return h.respondCarFilters(c)
}

// SupplierFilters serves GET .../filters?facet=suppliers for the purchase pages.
func (h *FiltersHandler) SupplierFilters(c *echo.Context) error {
	return h.respondSupplierFilters(c)
}

func (h *FiltersHandler) respondListFacet(c *echo.Context, facet string) error {
	switch facet {
	case "categories":
		return h.respondAttributeFilters(c, "category")
	case "brands":
		return h.respondAttributeFilters(c, "brand")
	case "suppliers":
		return h.respondSupplierFilters(c)
	case "sale_channels":
		return h.respondLangFilters(c, setting.LangSaleChannel)
	case "warehouse_bins":
		return h.respondWarehouseBinFilters(c)
	case "cars":
		return h.respondCarFilters(c)
	default:
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid facet"})
	}
}

func (h *FiltersHandler) respondAttributeFilters(c *echo.Context, attrType string) error {
	ctx := c.Request().Context()
	locale := api.LocaleFromRequest(c)
	q := api.ParsePageQuery(c)
	if id, ok := filterQueryID(c); ok {
		row, err := h.product.Get(ctx, id, attrType, locale)
		if err != nil {
			applog.HTTPError(c, "product filters by id", err)
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
	active := true
	f := ListFilter{AttrType: attrType, Page: q.Page, Limit: q.Limit, Locale: locale, Search: strings.TrimSpace(c.QueryParam("search")), IsActive: &active}
	rows, total, err := h.product.List(ctx, f)
	if err != nil {
		applog.HTTPError(c, "product filters list", err)
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

func (h *FiltersHandler) respondCarFilters(c *echo.Context) error {
	ctx := c.Request().Context()
	locale := api.LocaleFromRequest(c)
	q := api.ParsePageQuery(c)
	typeCar := strings.TrimSpace(c.QueryParam("type_car"))
	if typeCar == "" {
		typeCar = "brand"
	}
	var parentID *int64
	if id, ok := filterQueryID(c, "parent_id"); ok {
		parentID = &id
	}
	if id, ok := filterQueryID(c, "id"); ok && typeCar != "" {
		row, err := h.product.Get(ctx, id, "car", locale)
		if err != nil {
			applog.HTTPError(c, "car filters by id", err)
			return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load filters"})
		}
		if row == nil || row.TypeCar == nil || *row.TypeCar != typeCar {
			return c.JSON(http.StatusOK, filtersResponse{Items: []filterItem{}, Meta: api.ListMeta{Total: 0, Page: 1, Limit: q.Limit}})
		}
		return c.JSON(http.StatusOK, filtersResponse{
			Items: []filterItem{{ID: row.ID, Name: row.Name}},
			Meta:  api.ListMeta{Total: 1, Page: 1, Limit: q.Limit},
		})
	}
	active := true
	f := ListFilter{AttrType: "car", Page: 1, Limit: 500, Locale: locale, Search: strings.TrimSpace(c.QueryParam("search")), IsActive: &active}
	rows, _, err := h.product.List(ctx, f)
	if err != nil {
		applog.HTTPError(c, "car filters list", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load filters"})
	}
	var filtered []Row
	for _, r := range rows {
		if r.TypeCar == nil || *r.TypeCar != typeCar {
			continue
		}
		if parentID != nil {
			if r.ParentID == nil || *r.ParentID != *parentID {
				continue
			}
		}
		filtered = append(filtered, r)
	}
	total := len(filtered)
	limit := q.Limit
	if limit <= 0 {
		limit = 50
	}
	page := q.Page
	if page <= 0 {
		page = 1
	}
	start := (page - 1) * limit
	if start > total {
		start = total
	}
	end := start + limit
	if end > total {
		end = total
	}
	pageRows := filtered[start:end]
	items := make([]filterItem, len(pageRows))
	for i, r := range pageRows {
		items[i] = filterItem{ID: r.ID, Name: r.Name}
	}
	return c.JSON(http.StatusOK, filtersResponse{
		Items: items,
		Meta:  api.ListMeta{Total: int64(total), Page: page, Limit: limit},
	})
}

func (h *FiltersHandler) respondSupplierFilters(c *echo.Context) error {
	ctx := c.Request().Context()
	q := api.ParsePageQuery(c)
	if id, ok := filterQueryID(c); ok {
		row, _, _, _, err := h.supplier.GetAggregate(ctx, id, api.LocaleFromRequest(c))
		if err != nil {
			applog.HTTPError(c, "supplier filters by id", err)
			return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load filters"})
		}
		if row == nil {
			return c.JSON(http.StatusOK, filtersResponse{Items: []filterItem{}, Meta: api.ListMeta{Total: 0, Page: 1, Limit: q.Limit}})
		}
		label := row.SKU
		if row.CompanyName.Valid && strings.TrimSpace(row.CompanyName.String) != "" {
			label = row.CompanyName.String
		}
		return c.JSON(http.StatusOK, filtersResponse{
			Items: []filterItem{{ID: row.ID, Name: label}},
			Meta:  api.ListMeta{Total: 1, Page: 1, Limit: q.Limit},
		})
	}
	active := true
	f := supplier.UserListFilter{Page: q.Page, Limit: q.Limit, Search: strings.TrimSpace(c.QueryParam("search")), IsActive: &active}
	rows, total, err := h.supplier.List(ctx, f)
	if err != nil {
		applog.HTTPError(c, "supplier filters list", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load filters"})
	}
	items := make([]filterItem, len(rows))
	for i, r := range rows {
		label := r.SKU
		if r.CompanyName.Valid && strings.TrimSpace(r.CompanyName.String) != "" {
			label = r.CompanyName.String
		}
		items[i] = filterItem{ID: r.ID, Name: label}
	}
	return c.JSON(http.StatusOK, filtersResponse{
		Items: items,
		Meta:  api.ListMeta{Total: total, Page: q.Page, Limit: q.Limit},
	})
}

func langRowToFilterItem(k setting.LangKind, r setting.LangRow) filterItem {
	item := filterItem{ID: r.ID, Name: r.Name}
	if k == setting.LangSaleChannel {
		def := r.IsDefault
		sort := r.SortOrder
		item.IsDefault = &def
		item.SortOrder = &sort
		item.SystemFileID = r.SystemFileID
	}
	return item
}

func (h *FiltersHandler) respondLangFilters(c *echo.Context, k setting.LangKind) error {
	ctx := c.Request().Context()
	locale := api.LocaleFromRequest(c)
	q := api.ParsePageQuery(c)
	active := true
	f := setting.LangListFilter{Page: q.Page, Limit: q.Limit, Locale: locale, Search: strings.TrimSpace(c.QueryParam("search")), IsActive: &active}
	if k == setting.LangPrefix {
		company := true
		f.IsCompany = &company
	}
	if id, ok := filterQueryID(c); ok {
		row, err := h.lang.Get(ctx, k, id, locale)
		if err != nil {
			applog.HTTPError(c, "setting filters by id", err)
			return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load filters"})
		}
		if row == nil {
			return c.JSON(http.StatusOK, filtersResponse{Items: []filterItem{}, Meta: api.ListMeta{Total: 0, Page: 1, Limit: q.Limit}})
		}
		return c.JSON(http.StatusOK, filtersResponse{
			Items: []filterItem{langRowToFilterItem(k, *row)},
			Meta:  api.ListMeta{Total: 1, Page: 1, Limit: q.Limit},
		})
	}
	rows, total, err := h.lang.List(ctx, k, f)
	if err != nil {
		applog.HTTPError(c, "setting filters list", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load filters"})
	}
	items := make([]filterItem, len(rows))
	for i, r := range rows {
		items[i] = langRowToFilterItem(k, r)
	}
	return c.JSON(http.StatusOK, filtersResponse{
		Items: items,
		Meta:  api.ListMeta{Total: int64(total), Page: q.Page, Limit: q.Limit},
	})
}

func (h *FiltersHandler) respondWarehouseBinFilters(c *echo.Context) error {
	ctx := c.Request().Context()
	locale := api.LocaleFromRequest(c)
	q := api.ParsePageQuery(c)
	active := true
	f := warehouse.ListFilter{
		Page: q.Page, Limit: q.Limit, Locale: locale,
		Search:   strings.TrimSpace(c.QueryParam("search")),
		Type:     "bin",
		IsActive: &active,
	}
	if id, ok := filterQueryID(c); ok {
		row, err := h.warehouse.Get(ctx, id, locale)
		if err != nil {
			applog.HTTPError(c, "warehouse filters by id", err)
			return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load filters"})
		}
		if row == nil || row.Type != "bin" {
			return c.JSON(http.StatusOK, filtersResponse{Items: []filterItem{}, Meta: api.ListMeta{Total: 0, Page: 1, Limit: q.Limit}})
		}
		label := row.Name
		if label == "" {
			label = row.SKU
		}
		return c.JSON(http.StatusOK, filtersResponse{
			Items: []filterItem{{ID: row.ID, Name: label}},
			Meta:  api.ListMeta{Total: 1, Page: 1, Limit: q.Limit},
		})
	}
	rows, total, err := h.warehouse.List(ctx, f)
	if err != nil {
		applog.HTTPError(c, "warehouse bin filters list", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load filters"})
	}
	items := make([]filterItem, len(rows))
	for i, r := range rows {
		label := r.Name
		if label == "" {
			label = r.SKU
		}
		items[i] = filterItem{ID: r.ID, Name: label}
	}
	return c.JSON(http.StatusOK, filtersResponse{
		Items: items,
		Meta:  api.ListMeta{Total: int64(total), Page: q.Page, Limit: q.Limit},
	})
}

func filterQueryID(c *echo.Context, keys ...string) (int64, bool) {
	k := "id"
	if len(keys) > 0 && keys[0] != "" {
		k = keys[0]
	}
	v := strings.TrimSpace(c.QueryParam(k))
	if v == "" {
		return 0, false
	}
	id, err := strconv.ParseInt(v, 10, 64)
	if err != nil || id <= 0 {
		return 0, false
	}
	return id, true
}
