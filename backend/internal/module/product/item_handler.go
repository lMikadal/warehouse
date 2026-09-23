package product

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/lMikadal/warehouse/backend/internal/api"
	"github.com/lMikadal/warehouse/backend/internal/httputil"
	applog "github.com/lMikadal/warehouse/backend/internal/log"
	"github.com/labstack/echo/v5"
)

type ItemHandler struct {
	repo     *ItemRepository
	listRepo *ListRepository
}

func NewItemHandler(repo *ItemRepository, listRepo *ListRepository) *ItemHandler {
	return &ItemHandler{repo: repo, listRepo: listRepo}
}

type itemBrowseJSON struct {
	ID                   int64     `json:"id"`
	ProductListID        int64     `json:"product_list_id"`
	SKU                  string    `json:"sku"`
	Barcode              string    `json:"barcode,omitempty"`
	Price                float64   `json:"price"`
	Unit                 string    `json:"unit"`
	QtyPerUnit           int       `json:"qty_per_unit"`
	MinimumStock         int       `json:"minimum_stock"`
	IsActive             bool      `json:"is_active"`
	IsStopped            bool      `json:"is_stopped"`
	UpdatedAt            time.Time `json:"updated_at"`
	Tag                  string    `json:"tag"`
	IsNew                bool      `json:"is_new"`
	ProductBrandID       *int64    `json:"product_brand_id,omitempty"`
	ProductCategoryID    *int64    `json:"product_category_id,omitempty"`
	Name                 string    `json:"name"`
	BrandName            string    `json:"brand_name"`
	CategoryName         string    `json:"category_name"`
	TotalStock           float64   `json:"total_stock"`
	ReservedStock        float64   `json:"reserved_stock"`
	AvailableStock       float64   `json:"available_stock"`
	TypePrice            string    `json:"type_price"`
	PriceWholesale       float64   `json:"price_wholesale"`
	AmountPriceWholesale int       `json:"amount_price_wholesale"`
	LowStock             bool      `json:"low_stock"`
	WarehouseRootCount   int       `json:"warehouse_root_count"`
	CarCount             int       `json:"car_count"`
	CarSummary           string    `json:"car_summary,omitempty"`
	CoverSystemFileID    *int64    `json:"cover_system_file_id,omitempty"`
}

func toItemBrowseJSON(r ItemBrowseRow) itemBrowseJSON {
	return itemBrowseJSON{
		ID: r.ID, ProductListID: r.ProductListID, SKU: r.SKU, Barcode: r.Barcode, Price: r.Price,
		Unit: r.Unit, QtyPerUnit: r.QtyPerUnit, MinimumStock: r.MinimumStock,
		IsActive: r.IsActive, IsStopped: r.IsStopped, UpdatedAt: r.UpdatedAt, Tag: r.Tag, IsNew: r.IsNew,
		ProductBrandID: r.ProductBrandID, ProductCategoryID: r.ProductCategoryID,
		Name: r.Name, BrandName: r.BrandName, CategoryName: r.CategoryName,
		TotalStock: r.TotalStock, ReservedStock: r.ReservedStock, AvailableStock: r.AvailableStock,
		TypePrice: r.TypePrice, PriceWholesale: r.PriceWholesale, AmountPriceWholesale: r.AmountPriceWholesale,
		LowStock:           r.LowStock,
		WarehouseRootCount: r.WarehouseRootCount, CarCount: r.CarCount, CarSummary: r.CarSummary,
		CoverSystemFileID: r.CoverSystemFileID,
	}
}

func (h *ItemHandler) ListBrowse(c *echo.Context) error {
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
	if id, err := parseOptionalIDParam(c.QueryParam("car_brand_id")); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid car_brand_id"})
	} else if id != nil {
		f.CarBrandID = id
	}
	if id, err := parseOptionalIDParam(c.QueryParam("product_attribute_model_id")); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid product_attribute_model_id"})
	} else if id != nil {
		f.ModelID = id
	}
	if y := strings.TrimSpace(c.QueryParam("car_year")); y != "" {
		var year int
		if _, err := fmt.Sscan(y, &year); err != nil || year < 1900 || year > 2100 {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid car_year"})
		}
		f.CarYear = &year
	}
	f.OEM = strings.TrimSpace(c.QueryParam("oem"))
	f.Refill = strings.TrimSpace(c.QueryParam("refill_filter"))
	if raw := strings.TrimSpace(c.QueryParam("ids")); raw != "" {
		// ponytail: max 100 ids per request; split batch if cart grows beyond.
		const maxIDs = 100
		for _, part := range strings.Split(raw, ",") {
			part = strings.TrimSpace(part)
			if part == "" {
				continue
			}
			id, err := strconv.ParseInt(part, 10, 64)
			if err != nil || id <= 0 {
				return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid ids"})
			}
			f.IDs = append(f.IDs, id)
			if len(f.IDs) > maxIDs {
				return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "too many ids"})
			}
		}
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

type stockCreateBody struct {
	BinID           int64   `json:"bin_id"`
	SupplierUserID  *int64  `json:"supplier_user_id"`
	OrderQuantity   float64 `json:"order_quantity"`
	OrderFreeGift   float64 `json:"order_free_gift"`
	Quantity        float64 `json:"quantity"`
	RemainQuantity  float64 `json:"remain_quantity"`
	CostPerUnit     float64 `json:"cost_per_unit"`
	DiscountPerUnit float64 `json:"discount_per_unit"`
	SellPrice       float64 `json:"sell_price"`
	IsUsed          bool    `json:"is_used"`
	ReceivedAt      *string `json:"received_at"`
	PoSKU           *string `json:"po_sku"`
}

func (h *ItemHandler) createStock(c *echo.Context) error {
	itemID, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	var body stockCreateBody
	if err := json.NewDecoder(c.Request().Body).Decode(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	in := StockCreateInput{
		BinID:           body.BinID,
		SupplierUserID:  body.SupplierUserID,
		OrderQuantity:   body.OrderQuantity,
		OrderFreeGift:   body.OrderFreeGift,
		Quantity:        body.Quantity,
		RemainQuantity:  body.RemainQuantity,
		CostPerUnit:     body.CostPerUnit,
		DiscountPerUnit: body.DiscountPerUnit,
		SellPrice:       body.SellPrice,
		IsUsed:          body.IsUsed,
	}
	if body.ReceivedAt != nil && strings.TrimSpace(*body.ReceivedAt) != "" {
		t, err := time.Parse("2006-01-02", strings.TrimSpace(*body.ReceivedAt))
		if err != nil {
			t, err = time.Parse(time.RFC3339, strings.TrimSpace(*body.ReceivedAt))
		}
		if err != nil {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid received_at"})
		}
		in.ReceivedAt = &t
	}
	if body.PoSKU != nil {
		sku := strings.TrimSpace(*body.PoSKU)
		if sku != "" {
			in.PoSKUSet = true
			in.PoSKU = sku
		}
	}
	stockID, err := h.repo.CreateStock(c.Request().Context(), itemID, in, httputil.ActorID(c))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		if errors.Is(err, ErrBinInUse) {
			return c.JSON(http.StatusConflict, api.ErrorBody{Code: "conflict", Message: "bin in use"})
		}
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "validation failed"})
		}
		applog.HTTPError(c, "create product item stock", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "create failed"})
	}
	return c.JSON(http.StatusCreated, map[string]any{"id": stockID})
}

type stockPatchBody struct {
	OrderQuantity   *float64 `json:"order_quantity"`
	OrderFreeGift   *float64 `json:"order_free_gift"`
	Quantity        *float64 `json:"quantity"`
	RemainQuantity  *float64 `json:"remain_quantity"`
	CostPerUnit     *float64 `json:"cost_per_unit"`
	DiscountPerUnit *float64 `json:"discount_per_unit"`
	SellPrice       *float64 `json:"sell_price"`
	IsUsed          *bool    `json:"is_used"`
	ReceivedAt      *string  `json:"received_at"`
	SupplierUserID  *int64   `json:"supplier_user_id"`
	PoSKU           *string  `json:"po_sku"`
}

func stockPatchInputFromBody(body stockPatchBody, raw map[string]json.RawMessage) (StockPatchInput, error) {
	in := StockPatchInput{
		OrderQuantity:   body.OrderQuantity,
		OrderFreeGift:   body.OrderFreeGift,
		Quantity:        body.Quantity,
		RemainQuantity:  body.RemainQuantity,
		CostPerUnit:     body.CostPerUnit,
		DiscountPerUnit: body.DiscountPerUnit,
		SellPrice:       body.SellPrice,
		IsUsed:          body.IsUsed,
	}
	if _, ok := raw["received_at"]; ok {
		if body.ReceivedAt == nil || strings.TrimSpace(*body.ReceivedAt) == "" {
			in.ReceivedAtClear = true
		} else {
			t, err := parseStockReceivedAt(*body.ReceivedAt)
			if err != nil {
				return in, err
			}
			in.ReceivedAtSet = true
			in.ReceivedAt = &t
		}
	}
	if _, ok := raw["supplier_user_id"]; ok {
		if body.SupplierUserID == nil {
			in.SupplierClear = true
		} else {
			in.SupplierSet = true
			in.SupplierUserID = body.SupplierUserID
		}
	}
	if _, ok := raw["po_sku"]; ok {
		if body.PoSKU == nil || strings.TrimSpace(*body.PoSKU) == "" {
			in.PoSKUClear = true
		} else {
			in.PoSKUSet = true
			in.PoSKU = strings.TrimSpace(*body.PoSKU)
		}
	}
	return in, nil
}

func (h *ItemHandler) patchStock(c *echo.Context) error {
	itemID, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	stockID, err := httputil.PathID(c, "stockId")
	if err != nil {
		return err
	}
	data, err := io.ReadAll(c.Request().Body)
	if err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(data, &raw); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	var body stockPatchBody
	if err := json.Unmarshal(data, &body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	in, err := stockPatchInputFromBody(body, raw)
	if err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "validation failed"})
	}
	if err := h.repo.UpdateStock(c.Request().Context(), itemID, stockID, in, httputil.ActorID(c)); err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "validation failed"})
		}
		applog.HTTPError(c, "patch product item stock", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "update failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *ItemHandler) deleteStock(c *echo.Context) error {
	itemID, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	stockID, err := httputil.PathID(c, "stockId")
	if err != nil {
		return err
	}
	if err := h.repo.DeleteStock(c.Request().Context(), itemID, stockID, httputil.ActorID(c)); err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		applog.HTTPError(c, "delete product item stock", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "delete failed"})
	}
	return c.NoContent(http.StatusNoContent)
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
		PlacementID   int64   `json:"placement_id"`
		BinID         int64   `json:"bin_id"`
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
	itemID, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	f, err := parseHistoryFilter(c)
	if err != nil {
		return historyFilterBadRequest(c, err)
	}
	f.ProductItemID = &itemID
	resp, err := h.repo.HistoryPurchase(c.Request().Context(), f)
	if err != nil {
		applog.HTTPError(c, "product item history purchase", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load purchase history"})
	}
	return c.JSON(http.StatusOK, resp)
}

func (h *ItemHandler) historySales(c *echo.Context) error {
	itemID, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	f, err := parseHistoryFilter(c)
	if err != nil {
		return historyFilterBadRequest(c, err)
	}
	f.ProductItemID = &itemID
	resp, err := h.repo.HistorySales(c.Request().Context(), f)
	if err != nil {
		applog.HTTPError(c, "product item history sales", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load sales history"})
	}
	return c.JSON(http.StatusOK, resp)
}

type ListHandler struct {
	itemRepo *ItemRepository
	listRepo *ListRepository
}

func NewListHandler(itemRepo *ItemRepository, listRepo *ListRepository) *ListHandler {
	return &ListHandler{itemRepo: itemRepo, listRepo: listRepo}
}

func (h *ListHandler) historyPurchase(c *echo.Context) error {
	listID, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	f, err := parseHistoryFilter(c)
	if err != nil {
		return historyFilterBadRequest(c, err)
	}
	f.ProductListID = &listID
	resp, err := h.itemRepo.HistoryPurchase(c.Request().Context(), f)
	if err != nil {
		applog.HTTPError(c, "product list history purchase", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load purchase history"})
	}
	return c.JSON(http.StatusOK, resp)
}

func (h *ListHandler) historySales(c *echo.Context) error {
	listID, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	f, err := parseHistoryFilter(c)
	if err != nil {
		return historyFilterBadRequest(c, err)
	}
	f.ProductListID = &listID
	resp, err := h.itemRepo.HistorySales(c.Request().Context(), f)
	if err != nil {
		applog.HTTPError(c, "product list history sales", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load sales history"})
	}
	return c.JSON(http.StatusOK, resp)
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
		if errors.Is(err, ErrBinInUse) {
			return c.JSON(http.StatusConflict, api.ErrorBody{Code: "bin_in_use", Message: "bin in use"})
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
