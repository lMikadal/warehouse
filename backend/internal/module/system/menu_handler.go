package system

import (
	"net/http"
	"strings"

	"github.com/labstack/echo/v5"
	"github.com/lMikadal/warehouse/backend/internal/api"
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
	locale := localeFromRequest(c)
	filter := MenuListFilter{
		Page:   q.Page,
		Limit:  q.Limit,
		Locale: locale,
		Search: strings.TrimSpace(c.QueryParam("search")),
	}
	items, total, err := h.svc.List(c.Request().Context(), filter)
	if err != nil {
		applog.HTTPError(c, "list system menus", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to list menus"})
	}
	return c.JSON(http.StatusOK, api.NewListResponse(items, total, q))
}

func localeFromRequest(c *echo.Context) string {
	if q := strings.TrimSpace(c.QueryParam("locale")); q != "" {
		return q
	}
	al := c.Request().Header.Get("Accept-Language")
	if al == "" {
		return "th"
	}
	part := strings.Split(al, ",")[0]
	part = strings.TrimSpace(strings.Split(part, ";")[0])
	if part == "" {
		return "th"
	}
	return part
}
