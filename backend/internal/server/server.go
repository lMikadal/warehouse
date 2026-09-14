package server

import "github.com/labstack/echo/v5"

func Listen(e *echo.Echo, port string) error {
	return e.Start(":" + port)
}
