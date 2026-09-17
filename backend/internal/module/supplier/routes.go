package supplier

import (
	"database/sql"

	"github.com/labstack/echo/v5"
	"github.com/lMikadal/warehouse/backend/internal/module/setting"
)

func RegisterRoutes(g *echo.Group, db *sql.DB) {
	repo := NewRepository(db)
	langRepo := setting.NewLangRepository(db)
	h := NewHandler(repo, langRepo)

	g.GET("/users/filters", h.listFilters)
	g.GET("/users", h.list)
	g.GET("/users/:id", h.get)
	g.POST("/users", h.create)
	g.PATCH("/users/:id", h.patch)
	g.DELETE("/users/:id", h.delete)

	g.POST("/users/:id/contacts", h.createContact)
	g.PATCH("/users/:id/contacts/reorder", h.reorderContacts)
	g.PATCH("/users/:id/contacts/:contactId", h.patchContact)
	g.DELETE("/users/:id/contacts/:contactId", h.deleteContact)

	g.POST("/users/:id/banks", h.createBank)
	g.PATCH("/users/:id/banks/reorder", h.reorderBanks)
	g.PATCH("/users/:id/banks/:bankId", h.patchBank)
	g.DELETE("/users/:id/banks/:bankId", h.deleteBank)
}
