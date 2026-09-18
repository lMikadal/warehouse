package member

import (
	"database/sql"

	"github.com/labstack/echo/v5"
)

func RegisterRoutes(g *echo.Group, db *sql.DB) {
	setRepo := NewSettingRepository(db)
	relRepo := NewRelationRepository(db)
	tierRepo := NewTierRepository(db)
	userRepo := NewUserRepository(db)

	credit := NewSettingHandler(SettingCredit, setRepo, relRepo)
	group := NewSettingHandler(SettingGroup, setRepo, relRepo)
	business := NewSettingHandler(SettingBusiness, setRepo, relRepo)
	rel := NewRelationHandler(relRepo)
	tier := NewTierHandler(tierRepo)
	user := NewUserHandler(userRepo)

	s := g.Group("/settings")
	s.GET("/credits", credit.list)
	s.GET("/credits/:id", credit.get)
	s.POST("/credits", credit.create)
	s.PATCH("/credits/:id", credit.patch)
	s.DELETE("/credits/:id", credit.delete)

	s.GET("/groups", group.list)
	s.GET("/groups/:id", group.get)
	s.POST("/groups", group.create)
	s.PATCH("/groups/:id", group.patch)
	s.DELETE("/groups/:id", group.delete)

	s.GET("/businesses", business.list)
	s.GET("/businesses/:id", business.get)
	s.POST("/businesses", business.create)
	s.PATCH("/businesses/:id", business.patch)
	s.DELETE("/businesses/:id", business.delete)
	s.GET("/businesses/:id/relations", business.listBusinessRelations)

	s.PATCH("/relations/:id", rel.patch)
	s.DELETE("/relations/:id", rel.delete)

	g.GET("/tiers", tier.list)
	g.GET("/tiers/:id", tier.get)
	g.POST("/tiers", tier.create)
	g.PATCH("/tiers/:id", tier.patch)
	g.DELETE("/tiers/:id", tier.delete)
	g.PATCH("/tiers/reorder", tier.reorder)
	g.PATCH("/tiers/move", tier.move)
	g.POST("/tiers/:id/relations", tier.createRelation)
	g.PATCH("/tiers/:id/relations/:relationId", tier.patchRelation)
	g.DELETE("/tiers/:id/relations/:relationId", tier.deleteRelation)

	g.GET("/users/filters", user.listFilters)
	g.GET("/users", user.list)
	g.GET("/users/:id", user.get)
	g.POST("/users", user.create)
	g.PATCH("/users/:id", user.patch)
	g.DELETE("/users/:id", user.delete)

	g.POST("/users/:id/files", user.createFile)
	g.PATCH("/users/:id/files/reorder", user.reorderFiles)
	g.DELETE("/users/:id/files/:fileId", user.deleteFile)

	g.POST("/users/:id/discounts", user.createDiscount)
	g.PATCH("/users/:id/discounts/:discountId", user.patchDiscount)
	g.DELETE("/users/:id/discounts/:discountId", user.deleteDiscount)

	g.POST("/users/:id/histories", user.createHistory)
}
