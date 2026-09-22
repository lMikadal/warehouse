package order

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/lMikadal/warehouse/backend/internal/api"
	"github.com/lMikadal/warehouse/backend/internal/httputil"
	applog "github.com/lMikadal/warehouse/backend/internal/log"
	"github.com/labstack/echo/v5"
)

type PurchaseHandler struct {
	repo     *PurchaseRepository
	sellers  *StoreSalesRepository
	formRead *SalesFormReadHandlers
}

func NewPurchaseHandler(repo *PurchaseRepository, sellers *StoreSalesRepository, formRead *SalesFormReadHandlers) *PurchaseHandler {
	return &PurchaseHandler{repo: repo, sellers: sellers, formRead: formRead}
}

func optionalPathInt(c *echo.Context, key string) *int64 {
	v := strings.TrimSpace(c.QueryParam(key))
	if v == "" {
		return nil
	}
	id, err := strconv.ParseInt(v, 10, 64)
	if err != nil || id <= 0 {
		return nil
	}
	return &id
}

func optionalQueryFloat(c *echo.Context, key string) *float64 {
	v := strings.TrimSpace(c.QueryParam(key))
	if v == "" {
		return nil
	}
	n, err := strconv.ParseFloat(v, 64)
	if err != nil || n < 0 {
		return nil
	}
	return &n
}

func parsePurchaseListQuery(c *echo.Context) PurchaseListQuery {
	q := api.ParsePageQuery(c)
	return PurchaseListQuery{
		Search:     strings.TrimSpace(c.QueryParam("search")),
		Status:     strings.TrimSpace(c.QueryParam("status")),
		DateFrom:   strings.TrimSpace(c.QueryParam("date_from")),
		DateTo:     strings.TrimSpace(c.QueryParam("date_to")),
		CreatedBy:  optionalPathInt(c, "created_by"),
		SupplierID: optionalPathInt(c, "supplier_user_id"),
		RequestID:  optionalPathInt(c, "purchase_request_id"),

		GrandTotalMin: optionalQueryFloat(c, "grand_total_min"),
		GrandTotalMax: optionalQueryFloat(c, "grand_total_max"),
		SortBy:        strings.TrimSpace(c.QueryParam("sort_by")),
		SortOrder:     strings.TrimSpace(c.QueryParam("sort_order")),
		Page:          q.Page,
		Limit:         q.Limit,
	}
}

func (h *PurchaseHandler) validateListQuery(ctx context.Context, q *PurchaseListQuery) error {
	if q.Status != "" && q.Status != PurchaseOrderedStatusFilter {
		if _, ok := purchaseStatuses[q.Status]; !ok {
			return ErrValidation
		}
	}
	if q.CreatedBy == nil {
		return nil
	}
	ok, err := h.sellers.IsActiveAdminUser(ctx, *q.CreatedBy)
	if err != nil {
		return err
	}
	if !ok {
		q.CreatedBy = nil
	}
	return nil
}

func (h *PurchaseHandler) list(c *echo.Context) error {
	q := parsePurchaseListQuery(c)
	if err := h.validateListQuery(c.Request().Context(), &q); err != nil {
		return ticketError(c, "purchase list query", err, "failed to load list")
	}
	resp, err := h.repo.List(c.Request().Context(), q)
	if err != nil {
		return ticketError(c, "purchase list", err, "failed to load list")
	}
	return c.JSON(http.StatusOK, resp)
}

func (h *PurchaseHandler) count(c *echo.Context) error {
	q := parsePurchaseListQuery(c)
	_ = h.validateListQuery(c.Request().Context(), &q)
	resp, err := h.repo.Count(c.Request().Context(), q)
	if err != nil {
		return ticketError(c, "purchase count", err, "failed to load counts")
	}
	return c.JSON(http.StatusOK, resp)
}

// filters serves the buyer combobox plus the shared form facets (products, suppliers, settings).
func (h *PurchaseHandler) filters(c *echo.Context) error {
	facet := strings.TrimSpace(strings.ToLower(c.QueryParam("facet")))
	if facet != "" && facet != "sellers" && h.formRead != nil {
		return h.formRead.FormFilters(c)
	}
	q := api.ParsePageQuery(c)
	var id int64
	if v := optionalPathInt(c, "id"); v != nil {
		id = *v
	}
	resp, err := h.sellers.SellerFilters(c.Request().Context(), q.Page, q.Limit, strings.TrimSpace(c.QueryParam("search")), id)
	if err != nil {
		applog.HTTPError(c, "purchase filters", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load filters"})
	}
	return c.JSON(http.StatusOK, resp)
}

func (h *PurchaseHandler) getByID(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	d, err := h.repo.GetByID(c.Request().Context(), id)
	if err != nil {
		return ticketError(c, "purchase get", err, "failed to load")
	}
	return c.JSON(http.StatusOK, d)
}

func decodeBody[T any](c *echo.Context) (T, error) {
	var body T
	if err := json.NewDecoder(c.Request().Body).Decode(&body); err != nil {
		return body, c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid body"})
	}
	return body, nil
}

func (h *PurchaseHandler) create(c *echo.Context) error {
	body, err := decodeBody[PurchaseSaveInput](c)
	if err != nil {
		return err
	}
	id, err := h.repo.Create(c.Request().Context(), body, httputil.ActorID(c))
	if err != nil {
		return ticketError(c, "purchase create", err, "failed to create")
	}
	return c.JSON(http.StatusCreated, map[string]any{"id": id})
}

func (h *PurchaseHandler) update(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	body, err := decodeBody[PurchaseSaveInput](c)
	if err != nil {
		return err
	}
	if err := h.repo.Update(c.Request().Context(), id, body, httputil.ActorID(c)); err != nil {
		return ticketError(c, "purchase update", err, "failed to update")
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *PurchaseHandler) patchStatus(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	body, err := decodeBody[PurchaseStatusInput](c)
	if err != nil {
		return err
	}
	if err := h.repo.PatchStatus(c.Request().Context(), id, body.Status, httputil.ActorID(c)); err != nil {
		return ticketError(c, "purchase status", err, "failed to update status")
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *PurchaseHandler) patchWaiting(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	body, err := decodeBody[struct {
		IsWaiting bool `json:"is_waiting"`
	}](c)
	if err != nil {
		return err
	}
	if err := h.repo.PatchWaiting(c.Request().Context(), id, body.IsWaiting, httputil.ActorID(c)); err != nil {
		return ticketError(c, "purchase waiting", err, "failed to update")
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *PurchaseHandler) delete(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	if err := h.repo.SoftDelete(c.Request().Context(), id, httputil.ActorID(c)); err != nil {
		return ticketError(c, "purchase delete", err, "failed to delete")
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *PurchaseHandler) createItem(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	body, err := decodeBody[PurchaseItemInput](c)
	if err != nil {
		return err
	}
	itemID, err := h.repo.CreateItem(c.Request().Context(), id, body, httputil.ActorID(c))
	if err != nil {
		return ticketError(c, "purchase item create", err, "failed to create item")
	}
	return c.JSON(http.StatusCreated, map[string]any{"id": itemID})
}

func (h *PurchaseHandler) updateItem(c *echo.Context) error {
	id, itemID, err := ticketPathIDs(c)
	if err != nil {
		return err
	}
	body, err := decodeBody[PurchaseItemInput](c)
	if err != nil {
		return err
	}
	if err := h.repo.UpdateItem(c.Request().Context(), id, itemID, body, httputil.ActorID(c)); err != nil {
		return ticketError(c, "purchase item update", err, "failed to update item")
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *PurchaseHandler) deleteItem(c *echo.Context) error {
	id, itemID, err := ticketPathIDs(c)
	if err != nil {
		return err
	}
	if err := h.repo.DeleteItem(c.Request().Context(), id, itemID, httputil.ActorID(c)); err != nil {
		return ticketError(c, "purchase item delete", err, "failed to delete item")
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *PurchaseHandler) patchItemStatus(c *echo.Context) error {
	id, itemID, err := ticketPathIDs(c)
	if err != nil {
		return err
	}
	body, err := decodeBody[PurchaseItemStatusInput](c)
	if err != nil {
		return err
	}
	if err := h.repo.PatchItemStatus(c.Request().Context(), id, itemID, body, httputil.ActorID(c)); err != nil {
		return ticketError(c, "purchase item status", err, "failed to update item status")
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *PurchaseHandler) convertItemUnit(c *echo.Context) error {
	id, itemID, err := ticketPathIDs(c)
	if err != nil {
		return err
	}
	body, err := decodeBody[PurchaseConvertUnitInput](c)
	if err != nil {
		return err
	}
	res, err := h.repo.ConvertItemUnit(c.Request().Context(), id, itemID, body, httputil.ActorID(c))
	if err != nil {
		return ticketError(c, "purchase convert unit", err, "failed to convert unit")
	}
	return c.JSON(http.StatusCreated, res)
}

func (h *PurchaseHandler) revertItemUnit(c *echo.Context) error {
	id, itemID, err := ticketPathIDs(c)
	if err != nil {
		return err
	}
	if err := h.repo.RevertItemUnit(c.Request().Context(), id, itemID, httputil.ActorID(c)); err != nil {
		return ticketError(c, "purchase revert unit", err, "failed to revert unit")
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *PurchaseHandler) listPayments(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	resp, err := h.repo.ListPayments(c.Request().Context(), id)
	if err != nil {
		return ticketError(c, "purchase payments", err, "failed to load payments")
	}
	return c.JSON(http.StatusOK, map[string]any{"items": resp})
}

func (h *PurchaseHandler) createPayment(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	body, err := decodeBody[PurchasePaymentInput](c)
	if err != nil {
		return err
	}
	paymentID, err := h.repo.CreatePayment(c.Request().Context(), id, body, httputil.ActorID(c))
	if err != nil {
		return ticketError(c, "purchase payment create", err, "failed to create payment")
	}
	return c.JSON(http.StatusCreated, map[string]any{"id": paymentID})
}

func (h *PurchaseHandler) deletePayment(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	paymentID, perr := strconv.ParseInt(c.Param("paymentId"), 10, 64)
	if perr != nil || paymentID <= 0 {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid payment id"})
	}
	if err := h.repo.DeletePayment(c.Request().Context(), id, paymentID, httputil.ActorID(c)); err != nil {
		return ticketError(c, "purchase payment delete", err, "failed to delete payment")
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *PurchaseHandler) putFiles(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	body, err := decodeBody[PurchaseFileInput](c)
	if err != nil {
		return err
	}
	if err := h.repo.ReplaceFiles(c.Request().Context(), id, body.SystemFileIDs, httputil.ActorID(c)); err != nil {
		return ticketError(c, "purchase files", err, "failed to save files")
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *PurchaseHandler) stockHistory(c *echo.Context) error {
	productItemID := optionalPathInt(c, "product_item_id")
	if productItemID == nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "product_item_id is required"})
	}
	limit := 0
	if v := optionalPathInt(c, "limit"); v != nil {
		limit = int(*v)
	}
	resp, err := h.repo.StockHistory(c.Request().Context(), *productItemID, optionalPathInt(c, "supplier_user_id"), limit)
	if err != nil {
		return ticketError(c, "purchase stock history", err, "failed to load stock history")
	}
	return c.JSON(http.StatusOK, resp)
}

func (h *PurchaseHandler) history(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	resp, err := h.repo.History(c.Request().Context(), id, api.LocaleFromRequest(c))
	if err != nil {
		return ticketError(c, "purchase history", err, "failed to load history")
	}
	return c.JSON(http.StatusOK, resp)
}
