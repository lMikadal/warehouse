package system

import "github.com/labstack/echo/v5"

func RegisterRoutes(g *echo.Group, menuSvc *MenuService, permSvc *PermissionService, langHandler *LanguageHandler, geoRepo *AddressGeoRepository) {
	mh := newMenuHandler(menuSvc)
	ph := newPermissionHandler(permSvc)
	sys := g.Group("/system")
	sys.GET("/menus", mh.list)
	sys.GET("/menus/:id", mh.get)
	sys.POST("/menus", mh.create)
	sys.PATCH("/menus/move", mh.move)
	sys.PATCH("/menus/:id", mh.patch)
	sys.DELETE("/menus/:id", mh.delete)
	sys.GET("/permissions", ph.list)
	sys.GET("/permissions/filters", ph.listFilters)
	sys.PATCH("/permissions/:id", ph.patch)
	sys.GET("/languages", langHandler.list)
	sys.GET("/languages/:id", langHandler.get)
	sys.POST("/languages", langHandler.create)
	sys.PATCH("/languages/reorder", langHandler.reorder)
	sys.PATCH("/languages/:id", langHandler.patch)
	sys.DELETE("/languages/:id", langHandler.delete)
	RegisterAddressGeoRoutes(sys, geoRepo)
}
