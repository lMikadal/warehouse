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
	s.PATCH("/:id/shipping", storeH.patchShipping)
	s.PATCH("/:id/status", storeH.patchStatus)
	s.DELETE("/:id", storeH.delete)

	qRepo := NewQuotationRepository(db)
	qH := NewQuotationHandler(qRepo)
	q := g.Group("/quotations")
	q.GET("", qH.list)
	q.GET("/count", qH.count)
	q.GET("/filters", qH.filters)
	q.POST("", qH.create)
	q.GET("/:id", qH.getByID)
	q.PATCH("/:id", qH.update)
	q.PATCH("/:id/status", qH.patchStatus)
	q.POST("/:id/submit", qH.submit)
	q.POST("/:id/approve", qH.approve)
	q.POST("/:id/reject", qH.reject)
	q.POST("/:id/return", qH.returnForEdit)
	q.POST("/:id/accept", qH.accept)
	q.POST("/:id/payment", qH.payment)
	q.POST("/:id/picking", qH.picking)
	q.POST("/:id/duplicate", qH.duplicate)
	q.DELETE("/:id", qH.delete)
}
