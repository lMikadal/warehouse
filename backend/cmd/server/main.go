package main

import (
	"context"
	"log/slog"
	"os"

	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
	"github.com/lMikadal/warehouse/backend/internal/api"
	pkgauth "github.com/lMikadal/warehouse/backend/internal/auth"
	"github.com/lMikadal/warehouse/backend/internal/config"
	"github.com/lMikadal/warehouse/backend/internal/infra"
	"github.com/lMikadal/warehouse/backend/internal/infra/postgres"
	applog "github.com/lMikadal/warehouse/backend/internal/log"
	"github.com/lMikadal/warehouse/backend/internal/module/admin"
	authmod "github.com/lMikadal/warehouse/backend/internal/module/auth"
	"github.com/lMikadal/warehouse/backend/internal/module/health"
	"github.com/lMikadal/warehouse/backend/internal/module/setting"
	"github.com/lMikadal/warehouse/backend/internal/module/system"
	"github.com/lMikadal/warehouse/backend/internal/server"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load config", "error", err)
		os.Exit(1)
	}
	applog.Setup(cfg)

	deps, err := infra.NewDeps(cfg)
	if err != nil {
		slog.Error("failed to init infrastructure", "error", err)
		os.Exit(1)
	}
	defer deps.Close()

	if cfg.ShouldAutoMigrate() {
		if err := postgres.MigrateUp(context.Background(), deps.DB); err != nil {
			slog.Error("failed to run migrations", "error", err)
			os.Exit(1)
		}
	}

	issuer, err := pkgauth.NewTokenIssuer(cfg.JWTSecret, cfg.JWTAccessTTL)
	if err != nil {
		slog.Error("jwt config", "error", err)
		os.Exit(1)
	}
	rbac := pkgauth.NewRBAC(deps.DB)

	e := echo.New()
	e.Use(middleware.Recover())
	for _, m := range applog.EchoMiddleware() {
		e.Use(m)
	}

	api.InitV1Prefix(cfg.APIV1Prefix)
	v1 := e.Group(api.V1Prefix)
	health.RegisterRoutes(v1)

	menuRepo := system.NewMenuRepository(deps.DB)
	menuPermRepo := system.NewMenuPermissionRepository(deps.DB)
	navSvc := system.NewNavService(menuRepo, menuPermRepo, rbac)

	authUsers := authmod.NewUserRepository(deps.DB)
	authSessions := authmod.NewSessionRepository(deps.DB)
	authSvc := authmod.NewService(authUsers, authSessions, issuer, cfg.JWTRefreshTTL, navSvc)
	authHandler := authmod.NewHandler(authSvc, navSvc)
	authmod.RegisterRoutes(v1, authHandler)

	menuSvc := system.NewMenuService(menuRepo)
	permRepo := system.NewPermissionRepository(deps.DB)
	permSvc := system.NewPermissionService(permRepo)

	roleRepo := admin.NewRoleRepository(deps.DB)
	userRepo := admin.NewUserRepository(deps.DB)
	roleHandler := admin.NewRoleHandler(roleRepo)
	userHandler := admin.NewUserHandler(userRepo, roleRepo)

	authed := v1.Group("", pkgauth.BearerMiddleware(issuer, rbac))
	authmod.RegisterAuthedRoutes(authed, authHandler)

	rbacProtected := v1.Group("", pkgauth.BearerMiddleware(issuer, rbac), pkgauth.RequirePermission(rbac))
	langRepo := system.NewLanguageRepository(deps.DB)
	langHandler := system.NewLanguageHandler(langRepo)
	geoRepo := system.NewAddressGeoRepository(deps.DB)
	system.RegisterRoutes(rbacProtected, menuSvc, menuPermRepo, permSvc, langHandler, geoRepo)
	admin.RegisterRoutes(rbacProtected.Group("/admin"), roleHandler, userHandler)
	setting.RegisterRoutes(rbacProtected.Group("/setting"), deps.DB)

	if err := server.Listen(e, cfg.Port); err != nil {
		slog.Error("failed to start server", "error", err)
		os.Exit(1)
	}
}
