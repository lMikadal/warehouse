package system

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/labstack/echo/v5"
	"github.com/lMikadal/warehouse/backend/internal/api"
	"github.com/lMikadal/warehouse/backend/internal/httputil"
	applog "github.com/lMikadal/warehouse/backend/internal/log"
)

type AddressGeoHandler struct {
	repo  *AddressGeoRepository
	level GeoLevel
}

func NewAddressGeoHandler(level GeoLevel, repo *AddressGeoRepository) *AddressGeoHandler {
	return &AddressGeoHandler{repo: repo, level: level}
}

type geoItem struct {
	ID               int64             `json:"id"`
	SKU              *string           `json:"sku,omitempty"`
	Name             string            `json:"name"`
	Postcode         *string           `json:"postcode,omitempty"`
	SortOrder        int               `json:"sort_order"`
	IsActive         bool              `json:"is_active"`
	UpdatedAt        time.Time         `json:"updated_at"`
	SystemCountryID  *int64            `json:"system_country_id,omitempty"`
	SystemProvinceID *int64            `json:"system_province_id,omitempty"`
	SystemDistrictID *int64            `json:"system_district_id,omitempty"`
	ParentLabel      string            `json:"parent_label,omitempty"`
	Names            map[string]string `json:"names,omitempty"`
}

func rowToGeoItem(r GeoRow, includeNames bool) geoItem {
	item := geoItem{
		ID: r.ID, Name: r.Name, SortOrder: r.SortOrder, IsActive: r.IsActive, UpdatedAt: r.UpdatedAt,
		ParentLabel: r.ParentLabel,
	}
	if r.SKU.Valid {
		s := r.SKU.String
		item.SKU = &s
	}
	if r.Postcode.Valid {
		p := r.Postcode.String
		item.Postcode = &p
	}
	if r.SystemCountryID.Valid {
		v := r.SystemCountryID.Int64
		item.SystemCountryID = &v
	}
	if r.SystemProvinceID.Valid {
		v := r.SystemProvinceID.Int64
		item.SystemProvinceID = &v
	}
	if r.SystemDistrictID.Valid {
		v := r.SystemDistrictID.Int64
		item.SystemDistrictID = &v
	}
	if includeNames && r.Names != nil {
		item.Names = r.Names
	}
	return item
}

type geoFilterItem struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

type geoFiltersResponse struct {
	Items []geoFilterItem `json:"items"`
	Meta  api.ListMeta    `json:"meta"`
}

func (h *AddressGeoHandler) listFilters(c *echo.Context) error {
	facet := strings.TrimSpace(c.QueryParam("facet"))
	queryLevel, ok := geoFilterFacetLevel(h.level, facet)
	if !ok {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid or missing facet"})
	}
	q := api.ParsePageQuery(c)
	p := GeoFilterListParams{
		Page: q.Page, Limit: q.Limit, Locale: api.LocaleFromRequest(c),
		Search:           strings.TrimSpace(c.QueryParam("search")),
		SystemCountryID:  api.QueryOptionalInt64(c, "system_country_id"),
		SystemProvinceID: api.QueryOptionalInt64(c, "system_province_id"),
		SystemDistrictID: api.QueryOptionalInt64(c, "system_district_id"),
	}
	if id, ok := api.QueryInt64(c, "id"); ok {
		p.ID = id
	}
	result, err := GeoFilterList(c.Request().Context(), h.repo, queryLevel, p)
	if err != nil {
		applog.HTTPError(c, "geo filters", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load filters"})
	}
	items := make([]geoFilterItem, len(result.Items))
	for i, r := range result.Items {
		items[i] = geoFilterItem{ID: r.ID, Name: r.Name}
	}
	return c.JSON(http.StatusOK, geoFiltersResponse{
		Items: items,
		Meta:  api.ListMeta{Total: result.Total, Page: result.Page, Limit: result.Limit},
	})
}

func (h *AddressGeoHandler) list(c *echo.Context) error {
	q := api.ParsePageQuery(c)
	f := GeoListFilter{Page: q.Page, Limit: q.Limit, Locale: api.LocaleFromRequest(c), Search: strings.TrimSpace(c.QueryParam("search"))}
	if v := strings.TrimSpace(c.QueryParam("is_active")); v != "" {
		active := v == "true" || v == "1"
		f.IsActive = &active
	}
	if id, ok := api.QueryInt64(c, "system_country_id"); ok {
		f.SystemCountryID = &id
	}
	if id, ok := api.QueryInt64(c, "system_province_id"); ok {
		f.SystemProvinceID = &id
	}
	if id, ok := api.QueryInt64(c, "system_district_id"); ok {
		f.SystemDistrictID = &id
	}
	sortCol := strings.TrimSpace(c.QueryParam("sort"))
	order := strings.ToLower(strings.TrimSpace(c.QueryParam("order")))
	if sortCol != "" && (order == "asc" || order == "desc") {
		f.Sort = sortCol
		f.Order = order
	}
	rows, total, err := h.repo.List(c.Request().Context(), h.level, f)
	if err != nil {
		applog.HTTPError(c, "list geo", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to list"})
	}
	items := make([]geoItem, len(rows))
	for i, r := range rows {
		items[i] = rowToGeoItem(r, false)
	}
	return c.JSON(http.StatusOK, api.NewListResponse(items, int64(total), q))
}

func (h *AddressGeoHandler) get(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	row, err := h.repo.Get(c.Request().Context(), h.level, id, api.LocaleFromRequest(c))
	if err != nil {
		applog.HTTPError(c, "get geo", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load"})
	}
	if row == nil {
		return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
	}
	return c.JSON(http.StatusOK, rowToGeoItem(*row, true))
}

type geoNamesBody struct {
	Th string `json:"th"`
	En string `json:"en"`
}

type geoCreateBody struct {
	SKU              *string      `json:"sku"`
	Postcode         *string      `json:"postcode"`
	IsActive         *bool        `json:"is_active"`
	Names            geoNamesBody `json:"names"`
	SystemCountryID  *int64       `json:"system_country_id"`
	SystemProvinceID *int64       `json:"system_province_id"`
	SystemDistrictID *int64       `json:"system_district_id"`
}

func (h *AddressGeoHandler) create(c *echo.Context) error {
	var body geoCreateBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	active := true
	if body.IsActive != nil {
		active = *body.IsActive
	}
	in := GeoCreateInput{
		SKU: body.SKU, Postcode: body.Postcode, IsActive: active, ActorID: httputil.ActorID(c),
		Names: map[string]string{"th": strings.TrimSpace(body.Names.Th), "en": strings.TrimSpace(body.Names.En)},
	}
	if body.SystemCountryID != nil {
		in.SystemCountryID = *body.SystemCountryID
	}
	if body.SystemProvinceID != nil {
		in.SystemProvinceID = *body.SystemProvinceID
	}
	if body.SystemDistrictID != nil {
		in.SystemDistrictID = *body.SystemDistrictID
	}
	id, err := h.repo.Create(c.Request().Context(), h.level, in)
	if err != nil {
		if errors.Is(err, ErrGeoValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "validation failed"})
		}
		applog.HTTPError(c, "create geo", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "create failed"})
	}
	return c.JSON(http.StatusCreated, map[string]any{"id": id})
}

type geoPatchBody struct {
	SKU              *string       `json:"sku"`
	Postcode         *string       `json:"postcode"`
	IsActive         *bool         `json:"is_active"`
	Names            *geoNamesBody `json:"names"`
	SystemCountryID  *int64        `json:"system_country_id"`
	SystemProvinceID *int64        `json:"system_province_id"`
	SystemDistrictID *int64        `json:"system_district_id"`
}

func (h *AddressGeoHandler) patch(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	var body geoPatchBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	patch := GeoPatch{ActorID: httputil.ActorID(c), SKU: body.SKU, Postcode: body.Postcode, IsActive: body.IsActive,
		SystemCountryID: body.SystemCountryID, SystemProvinceID: body.SystemProvinceID, SystemDistrictID: body.SystemDistrictID}
	if body.Names != nil {
		patch.Names = map[string]string{"th": strings.TrimSpace(body.Names.Th), "en": strings.TrimSpace(body.Names.En)}
	}
	if patch.SKU == nil && patch.Postcode == nil && patch.IsActive == nil && patch.Names == nil &&
		patch.SystemCountryID == nil && patch.SystemProvinceID == nil && patch.SystemDistrictID == nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "no fields to update"})
	}
	err = h.repo.Update(c.Request().Context(), h.level, id, patch)
	if err != nil {
		if errors.Is(err, ErrGeoNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		if errors.Is(err, ErrGeoValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "validation failed"})
		}
		applog.HTTPError(c, "patch geo", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "update failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *AddressGeoHandler) delete(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	if err := h.repo.SoftDelete(c.Request().Context(), h.level, id, httputil.ActorID(c)); err != nil {
		if errors.Is(err, ErrGeoNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		applog.HTTPError(c, "delete geo", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "delete failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *AddressGeoHandler) reorder(c *echo.Context) error {
	var body languageReorderBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	if body.DragID <= 0 || body.TargetID <= 0 {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "drag_id and target_id required"})
	}
	err := h.repo.Reorder(c.Request().Context(), h.level, body.DragID, body.TargetID, httputil.ActorID(c))
	if err != nil {
		if errors.Is(err, ErrGeoInvalidReorder) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid reorder"})
		}
		applog.HTTPError(c, "reorder geo", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "reorder failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

func RegisterAddressGeoRoutes(g *echo.Group, repo *AddressGeoRepository) {
	country := NewAddressGeoHandler(GeoCountry, repo)
	g.GET("/countries", country.list)
	g.GET("/countries/filters", country.listFilters)
	g.GET("/countries/:id", country.get)
	g.POST("/countries", country.create)
	g.PATCH("/countries/reorder", country.reorder)
	g.PATCH("/countries/:id", country.patch)
	g.DELETE("/countries/:id", country.delete)

	province := NewAddressGeoHandler(GeoProvince, repo)
	g.GET("/provinces", province.list)
	g.GET("/provinces/filters", province.listFilters)
	g.GET("/provinces/:id", province.get)
	g.POST("/provinces", province.create)
	g.PATCH("/provinces/reorder", province.reorder)
	g.PATCH("/provinces/:id", province.patch)
	g.DELETE("/provinces/:id", province.delete)

	district := NewAddressGeoHandler(GeoDistrict, repo)
	g.GET("/districts", district.list)
	g.GET("/districts/filters", district.listFilters)
	g.GET("/districts/:id", district.get)
	g.POST("/districts", district.create)
	g.PATCH("/districts/reorder", district.reorder)
	g.PATCH("/districts/:id", district.patch)
	g.DELETE("/districts/:id", district.delete)

	sub := NewAddressGeoHandler(GeoSubDistrict, repo)
	g.GET("/sub-districts", sub.list)
	g.GET("/sub-districts/filters", sub.listFilters)
	g.GET("/sub-districts/:id", sub.get)
	g.POST("/sub-districts", sub.create)
	g.PATCH("/sub-districts/reorder", sub.reorder)
	g.PATCH("/sub-districts/:id", sub.patch)
	g.DELETE("/sub-districts/:id", sub.delete)
}
