package website

import "github.com/labstack/echo/v5"

func RegisterRoutes(g *echo.Group, h *LanguageHandler) {
	web := g.Group("/website")
	web.GET("/languages", h.list)
	web.GET("/languages/:id", h.get)
	web.POST("/languages", h.create)
	web.PATCH("/languages/reorder", h.reorder)
	web.PATCH("/languages/:id", h.patch)
	web.DELETE("/languages/:id", h.delete)
}
