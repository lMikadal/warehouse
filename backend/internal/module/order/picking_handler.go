package order

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/lMikadal/warehouse/backend/internal/api"
	"github.com/lMikadal/warehouse/backend/internal/httputil"
	applog "github.com/lMikadal/warehouse/backend/internal/log"
	"github.com/labstack/echo/v5"
)

// PickingHandler serves /api/v1/order/orders, the picking-slip desk. Creating an extra slip and moving
// its shipping are the same writes the shop floor already does, so both reuse the store-sales repo.
type PickingHandler struct {
	repo     *PickingRepository
	store    *StoreSalesRepository
	formRead *SalesFormReadHandlers
}

func NewPickingHandler(repo *PickingRepository, store *StoreSalesRepository, formRead *SalesFormReadHandlers) *PickingHandler {
	return &PickingHandler{repo: repo, store: store, formRead: formRead}
}

func parsePickingListQuery(c *echo.Context) PickingListQuery {
	q := api.ParsePageQuery(c)
	out := PickingListQuery{
		Search:   strings.TrimSpace(c.QueryParam("search")),
		Status:   strings.TrimSpace(c.QueryParam("status")),
		DateFrom: strings.TrimSpace(c.QueryParam("date_from")),
		DateTo:   strings.TrimSpace(c.QueryParam("date_to")),
		Page:     q.Page,
		Limit:    q.Limit,
		RootOnly: strings.TrimSpace(c.QueryParam("root_only")) != "0",
	}
	if !containsString(pickingFulfillStatuses, out.Status) {
		out.Status = ""
	}
	if v := strings.TrimSpace(c.QueryParam("created_by")); v != "" {
		if id, err := strconv.ParseInt(v, 10, 64); err == nil && id > 0 {
			out.CreatedBy = &id
		}
	}
	return out
}

func (h *PickingHandler) applyCreatedByFilter(ctx context.Context, q *PickingListQuery) error {
	if q.CreatedBy == nil {
		return nil
	}
	ok, err := h.store.IsActiveAdminUser(ctx, *q.CreatedBy)
	if err != nil {
		return err
	}
	if !ok {
		q.CreatedBy = nil
	}
	return nil
}

// pickingError maps the repository errors onto the status codes the frontend already handles.
func pickingError(c *echo.Context, op string, err error, message string) error {
	switch {
	case errors.Is(err, ErrNotFound):
		return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
	case errors.Is(err, ErrValidation):
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: err.Error()})
	case errors.Is(err, ErrUnauthorized):
		return c.JSON(http.StatusUnauthorized, api.ErrorBody{Code: "unauthorized", Message: "invalid approval code"})
	default:
		applog.HTTPError(c, op, err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: message})
	}
}

func (h *PickingHandler) list(c *echo.Context) error {
	q := parsePickingListQuery(c)
	if err := h.applyCreatedByFilter(c.Request().Context(), &q); err != nil {
		return pickingError(c, "picking list created_by", err, "failed to load list")
	}
	resp, err := h.repo.List(c.Request().Context(), q)
	if err != nil {
		return pickingError(c, "picking list", err, "failed to load list")
	}
	return c.JSON(http.StatusOK, resp)
}

func (h *PickingHandler) count(c *echo.Context) error {
	q := parsePickingListQuery(c)
	if err := h.applyCreatedByFilter(c.Request().Context(), &q); err != nil {
		return pickingError(c, "picking count created_by", err, "failed to load counts")
	}
	resp, err := h.repo.Count(c.Request().Context(), q)
	if err != nil {
		return pickingError(c, "picking count", err, "failed to load counts")
	}
	return c.JSON(http.StatusOK, resp)
}

func (h *PickingHandler) filters(c *echo.Context) error {
	facet := strings.TrimSpace(strings.ToLower(c.QueryParam("facet")))
	if facet != "" && facet != "sellers" && h.formRead != nil {
		return h.formRead.FormFilters(c)
	}
	q := api.ParsePageQuery(c)
	var id int64
	if v := strings.TrimSpace(c.QueryParam("id")); v != "" {
		if parsed, err := strconv.ParseInt(v, 10, 64); err == nil && parsed > 0 {
			id = parsed
		}
	}
	resp, err := h.store.SellerFilters(c.Request().Context(), q.Page, q.Limit,
		strings.TrimSpace(c.QueryParam("search")), id)
	if err != nil {
		return pickingError(c, "picking filters", err, "failed to load filters")
	}
	return c.JSON(http.StatusOK, resp)
}

func (h *PickingHandler) family(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	resp, err := h.repo.Family(c.Request().Context(), id)
	if err != nil {
		return pickingError(c, "picking family", err, "failed to load")
	}
	return c.JSON(http.StatusOK, resp)
}

// create opens an extra slip under the same family, which is how v1 billed goods the customer added
// after the picker had already started.
func (h *PickingHandler) create(c *echo.Context) error {
	var body StoreSalesCreateInput
	if err := json.NewDecoder(c.Request().Body).Decode(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid body"})
	}
	if body.Status == "" {
		body.Status = "draft"
	}
	id, err := h.store.Create(c.Request().Context(), body, httputil.ActorID(c))
	if err != nil {
		return pickingError(c, "picking create", err, "failed to create")
	}
	return c.JSON(http.StatusCreated, map[string]any{"id": id})
}

func (h *PickingHandler) patchItem(c *echo.Context) error {
	orderID, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	itemID, err := strconv.ParseInt(c.Param("itemId"), 10, 64)
	if err != nil || itemID <= 0 {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid item id"})
	}
	var body PickingItemPatchInput
	if err := json.NewDecoder(c.Request().Body).Decode(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid body"})
	}
	item, err := h.repo.PatchItem(c.Request().Context(), orderID, itemID, body, httputil.ActorID(c))
	if err != nil {
		return pickingError(c, "picking patch item", err, "failed to update item")
	}
	return c.JSON(http.StatusOK, item)
}

func (h *PickingHandler) patchStatus(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	var body PickingStatusInput
	if err := json.NewDecoder(c.Request().Body).Decode(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid body"})
	}
	if err := h.repo.PatchStatus(c.Request().Context(), id, body.Status, httputil.ActorID(c)); err != nil {
		return pickingError(c, "picking patch status", err, "failed to update status")
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *PickingHandler) patchShipping(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	var body StoreSalesShippingInput
	if err := json.NewDecoder(c.Request().Body).Decode(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid body"})
	}
	if body.Type != "" && body.Type != "store" && body.Type != "parking" && body.Type != "delivery" {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid shipping type"})
	}
	if err := h.store.PatchShipping(c.Request().Context(), id, body); err != nil {
		return pickingError(c, "picking patch shipping", err, "failed to update shipping")
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *PickingHandler) payments(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	resp, err := h.repo.Payments(c.Request().Context(), id)
	if err != nil {
		return pickingError(c, "picking payments", err, "failed to load payments")
	}
	return c.JSON(http.StatusOK, resp)
}

func (h *PickingHandler) createPayment(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	var body PickingPaymentSaveInput
	if err := json.NewDecoder(c.Request().Body).Decode(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid body"})
	}
	pay, err := h.repo.SavePayment(c.Request().Context(), id, 0, body, httputil.ActorID(c))
	if err != nil {
		return pickingError(c, "picking create payment", err, "failed to save payment")
	}
	return c.JSON(http.StatusCreated, pay)
}

func (h *PickingHandler) updatePayment(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	payID, err := strconv.ParseInt(c.Param("paymentId"), 10, 64)
	if err != nil || payID <= 0 {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid payment id"})
	}
	var body PickingPaymentSaveInput
	if err := json.NewDecoder(c.Request().Body).Decode(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid body"})
	}
	pay, err := h.repo.SavePayment(c.Request().Context(), id, payID, body, httputil.ActorID(c))
	if err != nil {
		return pickingError(c, "picking update payment", err, "failed to save payment")
	}
	return c.JSON(http.StatusOK, pay)
}

func (h *PickingHandler) verifyCredit(c *echo.Context) error {
	return h.verifyApproval(c, "credit")
}

func (h *PickingHandler) verifyDiscount(c *echo.Context) error {
	return h.verifyApproval(c, "discount")
}

func (h *PickingHandler) verifyApproval(c *echo.Context, kind string) error {
	var body PickingApprovalInput
	if err := json.NewDecoder(c.Request().Body).Decode(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid body"})
	}
	userID, err := h.repo.VerifyApprovalCode(c.Request().Context(), kind, body.Code)
	if err != nil {
		return pickingError(c, "picking verify "+kind, err, "failed to verify")
	}
	return c.JSON(http.StatusOK, PickingApprovalResponse{UserID: userID})
}
