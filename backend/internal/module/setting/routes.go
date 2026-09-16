package setting

import (
	"database/sql"

	"github.com/labstack/echo/v5"
)

func RegisterRoutes(g *echo.Group, db *sql.DB, purger FilePurger) {
	langRepo := NewLangRepository(db)
	codeRepo := NewCodeRepository(db)
	vatRepo := NewVatRepository(db)

	bank := NewLangHandler(LangBank, langRepo, purger)
	g.GET("/banks", bank.list)
	g.GET("/banks/:id", bank.get)
	g.POST("/banks", bank.create)
	g.PATCH("/banks/reorder", bank.reorder)
	g.PATCH("/banks/:id", bank.patch)
	g.DELETE("/banks/:id", bank.delete)

	pay := NewLangHandler(LangPaymentMethod, langRepo, nil)
	g.GET("/payment-methods", pay.list)
	g.GET("/payment-methods/:id", pay.get)
	g.POST("/payment-methods", pay.create)
	g.PATCH("/payment-methods/reorder", pay.reorder)
	g.PATCH("/payment-methods/:id", pay.patch)
	g.DELETE("/payment-methods/:id", pay.delete)

	sale := NewLangHandler(LangSaleChannel, langRepo, purger)
	g.GET("/sale-channels", sale.list)
	g.GET("/sale-channels/:id", sale.get)
	g.POST("/sale-channels", sale.create)
	g.PATCH("/sale-channels/reorder", sale.reorder)
	g.PATCH("/sale-channels/:id", sale.patch)
	g.DELETE("/sale-channels/:id", sale.delete)

	claim := NewLangHandler(LangClaimReason, langRepo, nil)
	g.GET("/claim-reasons", claim.list)
	g.GET("/claim-reasons/:id", claim.get)
	g.POST("/claim-reasons", claim.create)
	g.PATCH("/claim-reasons/reorder", claim.reorder)
	g.PATCH("/claim-reasons/:id", claim.patch)
	g.DELETE("/claim-reasons/:id", claim.delete)

	prefix := NewLangHandler(LangPrefix, langRepo, nil)
	g.GET("/prefixes", prefix.list)
	g.GET("/prefixes/:id", prefix.get)
	g.POST("/prefixes", prefix.create)
	g.PATCH("/prefixes/reorder", prefix.reorder)
	g.PATCH("/prefixes/:id", prefix.patch)
	g.DELETE("/prefixes/:id", prefix.delete)

	code := NewCodeHandler(codeRepo)
	g.GET("/codes", code.list)
	g.GET("/codes/:id", code.get)
	g.POST("/codes", code.create)
	g.PATCH("/codes/reorder", code.reorder)
	g.PATCH("/codes/:id", code.patch)
	g.DELETE("/codes/:id", code.delete)

	vat := NewVatHandler(vatRepo)
	g.GET("/vat", vat.getSingleton)
	g.PATCH("/vat/:id", vat.patch)
}
