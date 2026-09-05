package health

import (
	"net/http"

	"github.com/labstack/echo/v5"
)

func RegisterRoutes(g *echo.Group) {
	g.GET("/health", Health)
}

func Health(c *echo.Context) error {
	return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
}
