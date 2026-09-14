package system

import "github.com/labstack/echo/v5"

func RegisterRoutes(g *echo.Group, menuSvc *MenuService) {
	h := newMenuHandler(menuSvc)
	sys := g.Group("/system")
	sys.GET("/menus", h.list)
}
