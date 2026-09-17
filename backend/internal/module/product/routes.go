package product

import (
	"database/sql"

	"github.com/labstack/echo/v5"
)

func RegisterRoutes(g *echo.Group, db *sql.DB) {
	repo := NewRepository(db)
	registerResource(g.Group("/categories"), repo, "category", true)
	registerResource(g.Group("/brands"), repo, "brand", false)
	registerResource(g.Group("/cars"), repo, "car", true)
}

func registerResource(g *echo.Group, repo *Repository, attrType string, allowMove bool) {
	h := NewHandler(repo, attrType)
	g.GET("", h.list)
	g.GET("/:id", h.get)
	g.POST("", h.create)
	g.PATCH("/reorder", h.reorder)
	if allowMove {
		g.PATCH("/move", h.move)
	}
	g.PATCH("/:id", h.patch)
	g.DELETE("/:id", h.delete)
}
