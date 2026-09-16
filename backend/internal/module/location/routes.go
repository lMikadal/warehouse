package location

import (
	"database/sql"

	"github.com/labstack/echo/v5"
)

func RegisterRoutes(g *echo.Group, db *sql.DB) {
	repo := NewRepository(db)
	h := NewHandler(repo)
	g.GET("/locations", h.list)
	g.GET("/locations/:id", h.get)
	g.POST("/locations", h.create)
	g.PATCH("/locations/reorder", h.reorder)
	g.PATCH("/locations/:id", h.patch)
	g.DELETE("/locations/:id", h.delete)
}
