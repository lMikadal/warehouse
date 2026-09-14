package admin

import (
	"database/sql"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/labstack/echo/v5"
	"github.com/lMikadal/warehouse/backend/internal/api"
	applog "github.com/lMikadal/warehouse/backend/internal/log"
)

type RoleHandler struct {
	repo *RoleRepository
}

func NewRoleHandler(repo *RoleRepository) *RoleHandler {
	return &RoleHandler{repo: repo}
}

type roleListItem struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	IsActive  bool      `json:"is_active"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (h *RoleHandler) list(c *echo.Context) error {
	q := api.ParsePageQuery(c)
	f := RoleListFilter{Page: q.Page, Limit: q.Limit, Locale: api.LocaleFromRequest(c), Search: strings.TrimSpace(c.QueryParam("search"))}
	if v := strings.TrimSpace(c.QueryParam("is_active")); v != "" {
		active := v == "true" || v == "1"
		f.IsActive = &active
	}
	rows, total, err := h.repo.List(c.Request().Context(), f)
	if err != nil {
		applog.HTTPError(c, "list roles", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to list roles"})
	}
	items := make([]roleListItem, len(rows))
	for i, r := range rows {
		items[i] = roleListItem{ID: r.ID, Name: r.Name, IsActive: r.IsActive, UpdatedAt: r.UpdatedAt.Time}
	}
	return c.JSON(http.StatusOK, api.NewListResponse(items, total, q))
}

type roleNames struct {
	Th string `json:"th"`
	En string `json:"en"`
}

type roleDetail struct {
	ID            int64     `json:"id"`
	IsActive      bool      `json:"is_active"`
	Names         roleNames `json:"names"`
	PermissionIDs []int64   `json:"permission_ids"`
}

func (h *RoleHandler) get(c *echo.Context) error {
	id, err := parseID(c)
	if err != nil {
		return err
	}
	names, permIDs, active, err := h.repo.Get(c.Request().Context(), id)
	if err != nil {
		applog.HTTPError(c, "get role", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load role"})
	}
	if names == nil {
		return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "role not found"})
	}
	return c.JSON(http.StatusOK, roleDetail{
		ID: id, IsActive: active, PermissionIDs: permIDs,
		Names: roleNames{Th: names["th"], En: names["en"]},
	})
}

type roleWriteBody struct {
	IsActive      *bool    `json:"is_active"`
	Names         *roleNames `json:"names"`
	PermissionIDs []int64  `json:"permission_ids"`
}

func (h *RoleHandler) create(c *echo.Context) error {
	var body roleWriteBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	if body.Names == nil || strings.TrimSpace(body.Names.Th) == "" || strings.TrimSpace(body.Names.En) == "" {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "names required"})
	}
	active := true
	if body.IsActive != nil {
		active = *body.IsActive
	}
	id, err := h.repo.Create(c.Request().Context(), active, map[string]string{"th": body.Names.Th, "en": body.Names.En}, body.PermissionIDs, actorID(c))
	if err != nil {
		applog.HTTPError(c, "create role", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "create failed"})
	}
	return c.JSON(http.StatusCreated, map[string]any{"id": id})
}

func (h *RoleHandler) patch(c *echo.Context) error {
	id, err := parseID(c)
	if err != nil {
		return err
	}
	if id == 1 {
		return c.JSON(http.StatusConflict, api.ErrorBody{Code: "forbidden", Message: "cannot modify bootstrap role"})
	}
	var body roleWriteBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	var names map[string]string
	if body.Names != nil {
		names = map[string]string{"th": body.Names.Th, "en": body.Names.En}
	}
	if err := h.repo.Update(c.Request().Context(), id, body.IsActive, names, body.PermissionIDs, actorID(c)); err != nil {
		applog.HTTPError(c, "update role", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "update failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *RoleHandler) delete(c *echo.Context) error {
	id, err := parseID(c)
	if err != nil {
		return err
	}
	if id == 1 {
		return c.JSON(http.StatusConflict, api.ErrorBody{Code: "forbidden", Message: "cannot delete bootstrap role"})
	}
	has, err := h.repo.HasActiveUsers(c.Request().Context(), id)
	if err != nil {
		applog.HTTPError(c, "delete role check", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "delete failed"})
	}
	if has {
		return c.JSON(http.StatusConflict, api.ErrorBody{Code: "conflict", Message: "role has active users"})
	}
	if err := h.repo.SoftDelete(c.Request().Context(), id, actorID(c)); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "role not found"})
		}
		applog.HTTPError(c, "delete role", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "delete failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

func parseID(c *echo.Context) (int64, error) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		_ = c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid id"})
		return 0, err
	}
	return id, nil
}
