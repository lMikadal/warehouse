package product

import (
	"database/sql"

	"github.com/labstack/echo/v5"
	"github.com/lMikadal/warehouse/backend/internal/module/setting"
	"github.com/lMikadal/warehouse/backend/internal/module/supplier"
	"github.com/lMikadal/warehouse/backend/internal/module/warehouse"
)

func RegisterRoutes(g *echo.Group, db *sql.DB) {
	repo := NewRepository(db)
	langRepo := setting.NewLangRepository(db)
	filters := NewFiltersHandler(repo, supplier.NewRepository(db), langRepo, warehouse.NewRepository(db))

	categories := g.Group("/categories")
	categories.GET("/filters", filters.CategoryFilters)
	registerResource(categories, repo, "category", true)
	registerResource(g.Group("/brands"), repo, "brand", false)
	registerResource(g.Group("/cars"), repo, "car", true)

	itemRepo := NewItemRepository(db)
	listRepo := NewListRepository(db)
	itemH := NewItemHandler(itemRepo, listRepo)
	listH := NewListHandler(itemRepo, listRepo)

	items := g.Group("/items")
	items.GET("/filters", filters.ItemBrowseFilters)
	items.GET("", itemH.listBrowse)
	items.PATCH("/:id", itemH.patch)
	items.DELETE("/:id", itemH.delete)
	items.GET("/:id/warehouse-placements", itemH.warehousePlacements)
	items.GET("/:id/stocks", itemH.listStocks)
	items.POST("/:id/stocks", itemH.createStock)
	items.PATCH("/:id/stocks/:stockId", itemH.patchStock)
	items.DELETE("/:id/stocks/:stockId", itemH.deleteStock)
	items.GET("/:id/history/purchase", itemH.historyPurchase)
	items.GET("/:id/history/sales", itemH.historySales)

	lists := g.Group("/lists")
	lists.GET("/filters", filters.ListFilters)
	lists.POST("", listH.create)
	lists.GET("/:id", listH.get)
	lists.PATCH("/:id", listH.patch)
	lists.DELETE("/:id", listH.delete)
	lists.GET("/:id/cars", listH.listCars)
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
