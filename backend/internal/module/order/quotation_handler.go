package order

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/labstack/echo/v5"
	pkgauth "github.com/lMikadal/warehouse/backend/internal/auth"
	"github.com/lMikadal/warehouse/backend/internal/api"
	"github.com/lMikadal/warehouse/backend/internal/httputil"
	applog "github.com/lMikadal/warehouse/backend/internal/log"
)

type QuotationHandler struct {
	repo     *QuotationRepository
	formRead *SalesFormReadHandlers
}

func NewQuotationHandler(repo *QuotationRepository, formRead *SalesFormReadHandlers) *QuotationHandler {
	return &QuotationHandler{repo: repo, formRead: formRead}
}

func parseQuotationListQuery(c *echo.Context) QuotationListQuery {
	q := api.ParsePageQuery(c)
	out := QuotationListQuery{
		Search:   strings.TrimSpace(c.QueryParam("search")),
		Status:   strings.TrimSpace(c.QueryParam("status")),
		Overdue:  strings.TrimSpace(c.QueryParam("overdue")) == "true",
		DateFrom: strings.TrimSpace(c.QueryParam("date_from")),
		DateTo:   strings.TrimSpace(c.QueryParam("date_to")),
		Page:     q.Page,
		Limit:    q.Limit,
	}
	if v := strings.TrimSpace(c.QueryParam("created_by")); v != "" {
		if id, err := strconv.ParseInt(v, 10, 64); err == nil && id > 0 {
			out.CreatedBy = &id
		}
	}
	return out
}

func (h *QuotationHandler) applyCreatedByFilter(ctx context.Context, q *QuotationListQuery) error {
	if q.CreatedBy == nil {
		return nil
	}
	ok, err := h.repo.IsActiveAdminUser(ctx, *q.CreatedBy)
	if err != nil {
		return err
	}
	if !ok {
		q.CreatedBy = nil
	}
	return nil
}

func isSuperadmin(c *echo.Context) bool {
	p, ok := pkgauth.PrincipalFrom(c)
	return ok && p.UserType == "superadmin"
}

func (h *QuotationHandler) list(c *echo.Context) error {
	q := parseQuotationListQuery(c)
	if err := h.applyCreatedByFilter(c.Request().Context(), &q); err != nil {
		applog.HTTPError(c, "quotation list created_by", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load list"})
	}
	resp, err := h.repo.List(c.Request().Context(), q)
	if err != nil {
		applog.HTTPError(c, "quotation list", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load list"})
	}
	return c.JSON(http.StatusOK, resp)
}

func (h *QuotationHandler) count(c *echo.Context) error {
	q := parseQuotationListQuery(c)
	if err := h.applyCreatedByFilter(c.Request().Context(), &q); err != nil {
		applog.HTTPError(c, "quotation count created_by", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load counts"})
	}
	resp, err := h.repo.Count(c.Request().Context(), q)
	if err != nil {
		applog.HTTPError(c, "quotation count", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load counts"})
	}
	return c.JSON(http.StatusOK, resp)
}

func (h *QuotationHandler) filters(c *echo.Context) error {
	facet := strings.TrimSpace(strings.ToLower(c.QueryParam("facet")))
	if facet != "" && facet != "sellers" && h.formRead != nil {
		return h.formRead.FormFilters(c)
	}
	q := api.ParsePageQuery(c)
	search := strings.TrimSpace(c.QueryParam("search"))
	var id int64
	if v := strings.TrimSpace(c.QueryParam("id")); v != "" {
		if parsed, err := strconv.ParseInt(v, 10, 64); err == nil && parsed > 0 {
			id = parsed
		}
	}
	resp, err := h.repo.SellerFilters(c.Request().Context(), q.Page, q.Limit, search, id)
	if err != nil {
		applog.HTTPError(c, "quotation filters", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load filters"})
	}
	return c.JSON(http.StatusOK, resp)
}

func (h *QuotationHandler) getByID(c *echo.Context) error {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid id"})
	}
	d, err := h.repo.GetByID(c.Request().Context(), id)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		applog.HTTPError(c, "quotation get", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load"})
	}
	return c.JSON(http.StatusOK, d)
}

func (h *QuotationHandler) create(c *echo.Context) error {
	var body QuotationCreateInput
	if err := json.NewDecoder(c.Request().Body).Decode(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid body"})
	}
	id, err := h.repo.Create(c.Request().Context(), body, httputil.ActorID(c))
	if err != nil {
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid input"})
		}
		applog.HTTPError(c, "quotation create", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to create"})
	}
	return c.JSON(http.StatusCreated, map[string]any{"id": id})
}

func (h *QuotationHandler) update(c *echo.Context) error {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid id"})
	}
	var body QuotationUpdateInput
	if err := json.NewDecoder(c.Request().Body).Decode(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid body"})
	}
	sa := isSuperadmin(c)
	if err := h.repo.Update(c.Request().Context(), id, body, httputil.ActorID(c), sa); err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "not editable"})
		}
		applog.HTTPError(c, "quotation update", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to update"})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *QuotationHandler) patchStatus(c *echo.Context) error {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid id"})
	}
	var body QuotationStatusInput
	if err := json.NewDecoder(c.Request().Body).Decode(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid body"})
	}
	sa := isSuperadmin(c)
	if err := h.repo.PatchStatus(c.Request().Context(), id, body.Status, httputil.ActorID(c), sa); err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid status"})
		}
		applog.HTTPError(c, "quotation status", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to update status"})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *QuotationHandler) submit(c *echo.Context) error {
	return h.idAction(c, func(ctx context.Context, id int64, actor int64) error {
		return h.repo.Submit(ctx, id, actor)
	})
}

func (h *QuotationHandler) approve(c *echo.Context) error {
	if !isSuperadmin(c) {
		return c.JSON(http.StatusForbidden, api.ErrorBody{Code: "forbidden", Message: "superadmin required"})
	}
	return h.idAction(c, func(ctx context.Context, id int64, actor int64) error {
		return h.repo.Approve(ctx, id, actor)
	})
}

func (h *QuotationHandler) reject(c *echo.Context) error {
	if !isSuperadmin(c) {
		return c.JSON(http.StatusForbidden, api.ErrorBody{Code: "forbidden", Message: "superadmin required"})
	}
	return h.idAction(c, func(ctx context.Context, id int64, actor int64) error {
		return h.repo.Reject(ctx, id, actor)
	})
}

func (h *QuotationHandler) returnForEdit(c *echo.Context) error {
	if !isSuperadmin(c) {
		return c.JSON(http.StatusForbidden, api.ErrorBody{Code: "forbidden", Message: "superadmin required"})
	}
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid id"})
	}
	var body QuotationReturnInput
	if err := json.NewDecoder(c.Request().Body).Decode(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid body"})
	}
	if err := h.repo.ReturnForEdit(c.Request().Context(), id, body.Note, httputil.ActorID(c)); err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid return"})
		}
		applog.HTTPError(c, "quotation return", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *QuotationHandler) accept(c *echo.Context) error {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid id"})
	}
	var body QuotationAcceptInput
	if err := json.NewDecoder(c.Request().Body).Decode(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid body"})
	}
	if err := h.repo.Accept(c.Request().Context(), id, body, httputil.ActorID(c)); err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid accept"})
		}
		applog.HTTPError(c, "quotation accept", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to accept"})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *QuotationHandler) payment(c *echo.Context) error {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid id"})
	}
	var body QuotationPaymentInput
	if err := json.NewDecoder(c.Request().Body).Decode(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid body"})
	}
	if err := h.repo.Payment(c.Request().Context(), id, body, httputil.ActorID(c)); err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid payment"})
		}
		applog.HTTPError(c, "quotation payment", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to pay"})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *QuotationHandler) picking(c *echo.Context) error {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid id"})
	}
	var body QuotationPickingInput
	if c.Request().ContentLength > 0 {
		if err := json.NewDecoder(c.Request().Body).Decode(&body); err != nil {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid body"})
		}
	}
	resp, err := h.repo.Picking(c.Request().Context(), id, body, httputil.ActorID(c))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid picking"})
		}
		applog.HTTPError(c, "quotation picking", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to pick"})
	}
	return c.JSON(http.StatusOK, resp)
}

func (h *QuotationHandler) fulfillCheck(c *echo.Context) error {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid id"})
	}
	resp, err := h.repo.FulfillCheck(c.Request().Context(), id)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid fulfill check"})
		}
		applog.HTTPError(c, "quotation fulfill-check", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to check"})
	}
	return c.JSON(http.StatusOK, resp)
}

func (h *QuotationHandler) fulfill(c *echo.Context) error {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid id"})
	}
	var body QuotationFulfillInput
	if c.Request().ContentLength > 0 {
		if err := json.NewDecoder(c.Request().Body).Decode(&body); err != nil {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid body"})
		}
	}
	resp, err := h.repo.Fulfill(c.Request().Context(), id, body, httputil.ActorID(c))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		if errors.Is(err, ErrUnauthorized) {
			return c.JSON(http.StatusUnauthorized, api.ErrorBody{Code: "unauthorized", Message: "invalid credit approval code"})
		}
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid fulfill"})
		}
		applog.HTTPError(c, "quotation fulfill", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to fulfill"})
	}
	return c.JSON(http.StatusOK, resp)
}

func (h *QuotationHandler) duplicate(c *echo.Context) error {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid id"})
	}
	var body QuotationDuplicateInput
	if c.Request().ContentLength > 0 {
		_ = json.NewDecoder(c.Request().Body).Decode(&body)
	}
	newID, err := h.repo.Duplicate(c.Request().Context(), id, body, httputil.ActorID(c))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid duplicate"})
		}
		applog.HTTPError(c, "quotation duplicate", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to duplicate"})
	}
	return c.JSON(http.StatusCreated, map[string]any{"id": newID})
}

func (h *QuotationHandler) delete(c *echo.Context) error {
	return h.idAction(c, func(ctx context.Context, id int64, actor int64) error {
		return h.repo.Delete(ctx, id, actor)
	})
}

type quotationAction func(ctx context.Context, id int64, actor int64) error

func (h *QuotationHandler) idAction(c *echo.Context, fn quotationAction) error {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid id"})
	}
	if err := fn(c.Request().Context(), id, httputil.ActorID(c)); err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid action"})
		}
		applog.HTTPError(c, "quotation action", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed"})
	}
	return c.NoContent(http.StatusNoContent)
}
