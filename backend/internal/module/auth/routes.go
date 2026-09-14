package auth

import "github.com/labstack/echo/v5"

func RegisterRoutes(g *echo.Group, h *Handler) {
	a := g.Group("/auth")
	a.POST("/login", h.login)
	a.POST("/refresh", h.refresh)
	a.POST("/logout", h.logout)
}

func RegisterAuthedRoutes(g *echo.Group, h *Handler) {
	g.GET("/auth/me", h.me)
	g.GET("/auth/nav", h.nav)
}
