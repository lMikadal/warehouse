package system

import (
	"database/sql"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/labstack/echo/v5"
	"github.com/lMikadal/warehouse/backend/internal/api"
	applog "github.com/lMikadal/warehouse/backend/internal/log"
)

type PermissionHandler struct {
	svc *PermissionService
}

func newPermissionHandler(svc *PermissionService) *PermissionHandler {
	return &PermissionHandler{svc: svc}
}

func (h *PermissionHandler) list(c *echo.Context) error {
	q := api.ParsePageQuery(c)
	f := PermissionListFilter{Page: q.Page, Limit: q.Limit, Search: strings.TrimSpace(c.QueryParam("search")),
		Module: strings.TrimSpace(c.QueryParam("module")),
		Type:   strings.TrimSpace(c.QueryParam("type")),
		Action: strings.TrimSpace(c.QueryParam("action")),
	}
	if v := strings.TrimSpace(c.QueryParam("is_active")); v != "" {
		active := v == "true" || v == "1"
		f.IsActive = &active
	}
	items, total, err := h.svc.List(c.Request().Context(), f)
	if err != nil {
		applog.HTTPError(c, "list permissions", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to list permissions"})
	}
	return c.JSON(http.StatusOK, api.NewListResponse(items, total, q))
}

type permPatchBody struct {
	IsActive bool `json:"is_active"`
}

func (h *PermissionHandler) patch(c *echo.Context) error {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid id"})
	}
	var body permPatchBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	item, err := h.svc.SetActive(c.Request().Context(), id, body.IsActive, actorID(c))
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "permission not found"})
		}
		applog.HTTPError(c, "patch permission", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "update failed"})
	}
	return c.JSON(http.StatusOK, item)
}
