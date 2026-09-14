package system

import "github.com/labstack/echo/v5"

func RegisterRoutes(g *echo.Group, menuSvc *MenuService, permSvc *PermissionService) {
	mh := newMenuHandler(menuSvc)
	ph := newPermissionHandler(permSvc)
	sys := g.Group("/system")
	sys.GET("/menus", mh.list)
	sys.POST("/menus", mh.create)
	sys.PATCH("/menus/move", mh.move)
	sys.PATCH("/menus/:id", mh.patch)
	sys.DELETE("/menus/:id", mh.delete)
	sys.GET("/permissions", ph.list)
	sys.PATCH("/permissions/:id", ph.patch)
}
