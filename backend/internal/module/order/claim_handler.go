package order

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/lMikadal/warehouse/backend/internal/api"
	"github.com/lMikadal/warehouse/backend/internal/httputil"
	"github.com/labstack/echo/v5"
)

// ClaimHandler serves /v1/order/claims: the purchase-side desk that chases the supplier over what
// arrived wrong. A claim is one `purchase_order_item_reject` row, as in v1.
type ClaimHandler struct {
	repo     *ClaimRepository
	purchase *PurchaseRepository
}

func NewClaimHandler(repo *ClaimRepository, purchase *PurchaseRepository) *ClaimHandler {
	return &ClaimHandler{repo: repo, purchase: purchase}
}

func parseClaimListQuery(c *echo.Context) ClaimListQuery {
	p := api.ParsePageQuery(c)
	limit := p.Limit
	if v, err := strconv.Atoi(strings.TrimSpace(c.QueryParam("limit"))); err == nil && v > 0 {
		limit = v
	}
	return ClaimListQuery{
		Page:       p.Page,
		Limit:      limit,
		Search:     strings.TrimSpace(c.QueryParam("search")),
		Status:     strings.TrimSpace(c.QueryParam("status")),
		Resolution: strings.TrimSpace(c.QueryParam("resolution")),
		DateFrom:   strings.TrimSpace(c.QueryParam("date_from")),
		DateTo:     strings.TrimSpace(c.QueryParam("date_to")),
		SortBy:     strings.TrimSpace(c.QueryParam("sort_by")),
		SortOrder:  strings.TrimSpace(c.QueryParam("sort_order")),
	}
}

func (h *ClaimHandler) list(c *echo.Context) error {
	resp, err := h.repo.List(c.Request().Context(), parseClaimListQuery(c))
	if err != nil {
		return ticketError(c, "claim list", err, "failed to load list")
	}
	return c.JSON(http.StatusOK, resp)
}

func (h *ClaimHandler) count(c *echo.Context) error {
	resp, err := h.repo.Count(c.Request().Context(), parseClaimListQuery(c))
	if err != nil {
		return ticketError(c, "claim count", err, "failed to load counts")
	}
	return c.JSON(http.StatusOK, resp)
}

func (h *ClaimHandler) getByID(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	d, err := h.repo.GetByID(c.Request().Context(), h.purchase, id)
	if err != nil {
		if errors.Is(err, errClaimNotFound) {
			return ticketError(c, "claim get", ErrNotFound, "claim not found")
		}
		return ticketError(c, "claim get", err, "failed to load")
	}
	return c.JSON(http.StatusOK, d)
}

func (h *ClaimHandler) history(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	resp, err := h.repo.History(c.Request().Context(), id, api.LocaleFromRequest(c))
	if err != nil {
		return ticketError(c, "claim history", err, "failed to load history")
	}
	return c.JSON(http.StatusOK, resp)
}

// update is v1's single PUT: pick an outcome, note why, move the status.
func (h *ClaimHandler) update(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	body, err := decodeBody[ClaimUpdateInput](c)
	if err != nil {
		return err
	}
	res, err := h.repo.Update(c.Request().Context(), id, body, httputil.ActorID(c))
	if err != nil {
		if errors.Is(err, errClaimNotFound) {
			return ticketError(c, "claim update", ErrNotFound, "claim not found")
		}
		return ticketError(c, "claim update", err, err.Error())
	}
	return c.JSON(http.StatusOK, res)
}
