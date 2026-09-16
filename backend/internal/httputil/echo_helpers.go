package httputil

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/labstack/echo/v5"
	"github.com/lMikadal/warehouse/backend/internal/api"
	pkgauth "github.com/lMikadal/warehouse/backend/internal/auth"
)

// PathID parses a positive int64 route param and responds with invalid_request on failure.
func PathID(c *echo.Context, param string) (int64, error) {
	return pathIDWithCode(c, param, "invalid_request", "invalid id")
}

// PathIDValidation parses a positive int64 route param and responds with validation_error on failure.
func PathIDValidation(c *echo.Context, param string) (int64, error) {
	return pathIDWithCode(c, param, "validation_error", "invalid id")
}

func pathIDWithCode(c *echo.Context, param, code, message string) (int64, error) {
	raw := strings.TrimSpace(c.Param(param))
	id, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || id <= 0 {
		_ = c.JSON(http.StatusBadRequest, api.ErrorBody{Code: code, Message: message})
		return 0, err
	}
	return id, nil
}

// ActorID returns the authenticated user id from the request context, or 0.
func ActorID(c *echo.Context) int64 {
	if p, ok := pkgauth.PrincipalFrom(c); ok {
		return p.UserID
	}
	return 0
}

// ReorderBody is the standard flat sibling reorder payload.
type ReorderBody struct {
	DragID   int64 `json:"drag_id"`
	TargetID int64 `json:"target_id"`
}
