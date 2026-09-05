package main

import (
	"log/slog"
	"os"

	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
	"github.com/lMikadal/warehouse/backend/internal/config"
	"github.com/lMikadal/warehouse/backend/internal/module/health"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	e := echo.New()
	e.Use(middleware.Recover())
	e.Use(middleware.RequestLoggerWithConfig(middleware.RequestLoggerConfig{
		Skipper: func(c *echo.Context) bool {
			return c.Request().URL.Path == "/health"
		},
		LogMethod: true,
		LogURI:    true,
		LogStatus: true,
		LogValuesFunc: func(c *echo.Context, v middleware.RequestLoggerValues) error {
			slog.Info("request", "method", v.Method, "uri", v.URI, "status", v.Status)
			return nil
		},
	}))

	health.RegisterRoutes(e)

	if err := e.Start(":" + cfg.Port); err != nil {
		slog.Error("failed to start server", "error", err)
		os.Exit(1)
	}
}
