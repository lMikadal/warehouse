package order

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/labstack/echo/v5"
	"github.com/lMikadal/warehouse/backend/internal/api"
	"github.com/lMikadal/warehouse/backend/internal/httputil"
	applog "github.com/lMikadal/warehouse/backend/internal/log"
)

type StoreSalesHandler struct {
	repo *StoreSalesRepository
}

func NewStoreSalesHandler(repo *StoreSalesRepository) *StoreSalesHandler {
	return &StoreSalesHandler{repo: repo}
}

func parseStoreSalesListQuery(c *echo.Context) StoreSalesListQuery {
	q := api.ParsePageQuery(c)
	out := StoreSalesListQuery{
		Search:   strings.TrimSpace(c.QueryParam("search")),
		Status:   strings.TrimSpace(c.QueryParam("status")),
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

func (h *StoreSalesHandler) applyCreatedByFilter(ctx context.Context, q *StoreSalesListQuery) error {
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

func (h *StoreSalesHandler) list(c *echo.Context) error {
	q := parseStoreSalesListQuery(c)
	if err := h.applyCreatedByFilter(c.Request().Context(), &q); err != nil {
		applog.HTTPError(c, "store sales list created_by", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load list"})
	}
	resp, err := h.repo.List(c.Request().Context(), q)
	if err != nil {
		applog.HTTPError(c, "store sales list", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load list"})
	}
	return c.JSON(http.StatusOK, resp)
}

func (h *StoreSalesHandler) count(c *echo.Context) error {
	q := parseStoreSalesListQuery(c)
	if err := h.applyCreatedByFilter(c.Request().Context(), &q); err != nil {
		applog.HTTPError(c, "store sales count created_by", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load counts"})
	}
	resp, err := h.repo.Count(c.Request().Context(), q)
	if err != nil {
		applog.HTTPError(c, "store sales count", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load counts"})
	}
	return c.JSON(http.StatusOK, resp)
}

func (h *StoreSalesHandler) filters(c *echo.Context) error {
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
		applog.HTTPError(c, "store sales filters", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load filters"})
	}
	return c.JSON(http.StatusOK, resp)
}

func (h *StoreSalesHandler) getByID(c *echo.Context) error {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid id"})
	}
	d, err := h.repo.GetByID(c.Request().Context(), id)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		applog.HTTPError(c, "store sales get", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load"})
	}
	return c.JSON(http.StatusOK, d)
}

func (h *StoreSalesHandler) create(c *echo.Context) error {
	var body StoreSalesCreateInput
	if err := json.NewDecoder(c.Request().Body).Decode(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid body"})
	}
	id, err := h.repo.Create(c.Request().Context(), body, httputil.ActorID(c))
	if err != nil {
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid input"})
		}
		applog.HTTPError(c, "store sales create", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to create"})
	}
	return c.JSON(http.StatusCreated, map[string]any{"id": id})
}

func (h *StoreSalesHandler) update(c *echo.Context) error {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid id"})
	}
	var body StoreSalesUpdateInput
	if err := json.NewDecoder(c.Request().Body).Decode(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid body"})
	}
	if err := h.repo.Update(c.Request().Context(), id, body, httputil.ActorID(c)); err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "not editable"})
		}
		applog.HTTPError(c, "store sales update", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to update"})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *StoreSalesHandler) patchShipping(c *echo.Context) error {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid id"})
	}
	var body StoreSalesShippingInput
	if err := json.NewDecoder(c.Request().Body).Decode(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid body"})
	}
	if body.Type != "" && body.Type != "store" && body.Type != "parking" && body.Type != "delivery" {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid shipping type"})
	}
	if err := h.repo.PatchShipping(c.Request().Context(), id, body); err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "not editable"})
		}
		applog.HTTPError(c, "store sales shipping", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to update shipping"})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *StoreSalesHandler) patchStatus(c *echo.Context) error {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid id"})
	}
	var body StoreSalesStatusInput
	if err := json.NewDecoder(c.Request().Body).Decode(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid body"})
	}
	if err := h.repo.PatchStatus(c.Request().Context(), id, body.Status, httputil.ActorID(c)); err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid status"})
		}
		applog.HTTPError(c, "store sales status", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to update status"})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *StoreSalesHandler) delete(c *echo.Context) error {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid id"})
	}
	if err := h.repo.SoftDelete(c.Request().Context(), id, httputil.ActorID(c)); err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		applog.HTTPError(c, "store sales delete", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to delete"})
	}
	return c.NoContent(http.StatusNoContent)
}
