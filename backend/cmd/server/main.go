package main

import (
	"context"
	"log/slog"
	"os"

	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
	"github.com/lMikadal/warehouse/backend/internal/api"
	"github.com/lMikadal/warehouse/backend/internal/config"
	"github.com/lMikadal/warehouse/backend/internal/infra"
	"github.com/lMikadal/warehouse/backend/internal/infra/postgres"
	applog "github.com/lMikadal/warehouse/backend/internal/log"
	"github.com/lMikadal/warehouse/backend/internal/module/health"
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

	e := echo.New()
	e.Use(middleware.Recover())
	for _, m := range applog.EchoMiddleware() {
		e.Use(m)
	}

	v1 := e.Group(api.V1Prefix)
	health.RegisterRoutes(v1)
	system.RegisterRoutes(v1, system.NewMenuService(system.NewMenuRepository(deps.DB)))

	if err := server.Listen(e, cfg.Port); err != nil {
		slog.Error("failed to start server", "error", err)
		os.Exit(1)
	}
}
