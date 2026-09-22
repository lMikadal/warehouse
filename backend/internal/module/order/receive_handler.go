package order

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/lMikadal/warehouse/backend/internal/api"

	"github.com/lMikadal/warehouse/backend/internal/httputil"
	"github.com/labstack/echo/v5"
)

// ReceiveHandler serves /v1/order/receives. List and detail reuse the purchase repository — the receive
// screen works on the same orders, only narrowed to the ones that reached the paid stage — while the
// goods-in, reject and bin endpoints live in ReceiveRepository.
type ReceiveHandler struct {
	repo     *ReceiveRepository
	purchase *PurchaseRepository
	sellers  *StoreSalesRepository
	formRead *SalesFormReadHandlers
}

func NewReceiveHandler(repo *ReceiveRepository, purchase *PurchaseRepository, sellers *StoreSalesRepository, formRead *SalesFormReadHandlers) *ReceiveHandler {
	return &ReceiveHandler{repo: repo, purchase: purchase, sellers: sellers, formRead: formRead}
}

// receiveStatuses are the order statuses the receive desk may act on, replacing v1's
// RECEIVE_ALL_STATUSES. Anything earlier has not been paid for yet.
var receiveStatuses = []string{"completed", "receive_partial", "receive_completed"}

// ReceiveRejectStatusFilter is the chip for orders whose goods-in found something wrong. v1 had a
// receive_reject order status; here the evidence sits on the lines, so it is a filter, not a status.
const ReceiveRejectStatusFilter = "reject"

// applyReceiveScope forces the receive scope onto a list query so this endpoint can never expose
// unpaid orders, whatever status the caller asks for.
func applyReceiveScope(q *PurchaseListQuery) {
	if q.Status == ReceiveRejectStatusFilter {
		q.Status = ""
		q.StatusIn = receiveStatuses
		q.HasReceiveReject = true
		return
	}
	if q.Status == "" {
		q.StatusIn = receiveStatuses
		return
	}
	for _, allowed := range receiveStatuses {
		if q.Status == allowed {
			return
		}
	}
	q.Status = ""
	q.StatusIn = receiveStatuses
}

func (h *ReceiveHandler) list(c *echo.Context) error {
	q := parsePurchaseListQuery(c)
	applyReceiveScope(&q)
	resp, err := h.purchase.List(c.Request().Context(), q)
	if err != nil {
		return ticketError(c, "receive list", err, "failed to load list")
	}
	return c.JSON(http.StatusOK, resp)
}

func (h *ReceiveHandler) count(c *echo.Context) error {
	q := parsePurchaseListQuery(c)
	applyReceiveScope(&q)
	resp, err := h.purchase.Count(c.Request().Context(), q)
	if err != nil {
		return ticketError(c, "receive count", err, "failed to load counts")
	}
	// The reject chip counts orders, not lines, so by_item_status cannot answer it.
	rejectQ := q
	rejectQ.HasReceiveReject = true
	rejected, err := h.purchase.Count(c.Request().Context(), rejectQ)
	if err != nil {
		return ticketError(c, "receive reject count", err, "failed to load counts")
	}
	if resp.ByStatus == nil {
		resp.ByStatus = map[string]int64{}
	}
	resp.ByStatus[ReceiveRejectStatusFilter] = rejected.Count
	return c.JSON(http.StatusOK, resp)
}

func (h *ReceiveHandler) filters(c *echo.Context) error {
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
		return ticketError(c, "receive filters", err, "failed to load filters")
	}
	return c.JSON(http.StatusOK, resp)
}

func (h *ReceiveHandler) getByID(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	d, err := h.purchase.GetByID(c.Request().Context(), id)
	if err != nil {
		return ticketError(c, "receive get", err, "failed to load")
	}
	return c.JSON(http.StatusOK, d)
}

func (h *ReceiveHandler) history(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	resp, err := h.purchase.History(c.Request().Context(), id, api.LocaleFromRequest(c))
	if err != nil {
		return ticketError(c, "receive history", err, "failed to load history")
	}
	return c.JSON(http.StatusOK, resp)
}

// bins lists the placement candidates for one product item: free bins plus the bins already holding it.
func (h *ReceiveHandler) bins(c *echo.Context) error {
	productItemID, perr := strconv.ParseInt(strings.TrimSpace(c.QueryParam("product_item_id")), 10, 64)
	if perr != nil || productItemID <= 0 {
		return ticketError(c, "receive bins", ErrValidation, "product_item_id required")
	}
	limit, _ := strconv.Atoi(strings.TrimSpace(c.QueryParam("limit")))
	resp, err := h.repo.ListBins(c.Request().Context(), productItemID, c.QueryParam("search"), limit)
	if err != nil {
		return ticketError(c, "receive bins", err, "failed to load bins")
	}
	return c.JSON(http.StatusOK, resp)
}

func (h *ReceiveHandler) placements(c *echo.Context) error {
	id, itemID, err := ticketPathIDs(c)
	if err != nil {
		return err
	}
	resp, err := h.repo.Placements(c.Request().Context(), id, itemID)
	if err != nil {
		return ticketError(c, "receive placements", err, "failed to load placements")
	}
	return c.JSON(http.StatusOK, resp)
}

func (h *ReceiveHandler) receiveItem(c *echo.Context) error {
	id, itemID, err := ticketPathIDs(c)
	if err != nil {
		return err
	}
	body, err := decodeBody[ReceiveItemBody](c)
	if err != nil {
		return err
	}
	res, err := h.repo.ReceiveItem(c.Request().Context(), id, itemID, body, httputil.ActorID(c))
	if err != nil {
		return ticketError(c, "receive item", err, "failed to receive")
	}
	return c.JSON(http.StatusOK, res)
}

func (h *ReceiveHandler) createReject(c *echo.Context) error {
	id, itemID, err := ticketPathIDs(c)
	if err != nil {
		return err
	}
	body, err := decodeBody[ReceiveRejectInput](c)
	if err != nil {
		return err
	}
	rejectID, err := h.repo.CreateReject(c.Request().Context(), id, itemID, body, httputil.ActorID(c))
	if err != nil {
		return ticketError(c, "receive reject", err, "failed to save reject")
	}
	return c.JSON(http.StatusCreated, map[string]int64{"id": rejectID})
}

func (h *ReceiveHandler) rejects(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	resp, err := h.repo.Rejects(c.Request().Context(), id)
	if err != nil {
		return ticketError(c, "receive rejects", err, "failed to load rejects")
	}
	return c.JSON(http.StatusOK, resp)
}

// putFiles stores the delivery paperwork against the order, reusing the purchase attachment junction.
func (h *ReceiveHandler) putFiles(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	body, err := decodeBody[struct {
		SystemFileIDs []int64 `json:"system_file_ids"`
	}](c)
	if err != nil {
		return err
	}
	if err := h.purchase.ReplaceFiles(c.Request().Context(), id, body.SystemFileIDs, httputil.ActorID(c)); err != nil {
		return ticketError(c, "receive files", err, "failed to save files")
	}
	return c.NoContent(http.StatusNoContent)
}

// convertItemUnit and revertItemUnit repackage a line at goods-in (a box arrived as loose pieces).
func (h *ReceiveHandler) convertItemUnit(c *echo.Context) error {
	id, itemID, err := ticketPathIDs(c)
	if err != nil {
		return err
	}
	body, err := decodeBody[PurchaseConvertUnitInput](c)
	if err != nil {
		return err
	}
	res, err := h.purchase.ConvertItemUnit(c.Request().Context(), id, itemID, body, httputil.ActorID(c))
	if err != nil {
		return ticketError(c, "receive convert unit", err, "failed to convert unit")
	}
	return c.JSON(http.StatusOK, res)
}

func (h *ReceiveHandler) revertItemUnit(c *echo.Context) error {
	id, itemID, err := ticketPathIDs(c)
	if err != nil {
		return err
	}
	if err := h.purchase.RevertItemUnit(c.Request().Context(), id, itemID, httputil.ActorID(c)); err != nil {
		return ticketError(c, "receive revert unit", err, "failed to revert unit")
	}
	return c.NoContent(http.StatusNoContent)
}
