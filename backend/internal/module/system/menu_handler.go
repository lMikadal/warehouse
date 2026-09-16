package system

import (
	"database/sql"
	"errors"
	"net/http"
	"strings"

	"github.com/labstack/echo/v5"
	"github.com/lMikadal/warehouse/backend/internal/api"
	"github.com/lMikadal/warehouse/backend/internal/httputil"
	applog "github.com/lMikadal/warehouse/backend/internal/log"
)

type MenuHandler struct {
	svc      *MenuService
	menuPerm *MenuPermissionRepository
}

func newMenuHandler(svc *MenuService, menuPerm *MenuPermissionRepository) *MenuHandler {
	return &MenuHandler{svc: svc, menuPerm: menuPerm}
}

func (h *MenuHandler) permissionMatrix(c *echo.Context) error {
	locale := api.LocaleFromRequest(c)
	groups, err := h.menuPerm.PermissionMatrix(c.Request().Context(), locale)
	if err != nil {
		applog.HTTPError(c, "permission matrix", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load permission matrix"})
	}
	if groups == nil {
		groups = []PermissionMatrixGroup{}
	}
	return c.JSON(http.StatusOK, map[string]any{"groups": groups})
}

func (h *MenuHandler) list(c *echo.Context) error {
	q := api.ParsePageQuery(c)
	locale := api.LocaleFromRequest(c)
	filter := MenuListFilter{
		Page:   q.Page,
		Limit:  q.Limit,
		Locale: locale,
		Search: strings.TrimSpace(c.QueryParam("search")),
	}
	if v := strings.TrimSpace(c.QueryParam("is_active")); v != "" {
		active := v == "true" || v == "1"
		filter.IsActive = &active
	}
	sortCol := strings.TrimSpace(c.QueryParam("sort"))
	order := strings.ToLower(strings.TrimSpace(c.QueryParam("order")))
	if sortCol != "" && (order == "asc" || order == "desc") {
		filter.Sort = sortCol
		filter.Order = order
	}
	items, total, err := h.svc.List(c.Request().Context(), filter)
	if err != nil {
		applog.HTTPError(c, "list system menus", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to list menus"})
	}
	return c.JSON(http.StatusOK, api.NewListResponse(items, total, q))
}

func (h *MenuHandler) get(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	locale := api.LocaleFromRequest(c)
	item, err := h.svc.Get(c.Request().Context(), id, locale)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "menu not found"})
		}
		applog.HTTPError(c, "get system menu", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load menu"})
	}
	return c.JSON(http.StatusOK, item)
}

type menuNamesBody struct {
	Th string `json:"th"`
	En string `json:"en"`
}

type menuCreateBody struct {
	ParentID *int64        `json:"parent_id"`
	Module   string        `json:"module"`
	Path     *string       `json:"path"`
	IsActive *bool         `json:"is_active"`
	Names    menuNamesBody `json:"names"`
}

func (h *MenuHandler) create(c *echo.Context) error {
	var body menuCreateBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	if strings.TrimSpace(body.Module) == "" || strings.TrimSpace(body.Names.Th) == "" || strings.TrimSpace(body.Names.En) == "" {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "module and names required"})
	}
	active := true
	if body.IsActive != nil {
		active = *body.IsActive
	}
	actor := httputil.ActorID(c)
	item, err := h.svc.Create(c.Request().Context(), MenuCreateInput{
		ParentID: body.ParentID,
		Module:   strings.TrimSpace(body.Module),
		Path:     body.Path,
		IsActive: active,
		Names:    map[string]string{"th": strings.TrimSpace(body.Names.Th), "en": strings.TrimSpace(body.Names.En)},
		ActorID:  actor,
	})
	if err != nil {
		applog.HTTPError(c, "create menu", err)
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: err.Error()})
	}
	return c.JSON(http.StatusCreated, item)
}

type menuPatchBody struct {
	Names    *menuNamesBody `json:"names"`
	IsActive *bool          `json:"is_active"`
	ParentID *int64         `json:"parent_id"`
}

func (h *MenuHandler) patch(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	var body menuPatchBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	in := MenuUpdateInput{ActorID: httputil.ActorID(c)}
	if body.Names != nil {
		in.Names = map[string]string{"th": strings.TrimSpace(body.Names.Th), "en": strings.TrimSpace(body.Names.En)}
	}
	in.IsActive = body.IsActive
	in.ParentID = body.ParentID
	item, err := h.svc.Update(c.Request().Context(), id, in)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "menu not found"})
		}
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: err.Error()})
	}
	return c.JSON(http.StatusOK, item)
}

type menuMoveBody struct {
	DragID   int64  `json:"drag_id"`
	TargetID int64  `json:"target_id"`
	Zone     string `json:"zone"`
}

func (h *MenuHandler) move(c *echo.Context) error {
	var body menuMoveBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	if err := h.svc.Move(c.Request().Context(), body.DragID, body.TargetID, body.Zone, httputil.ActorID(c)); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: err.Error()})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *MenuHandler) delete(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	if err := h.svc.Delete(c.Request().Context(), id, httputil.ActorID(c)); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "menu not found"})
		}
		applog.HTTPError(c, "delete menu", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "delete failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

