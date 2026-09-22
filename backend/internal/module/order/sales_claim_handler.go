package order

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/lMikadal/warehouse/backend/internal/api"
	"github.com/lMikadal/warehouse/backend/internal/httputil"
	"github.com/labstack/echo/v5"
)

// SalesClaimHandler serves /api/v1/order/sales-claims: the claims the shop floor filed, as purchasing
// sees them. v1 pinned its list to `type=claim`, so the type filter is fixed here rather than exposed.
type SalesClaimHandler struct {
	repo *SalesClaimRepository
}

func NewSalesClaimHandler(repo *SalesClaimRepository) *SalesClaimHandler {
	return &SalesClaimHandler{repo: repo}
}

func (h *SalesClaimHandler) parseQuery(c *echo.Context) StoreClaimListQuery {
	q := api.ParsePageQuery(c)
	in := StoreClaimListQuery{
		Page:     q.Page,
		Limit:    q.Limit,
		Search:   strings.TrimSpace(c.QueryParam("search")),
		Type:     "claim",
		Status:   strings.TrimSpace(c.QueryParam("status")),
		DateFrom: strings.TrimSpace(c.QueryParam("date_from")),
		DateTo:   strings.TrimSpace(c.QueryParam("date_to")),
	}
	if !containsString(storeClaimStatuses, in.Status) {
		in.Status = ""
	}
	return in
}

func (h *SalesClaimHandler) list(c *echo.Context) error {
	resp, err := h.repo.List(c.Request().Context(), h.parseQuery(c))
	if err != nil {
		return pickingError(c, "sales claims", err, "failed to load list")
	}
	return c.JSON(http.StatusOK, resp)
}

func (h *SalesClaimHandler) count(c *echo.Context) error {
	resp, err := h.repo.Count(c.Request().Context(), h.parseQuery(c))
	if err != nil {
		return pickingError(c, "sales claim counts", err, "failed to load counts")
	}
	return c.JSON(http.StatusOK, resp)
}

func (h *SalesClaimHandler) getByID(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	resp, err := h.repo.Detail(c.Request().Context(), id, api.LocaleFromRequest(c))
	if err != nil {
		return pickingError(c, "sales claim detail", err, "failed to load claim")
	}
	return c.JSON(http.StatusOK, resp)
}

func (h *SalesClaimHandler) patch(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	var body SalesClaimPatchInput
	if err := json.NewDecoder(c.Request().Body).Decode(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid body"})
	}
	if err := h.repo.Patch(c.Request().Context(), id, body, httputil.ActorID(c)); err != nil {
		return pickingError(c, "sales claim patch", err, "failed to update claim")
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *SalesClaimHandler) patchStatus(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	var body SalesClaimStatusInput
	if err := json.NewDecoder(c.Request().Body).Decode(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid body"})
	}
	if err := h.repo.UpdateStatus(c.Request().Context(), id, strings.TrimSpace(body.Status), httputil.ActorID(c)); err != nil {
		return pickingError(c, "sales claim status", err, "failed to update status")
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *SalesClaimHandler) patchItem(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	itemID, err := httputil.PathID(c, "itemId")
	if err != nil {
		return err
	}
	var body SalesClaimItemPatchInput
	if err := json.NewDecoder(c.Request().Body).Decode(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid body"})
	}
	if err := h.repo.PatchItem(c.Request().Context(), id, itemID, body, httputil.ActorID(c)); err != nil {
		return pickingError(c, "sales claim item", err, "failed to update item")
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *SalesClaimHandler) delete(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	if err := h.repo.Delete(c.Request().Context(), id, httputil.ActorID(c)); err != nil {
		return pickingError(c, "sales claim delete", err, "failed to delete claim")
	}
	return c.NoContent(http.StatusNoContent)
}
