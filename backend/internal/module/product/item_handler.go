package product

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/labstack/echo/v5"
	"github.com/lMikadal/warehouse/backend/internal/api"
	"github.com/lMikadal/warehouse/backend/internal/httputil"
	applog "github.com/lMikadal/warehouse/backend/internal/log"
)

type ItemHandler struct {
	repo     *ItemRepository
	listRepo *ListRepository
}

func NewItemHandler(repo *ItemRepository, listRepo *ListRepository) *ItemHandler {
	return &ItemHandler{repo: repo, listRepo: listRepo}
}

type itemBrowseJSON struct {
	ID                 int64     `json:"id"`
	ProductListID      int64     `json:"product_list_id"`
	SKU                string    `json:"sku"`
	Price              float64   `json:"price"`
	Unit               string    `json:"unit"`
	QtyPerUnit         int       `json:"qty_per_unit"`
	MinimumStock       int       `json:"minimum_stock"`
	IsActive           bool      `json:"is_active"`
	IsStopped          bool      `json:"is_stopped"`
	UpdatedAt          time.Time `json:"updated_at"`
	Tag                string    `json:"tag"`
	IsNew              bool      `json:"is_new"`
	ProductBrandID     *int64    `json:"product_brand_id,omitempty"`
	ProductCategoryID  *int64    `json:"product_category_id,omitempty"`
	Name               string    `json:"name"`
	BrandName          string    `json:"brand_name"`
	CategoryName       string    `json:"category_name"`
	TotalStock         float64   `json:"total_stock"`
	LowStock           bool      `json:"low_stock"`
	WarehouseRootCount int       `json:"warehouse_root_count"`
	CarCount             int       `json:"car_count"`
	CarSummary           string    `json:"car_summary,omitempty"`
	CoverSystemFileID    *int64    `json:"cover_system_file_id,omitempty"`
}

func toItemBrowseJSON(r ItemBrowseRow) itemBrowseJSON {
	return itemBrowseJSON{
		ID: r.ID, ProductListID: r.ProductListID, SKU: r.SKU, Price: r.Price,
		Unit: r.Unit, QtyPerUnit: r.QtyPerUnit, MinimumStock: r.MinimumStock,
		IsActive: r.IsActive, IsStopped: r.IsStopped, UpdatedAt: r.UpdatedAt, Tag: r.Tag, IsNew: r.IsNew,
		ProductBrandID: r.ProductBrandID, ProductCategoryID: r.ProductCategoryID,
		Name: r.Name, BrandName: r.BrandName, CategoryName: r.CategoryName,
		TotalStock: r.TotalStock, LowStock: r.LowStock,
		WarehouseRootCount: r.WarehouseRootCount, CarCount: r.CarCount, CarSummary: r.CarSummary,
		CoverSystemFileID: r.CoverSystemFileID,
	}
}

func (h *ItemHandler) listBrowse(c *echo.Context) error {
	q := api.ParsePageQuery(c)
	f := ItemListFilter{
		Page: q.Page, Limit: q.Limit,
		Locale: api.LocaleFromRequest(c),
		Search: strings.TrimSpace(c.QueryParam("search")),
	}
	if v := strings.TrimSpace(c.QueryParam("is_active")); v != "" {
		active := v == "true" || v == "1"
		f.IsActive = &active
	}
	if v := strings.TrimSpace(c.QueryParam("is_new")); v == "true" || v == "1" {
		t := true
		f.IsNew = &t
	}
	if id, err := parseOptionalIDParam(c.QueryParam("product_category_id")); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid product_category_id"})
	} else if id != nil {
		f.CategoryID = id
	}
	if id, err := parseOptionalIDParam(c.QueryParam("product_brand_id")); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid product_brand_id"})
	} else if id != nil {
		f.BrandID = id
	}
	sortCol := strings.TrimSpace(c.QueryParam("sort"))
	order := strings.ToLower(strings.TrimSpace(c.QueryParam("order")))
	if sortCol != "" && (order == "asc" || order == "desc") {
		f.Sort = sortCol
		f.Order = order
	}
	rows, total, err := h.repo.ListBrowse(c.Request().Context(), f)
	if err != nil {
		applog.HTTPError(c, "list product items", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to list items"})
	}
	items := make([]itemBrowseJSON, len(rows))
	for i, r := range rows {
		items[i] = toItemBrowseJSON(r)
	}
	return c.JSON(http.StatusOK, api.NewListResponse(items, total, q))
}

func (h *ItemHandler) patch(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	raw, err := readPatchBody(c)
	if err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	if v, ok := raw["is_active"]; ok {
		active, ok := v.(bool)
		if !ok {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "is_active must be boolean"})
		}
		if err := h.repo.PatchItemActive(c.Request().Context(), id, active, httputil.ActorID(c)); err != nil {
			if errors.Is(err, ErrNotFound) {
				return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
			}
			applog.HTTPError(c, "patch product item", err)
			return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "update failed"})
		}
		return c.NoContent(http.StatusNoContent)
	}
	if v, ok := raw["is_stopped"]; ok {
		stopped, ok := v.(bool)
		if !ok {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "is_stopped must be boolean"})
		}
		if err := h.repo.PatchItemStopped(c.Request().Context(), id, stopped, httputil.ActorID(c)); err != nil {
			if errors.Is(err, ErrNotFound) {
				return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
			}
			applog.HTTPError(c, "patch product item", err)
			return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "update failed"})
		}
		return c.NoContent(http.StatusNoContent)
	}
	if len(raw) > 0 && h.listRepo != nil {
		b, err := json.Marshal(raw)
		if err != nil {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
		}
		var it listItemBody
		if err := json.Unmarshal(b, &it); err != nil {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
		}
		if err := h.listRepo.PatchItemFull(c.Request().Context(), id, it, httputil.ActorID(c)); err != nil {
			if errors.Is(err, ErrNotFound) {
				return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
			}
			if errors.Is(err, ErrValidation) {
				return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "validation failed"})
			}
			applog.HTTPError(c, "patch product item", err)
			return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "update failed"})
		}
		return c.NoContent(http.StatusNoContent)
	}
	return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "empty patch"})
}

func (h *ItemHandler) delete(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	if err := h.repo.SoftDeleteItem(c.Request().Context(), id, httputil.ActorID(c)); err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		applog.HTTPError(c, "delete product item", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "delete failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *ItemHandler) listStocks(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	q := api.ParsePageQuery(c)
	rows, total, err := h.repo.ListStocks(c.Request().Context(), id, api.LocaleFromRequest(c), q.Page, q.Limit)
	if err != nil {
		applog.HTTPError(c, "list product item stocks", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to list stocks"})
	}
	return c.JSON(http.StatusOK, api.NewListResponse(rows, int64(total), q))
}

func (h *ItemHandler) warehousePlacements(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	rows, err := h.repo.WarehousePlacements(c.Request().Context(), id, api.LocaleFromRequest(c))
	if err != nil {
		applog.HTTPError(c, "product item warehouse placements", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load placements"})
	}
	type rowJSON struct {
		WarehouseName string  `json:"warehouse_name"`
		ZoneName      string  `json:"zone_name"`
		ShelfName     string  `json:"shelf_name"`
		RackName      string  `json:"rack_name"`
		BinName       string  `json:"bin_name"`
		Quantity      float64 `json:"quantity"`
	}
	out := make([]rowJSON, len(rows))
	for i, r := range rows {
		out[i] = rowJSON(r)
	}
	return c.JSON(http.StatusOK, map[string]any{"items": out})
}

func (h *ItemHandler) historyPurchase(c *echo.Context) error {
	_, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, emptyHistoryResponse())
}

func (h *ItemHandler) historySales(c *echo.Context) error {
	_, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, emptyHistoryResponse())
}

func emptyHistoryResponse() map[string]any {
	return map[string]any{
		"summary": map[string]any{},
		"groups":  []any{},
		"meta":    map[string]any{"total": 0, "page": 1, "limit": 10},
	}
}

type ListHandler struct {
	itemRepo *ItemRepository
	listRepo *ListRepository
}

func NewListHandler(itemRepo *ItemRepository, listRepo *ListRepository) *ListHandler {
	return &ListHandler{itemRepo: itemRepo, listRepo: listRepo}
}

func (h *ListHandler) listCars(c *echo.Context) error {
	listID, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	rows, err := h.itemRepo.ListCarsForList(c.Request().Context(), listID, api.LocaleFromRequest(c))
	if err != nil {
		applog.HTTPError(c, "list product cars", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load cars"})
	}
	type carJSON struct {
		ID         int64   `json:"id"`
		BrandName  string  `json:"brand_name"`
		ModelName  string  `json:"model_name"`
		EngineName string  `json:"engine_name"`
		YearStart  *int    `json:"year_start,omitempty"`
		YearEnd    *int    `json:"year_end,omitempty"`
		GearType   *string `json:"gear_type,omitempty"`
	}
	out := make([]carJSON, len(rows))
	for i, r := range rows {
		out[i] = carJSON(r)
	}
	return c.JSON(http.StatusOK, map[string]any{"items": out})
}

func (h *ListHandler) get(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	detail, err := h.listRepo.GetAggregate(c.Request().Context(), id, api.LocaleFromRequest(c))
	if err != nil {
		applog.HTTPError(c, "get product list", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load"})
	}
	if detail == nil {
		return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
	}
	return c.JSON(http.StatusOK, detail)
}

func (h *ListHandler) create(c *echo.Context) error {
	var body listAggregateBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	id, err := h.listRepo.CreateAggregate(c.Request().Context(), body, httputil.ActorID(c))
	if err != nil {
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "validation failed"})
		}
		applog.HTTPError(c, "create product list", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "create failed"})
	}
	return c.JSON(http.StatusCreated, map[string]any{"id": id})
}

func (h *ListHandler) patch(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	var body listAggregateBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	if err := h.listRepo.UpdateAggregate(c.Request().Context(), id, body, httputil.ActorID(c)); err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "validation failed"})
		}
		applog.HTTPError(c, "update product list", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "update failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *ListHandler) delete(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	if err := h.listRepo.SoftDeleteList(c.Request().Context(), id, httputil.ActorID(c)); err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		applog.HTTPError(c, "delete product list", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "delete failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

func parseInt64Query(c *echo.Context, key string) (*int64, error) {
	v := strings.TrimSpace(c.QueryParam(key))
	if v == "" {
		return nil, nil
	}
	n, err := strconv.ParseInt(v, 10, 64)
	if err != nil || n <= 0 {
		return nil, errors.New("invalid")
	}
	return &n, nil
}
