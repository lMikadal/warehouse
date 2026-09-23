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

type TicketHandler struct {
	repo     *TicketRepository
	sellers  *StoreSalesRepository
	formRead *SalesFormReadHandlers
}

func NewTicketHandler(repo *TicketRepository, sellers *StoreSalesRepository, formRead *SalesFormReadHandlers) *TicketHandler {
	return &TicketHandler{repo: repo, sellers: sellers, formRead: formRead}
}

func parseTicketListQuery(c *echo.Context) TicketListQuery {
	q := api.ParsePageQuery(c)
	out := TicketListQuery{
		Search:       strings.TrimSpace(c.QueryParam("search")),
		Status:       strings.TrimSpace(c.QueryParam("status")),
		DateFrom:     strings.TrimSpace(c.QueryParam("date_from")),
		DateTo:       strings.TrimSpace(c.QueryParam("date_to")),
		ExcludeDraft: strings.TrimSpace(c.QueryParam("exclude_draft")) == "true",
		Page:         q.Page,
		Limit:        q.Limit,
	}
	if v := strings.TrimSpace(c.QueryParam("created_by")); v != "" {
		if id, err := strconv.ParseInt(v, 10, 64); err == nil && id > 0 {
			out.CreatedBy = &id
		}
	}
	return out
}

func (h *TicketHandler) validateListQuery(ctx context.Context, q *TicketListQuery) error {
	if q.Status != "" {
		if _, ok := ticketStatuses[q.Status]; !ok {
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

func (h *TicketHandler) list(c *echo.Context) error {
	q := parseTicketListQuery(c)
	if err := h.validateListQuery(c.Request().Context(), &q); err != nil {
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid status"})
		}
		applog.HTTPError(c, "ticket list query", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load list"})
	}
	resp, err := h.repo.List(c.Request().Context(), q)
	if err != nil {
		applog.HTTPError(c, "ticket list", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load list"})
	}
	return c.JSON(http.StatusOK, resp)
}

func (h *TicketHandler) count(c *echo.Context) error {
	q := parseTicketListQuery(c)
	if err := h.validateListQuery(c.Request().Context(), &q); err != nil && !errors.Is(err, ErrValidation) {
		applog.HTTPError(c, "ticket count query", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load counts"})
	}
	resp, err := h.repo.Count(c.Request().Context(), q)
	if err != nil {
		applog.HTTPError(c, "ticket count", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load counts"})
	}
	return c.JSON(http.StatusOK, resp)
}

// filters serves the seller combobox plus the shared sales form facets (products, cars, settings).
func (h *TicketHandler) filters(c *echo.Context) error {
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
	resp, err := h.sellers.SellerFilters(c.Request().Context(), q.Page, q.Limit, strings.TrimSpace(c.QueryParam("search")), id)
	if err != nil {
		applog.HTTPError(c, "ticket filters", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load filters"})
	}
	return c.JSON(http.StatusOK, resp)
}

func (h *TicketHandler) getByID(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	d, err := h.repo.GetByID(c.Request().Context(), id)
	if err != nil {
		return ticketError(c, "ticket get", err, "failed to load")
	}
	return c.JSON(http.StatusOK, d)
}

func (h *TicketHandler) create(c *echo.Context) error {
	var body TicketCreateInput
	if err := json.NewDecoder(c.Request().Body).Decode(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid body"})
	}
	id, err := h.repo.Create(c.Request().Context(), body, httputil.ActorID(c))
	if err != nil {
		return ticketError(c, "ticket create", err, "failed to create")
	}
	return c.JSON(http.StatusCreated, map[string]any{"id": id})
}

func (h *TicketHandler) update(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	var body TicketUpdateInput
	if err := json.NewDecoder(c.Request().Body).Decode(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid body"})
	}
	if err := h.repo.Update(c.Request().Context(), id, body, httputil.ActorID(c)); err != nil {
		return ticketError(c, "ticket update", err, "failed to update")
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *TicketHandler) patchStatus(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	var body TicketStatusInput
	if err := json.NewDecoder(c.Request().Body).Decode(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid body"})
	}
	if err := h.repo.PatchStatus(c.Request().Context(), id, body.Status, httputil.ActorID(c)); err != nil {
		return ticketError(c, "ticket status", err, "failed to update status")
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *TicketHandler) patchCustomer(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	var body TicketCustomerInput
	if err := json.NewDecoder(c.Request().Body).Decode(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid body"})
	}
	if err := h.repo.PatchCustomer(c.Request().Context(), id, body, httputil.ActorID(c)); err != nil {
		return ticketError(c, "ticket customer", err, "failed to update customer")
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *TicketHandler) patchNote(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	var body TicketNoteInput
	if err := json.NewDecoder(c.Request().Body).Decode(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid body"})
	}
	if err := h.repo.PatchNote(c.Request().Context(), id, body.Note, httputil.ActorID(c)); err != nil {
		return ticketError(c, "ticket note", err, "failed to update note")
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *TicketHandler) delete(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	if err := h.repo.SoftDelete(c.Request().Context(), id, httputil.ActorID(c)); err != nil {
		return ticketError(c, "ticket delete", err, "failed to delete")
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *TicketHandler) createItem(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	var body TicketItemInput
	if err := json.NewDecoder(c.Request().Body).Decode(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid body"})
	}
	itemID, err := h.repo.CreateItem(c.Request().Context(), id, body, httputil.ActorID(c))
	if err != nil {
		return ticketError(c, "ticket item create", err, "failed to create item")
	}
	return c.JSON(http.StatusCreated, map[string]any{"id": itemID})
}

func (h *TicketHandler) updateItem(c *echo.Context) error {
	id, itemID, err := ticketPathIDs(c)
	if err != nil {
		return err
	}
	var body TicketItemInput
	if err := json.NewDecoder(c.Request().Body).Decode(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid body"})
	}
	if err := h.repo.UpdateItem(c.Request().Context(), id, itemID, body, httputil.ActorID(c)); err != nil {
		return ticketError(c, "ticket item update", err, "failed to update item")
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *TicketHandler) deleteItem(c *echo.Context) error {
	id, itemID, err := ticketPathIDs(c)
	if err != nil {
		return err
	}
	if err := h.repo.DeleteItem(c.Request().Context(), id, itemID, httputil.ActorID(c)); err != nil {
		return ticketError(c, "ticket item delete", err, "failed to delete item")
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *TicketHandler) patchItemStatus(c *echo.Context) error {
	id, itemID, err := ticketPathIDs(c)
	if err != nil {
		return err
	}
	var body TicketItemStatusInput
	if err := json.NewDecoder(c.Request().Body).Decode(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid body"})
	}
	if err := h.repo.PatchItemStatus(c.Request().Context(), id, itemID, body, httputil.ActorID(c)); err != nil {
		return ticketError(c, "ticket item status", err, "failed to update item status")
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *TicketHandler) createItemReject(c *echo.Context) error {
	id, itemID, err := ticketPathIDs(c)
	if err != nil {
		return err
	}
	var body TicketItemRejectInput
	if err := json.NewDecoder(c.Request().Body).Decode(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid body"})
	}
	rejectID, err := h.repo.CreateItemReject(c.Request().Context(), id, itemID, body, httputil.ActorID(c))
	if err != nil {
		return ticketError(c, "ticket item reject create", err, "failed to create reject")
	}
	return c.JSON(http.StatusCreated, map[string]any{"id": rejectID})
}

func (h *TicketHandler) patchItemRejectStatus(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	rejectID, err := strconv.ParseInt(c.Param("rejectId"), 10, 64)
	if err != nil || rejectID <= 0 {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid reject id"})
	}
	var body TicketItemRejectStatusInput
	if err := json.NewDecoder(c.Request().Body).Decode(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid body"})
	}
	if err := h.repo.PatchItemRejectStatus(c.Request().Context(), id, rejectID, body.Status, httputil.ActorID(c)); err != nil {
		return ticketError(c, "ticket item reject status", err, "failed to update reject")
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *TicketHandler) history(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	resp, err := h.repo.History(c.Request().Context(), id, api.LocaleFromRequest(c))
	if err != nil {
		return ticketError(c, "ticket history", err, "failed to load history")
	}
	return c.JSON(http.StatusOK, resp)
}

func ticketPathIDs(c *echo.Context) (int64, int64, error) {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return 0, 0, err
	}
	itemID, perr := strconv.ParseInt(c.Param("itemId"), 10, 64)
	if perr != nil || itemID <= 0 {
		return 0, 0, c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid item id"})
	}
	return id, itemID, nil
}

func ticketError(c *echo.Context, op string, err error, msg string) error {
	if errors.Is(err, ErrNotFound) {
		return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
	}
	if errors.Is(err, ErrValidation) {
		// Bare ErrValidation stays generic; wrapped reasons (fmt.Errorf("%w: …", ErrValidation))
		// surface so the UI can map them (e.g. occupied bin on receive).
		message := "invalid input"
		if detail := strings.TrimPrefix(err.Error(), ErrValidation.Error()+": "); detail != "" && detail != err.Error() {
			message = detail
		}
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: message})
	}
	applog.HTTPError(c, op, err)
	return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: msg})
}
