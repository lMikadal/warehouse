package admin

import "github.com/labstack/echo/v5"

func RegisterRoutes(g *echo.Group, roles *RoleHandler, users *UserHandler) {
	g.GET("/roles", roles.list)
	g.GET("/roles/:id", roles.get)
	g.POST("/roles", roles.create)
	g.PATCH("/roles/:id", roles.patch)
	g.DELETE("/roles/:id", roles.delete)

	g.GET("/users", users.list)
	g.GET("/users/filters", users.listFilters)
	g.GET("/users/:id", users.get)
	g.POST("/users", users.create)
	g.PATCH("/users/:id", users.patch)
	g.DELETE("/users/:id", users.delete)
}
