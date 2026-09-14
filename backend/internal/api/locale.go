package api

import (
	"strings"

	"github.com/labstack/echo/v5"
)

func LocaleFromRequest(c *echo.Context) string {
	if q := strings.TrimSpace(c.QueryParam("locale")); q != "" {
		return q
	}
	al := c.Request().Header.Get("Accept-Language")
	if al == "" {
		return "th"
	}
	part := strings.Split(al, ",")[0]
	part = strings.TrimSpace(strings.Split(part, ";")[0])
	if part == "" {
		return "th"
	}
	return part
}
