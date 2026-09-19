package order

import (
	"database/sql"

	"github.com/labstack/echo/v5"
)

func RegisterRoutes(g *echo.Group, db *sql.DB) {
	repo := NewCompareRepository(db)
	h := NewCompareHandler(repo)

	c := g.Group("/compares")
	c.GET("/tree", h.tree)
	c.GET("/rules", h.rules)
	c.PUT("/rules", h.putRules)
	c.GET("/export", h.export)
	c.POST("/import", h.importRules)
}
