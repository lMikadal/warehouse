package system

import (
	"database/sql"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/labstack/echo/v5"
	"github.com/lMikadal/warehouse/backend/internal/api"
	pkgauth "github.com/lMikadal/warehouse/backend/internal/auth"
	applog "github.com/lMikadal/warehouse/backend/internal/log"
)

type MenuHandler struct {
	svc *MenuService
}

func newMenuHandler(svc *MenuService) *MenuHandler {
	return &MenuHandler{svc: svc}
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
	items, total, err := h.svc.List(c.Request().Context(), filter)
	if err != nil {
		applog.HTTPError(c, "list system menus", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to list menus"})
	}
	return c.JSON(http.StatusOK, api.NewListResponse(items, total, q))
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
	actor := actorID(c)
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
	id, err := pathID(c)
	if err != nil {
		return err
	}
	var body menuPatchBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	in := MenuUpdateInput{ActorID: actorID(c)}
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
	if err := h.svc.Move(c.Request().Context(), body.DragID, body.TargetID, body.Zone, actorID(c)); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: err.Error()})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *MenuHandler) delete(c *echo.Context) error {
	id, err := pathID(c)
	if err != nil {
		return err
	}
	if err := h.svc.Delete(c.Request().Context(), id, actorID(c)); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "menu not found"})
		}
		applog.HTTPError(c, "delete menu", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "delete failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

func pathID(c *echo.Context) (int64, error) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		_ = c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid id"})
		return 0, err
	}
	return id, nil
}

func actorID(c *echo.Context) int64 {
	if p, ok := pkgauth.PrincipalFrom(c); ok {
		return p.UserID
	}
	return 0
}
