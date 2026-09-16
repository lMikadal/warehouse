package setting

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/labstack/echo/v5"
	"github.com/lMikadal/warehouse/backend/internal/api"
	applog "github.com/lMikadal/warehouse/backend/internal/log"
)

type CodeHandler struct {
	repo *CodeRepository
}

func NewCodeHandler(repo *CodeRepository) *CodeHandler {
	return &CodeHandler{repo: repo}
}

type codeItem struct {
	ID        int64     `json:"id"`
	Code      string    `json:"code"`
	Value     string    `json:"value"`
	SortOrder int       `json:"sort_order"`
	IsActive  bool      `json:"is_active"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (h *CodeHandler) list(c *echo.Context) error {
	q := api.ParsePageQuery(c)
	f := CodeListFilter{Page: q.Page, Limit: q.Limit, Search: strings.TrimSpace(c.QueryParam("search")),
		Sort: strings.TrimSpace(c.QueryParam("sort")), Order: strings.ToLower(strings.TrimSpace(c.QueryParam("order")))}
	if v := strings.TrimSpace(c.QueryParam("is_active")); v != "" {
		active := v == "true" || v == "1"
		f.IsActive = &active
	}
	rows, total, err := h.repo.List(c.Request().Context(), f)
	if err != nil {
		applog.HTTPError(c, "list setting codes", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to list"})
	}
	items := make([]codeItem, len(rows))
	for i, r := range rows {
		items[i] = codeItem(r)
	}
	return c.JSON(http.StatusOK, api.NewListResponse(items, int64(total), q))
}

func (h *CodeHandler) get(c *echo.Context) error {
	id, err := pathID(c)
	if err != nil {
		return err
	}
	row, err := h.repo.Get(c.Request().Context(), id)
	if err != nil {
		applog.HTTPError(c, "get setting code", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load"})
	}
	if row == nil {
		return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
	}
	return c.JSON(http.StatusOK, codeItem(*row))
}

func (h *CodeHandler) create(c *echo.Context) error {
	var body struct {
		Code     string `json:"code"`
		Value    string `json:"value"`
		IsActive bool   `json:"is_active"`
	}
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	id, err := h.repo.Create(c.Request().Context(), body.Code, body.Value, body.IsActive, actorID(c))
	if err != nil {
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "validation failed"})
		}
		if errors.Is(err, ErrConflict) {
			return c.JSON(http.StatusConflict, api.ErrorBody{Code: "conflict", Message: "code already taken"})
		}
		applog.HTTPError(c, "create setting code", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "create failed"})
	}
	return c.JSON(http.StatusCreated, map[string]any{"id": id})
}

func (h *CodeHandler) patch(c *echo.Context) error {
	id, err := pathID(c)
	if err != nil {
		return err
	}
	var body struct {
		Code     *string `json:"code"`
		Value    *string `json:"value"`
		IsActive *bool   `json:"is_active"`
	}
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	err = h.repo.Update(c.Request().Context(), id, body.Code, body.Value, body.IsActive, actorID(c))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "validation failed"})
		}
		if errors.Is(err, ErrConflict) {
			return c.JSON(http.StatusConflict, api.ErrorBody{Code: "conflict", Message: "code already taken"})
		}
		applog.HTTPError(c, "patch setting code", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "update failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *CodeHandler) delete(c *echo.Context) error {
	id, err := pathID(c)
	if err != nil {
		return err
	}
	if err := h.repo.SoftDelete(c.Request().Context(), id, actorID(c)); err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		applog.HTTPError(c, "delete setting code", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "delete failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *CodeHandler) reorder(c *echo.Context) error {
	var body reorderBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	if err := h.repo.Reorder(c.Request().Context(), body.DragID, body.TargetID, actorID(c)); err != nil {
		if errors.Is(err, ErrInvalidReorder) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid reorder"})
		}
		applog.HTTPError(c, "reorder setting codes", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "reorder failed"})
	}
	return c.NoContent(http.StatusNoContent)
}
