package order

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/lMikadal/warehouse/backend/internal/api"
	"github.com/lMikadal/warehouse/backend/internal/httputil"
	"github.com/labstack/echo/v5"
)

// StoreClaimHandler serves /api/v1/order/store-claims (pick a payment, file a claim) and
// /api/v1/order/store-claim-lists (the filed documents). Both are the same table; they are two menus in
// v1 and two RBAC resources here, so they stay two route groups over one repository.
type StoreClaimHandler struct {
	repo     *StoreClaimRepository
	formRead *SalesFormReadHandlers
}

func NewStoreClaimHandler(repo *StoreClaimRepository, formRead *SalesFormReadHandlers) *StoreClaimHandler {
	return &StoreClaimHandler{repo: repo, formRead: formRead}
}

func (h *StoreClaimHandler) listPayments(c *echo.Context) error {
	q := api.ParsePageQuery(c)
	in := StoreClaimPaymentListQuery{
		Page:            q.Page,
		Limit:           q.Limit,
		Search:          strings.TrimSpace(c.QueryParam("search")),
		DateFrom:        strings.TrimSpace(c.QueryParam("date_from")),
		DateTo:          strings.TrimSpace(c.QueryParam("date_to")),
		PaymentCategory: strings.TrimSpace(c.QueryParam("payment_category")),
	}
	if in.PaymentCategory != "credit" && in.PaymentCategory != "payment" {
		in.PaymentCategory = ""
	}
	resp, err := h.repo.ListPayments(c.Request().Context(), in)
	if err != nil {
		return pickingError(c, "store claim payments", err, "failed to load list")
	}
	return c.JSON(http.StatusOK, resp)
}

func (h *StoreClaimHandler) getPayment(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	resp, err := h.repo.Payment(c.Request().Context(), id)
	if err != nil {
		return pickingError(c, "store claim payment", err, "failed to load payment")
	}
	return c.JSON(http.StatusOK, resp)
}

func (h *StoreClaimHandler) listClaims(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	resp, err := h.repo.Claims(c.Request().Context(), id, api.LocaleFromRequest(c))
	if err != nil {
		return pickingError(c, "store claim list", err, "failed to load claims")
	}
	return c.JSON(http.StatusOK, resp)
}

func (h *StoreClaimHandler) createClaim(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	var body StoreClaimCreateInput
	if err := json.NewDecoder(c.Request().Body).Decode(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid body"})
	}
	claimID, err := h.repo.Create(c.Request().Context(), id, body, httputil.ActorID(c))
	if err != nil {
		return pickingError(c, "store claim create", err, "failed to create claim")
	}
	return c.JSON(http.StatusCreated, map[string]any{"id": claimID})
}

func (h *StoreClaimHandler) parseListQuery(c *echo.Context) StoreClaimListQuery {
	q := api.ParsePageQuery(c)
	in := StoreClaimListQuery{
		Page:     q.Page,
		Limit:    q.Limit,
		Search:   strings.TrimSpace(c.QueryParam("search")),
		Type:     strings.TrimSpace(c.QueryParam("type")),
		Status:   strings.TrimSpace(c.QueryParam("status")),
		DateFrom: strings.TrimSpace(c.QueryParam("date_from")),
		DateTo:   strings.TrimSpace(c.QueryParam("date_to")),
	}
	if in.Type != "claim" && in.Type != "return" {
		in.Type = ""
	}
	if !containsString(storeClaimStatuses, in.Status) {
		in.Status = ""
	}
	return in
}

func (h *StoreClaimHandler) list(c *echo.Context) error {
	resp, err := h.repo.List(c.Request().Context(), h.parseListQuery(c))
	if err != nil {
		return pickingError(c, "store claim docs", err, "failed to load list")
	}
	return c.JSON(http.StatusOK, resp)
}

func (h *StoreClaimHandler) count(c *echo.Context) error {
	resp, err := h.repo.Count(c.Request().Context(), h.parseListQuery(c))
	if err != nil {
		return pickingError(c, "store claim counts", err, "failed to load counts")
	}
	return c.JSON(http.StatusOK, resp)
}

func (h *StoreClaimHandler) delete(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	if err := h.repo.Delete(c.Request().Context(), id, httputil.ActorID(c)); err != nil {
		return pickingError(c, "store claim delete", err, "failed to delete claim")
	}
	return c.NoContent(http.StatusNoContent)
}
