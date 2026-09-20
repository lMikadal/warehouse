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

	storeRepo := NewStoreSalesRepository(db)
	storeH := NewStoreSalesHandler(storeRepo)
	s := g.Group("/store-sales")
	s.GET("", storeH.list)
	s.GET("/count", storeH.count)
	s.GET("/filters", storeH.filters)
	s.POST("", storeH.create)
	s.GET("/:id", storeH.getByID)
	s.PATCH("/:id", storeH.update)
	s.PATCH("/:id/status", storeH.patchStatus)
	s.DELETE("/:id", storeH.delete)
}
