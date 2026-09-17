package warehouse

import (
	"database/sql"

	"github.com/labstack/echo/v5"
)

func RegisterRoutes(g *echo.Group, db *sql.DB) {
	repo := NewRepository(db)
	h := NewHandler(repo)
	g.GET("/lists", h.list)
	g.GET("/lists/:id/stats", h.stats)
	g.GET("/lists/:id/tree", h.tree)
	g.GET("/lists/:id", h.get)
	g.POST("/lists", h.create)
	g.PATCH("/lists/reorder", h.reorder)
	g.PATCH("/lists/move", h.move)
	g.PATCH("/lists/:id/conditions", h.patchConditions)
	g.PATCH("/lists/:id", h.patch)
	g.DELETE("/lists/:id", h.delete)
}
