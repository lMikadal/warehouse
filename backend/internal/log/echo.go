package log

import (
	"log/slog"

	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
	"github.com/lMikadal/warehouse/backend/internal/api"
)

// EchoMiddleware returns RequestID + structured request logging (register after Recover).
func EchoMiddleware() []echo.MiddlewareFunc {
	return []echo.MiddlewareFunc{
		middleware.RequestID(),
		middleware.RequestLoggerWithConfig(middleware.RequestLoggerConfig{
			Skipper: healthSkipper,
			LogMethod:     true,
			LogURI:        true,
			LogStatus:     true,
			LogLatency:    true,
			LogRequestID:  true,
			LogValuesFunc: logRequestValues,
		}),
	}
}

func healthSkipper(c *echo.Context) bool {
	return c.Request().URL.Path == api.V1Prefix+"/health"
}

func logRequestValues(c *echo.Context, v middleware.RequestLoggerValues) error {
	slog.Info("request",
		"method", v.Method,
		"uri", v.URI,
		"status", v.Status,
		"latency", v.Latency.String(),
		"request_id", v.RequestID,
	)
	return nil
}

// HTTPError logs a handler failure before returning 5xx (no bodies, tokens, or secrets).
func HTTPError(c *echo.Context, msg string, err error, attrs ...any) {
	args := make([]any, 0, 4+len(attrs))
	args = append(args, "error", err, "request_id", requestIDFromContext(c))
	args = append(args, attrs...)
	slog.Error(msg, args...)
}

func requestIDFromContext(c *echo.Context) string {
	if id := c.Request().Header.Get(echo.HeaderXRequestID); id != "" {
		return id
	}
	return c.Response().Header().Get(echo.HeaderXRequestID)
}
