package auth

import (
	"net/http"
	"strings"

	"github.com/labstack/echo/v5"
	"github.com/lMikadal/warehouse/backend/internal/api"
	"github.com/lMikadal/warehouse/backend/internal/rbac"
)

func BearerMiddleware(issuer *TokenIssuer, rbac *RBAC) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c *echo.Context) error {
			hdr := c.Request().Header.Get("Authorization")
			if hdr == "" || !strings.HasPrefix(hdr, "Bearer ") {
				return c.JSON(http.StatusUnauthorized, api.ErrorBody{Code: "unauthorized", Message: "missing bearer token"})
			}
			tokenStr := strings.TrimSpace(strings.TrimPrefix(hdr, "Bearer "))
			claims, err := issuer.ParseAccess(tokenStr)
			if err != nil {
				return c.JSON(http.StatusUnauthorized, api.ErrorBody{Code: "unauthorized", Message: "invalid token"})
			}
			userID, err := claims.UserID()
			if err != nil {
				return c.JSON(http.StatusUnauthorized, api.ErrorBody{Code: "unauthorized", Message: "invalid token"})
			}
			active, err := rbac.SessionActive(c.Request().Context(), claims.ID)
			if err != nil {
				return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "auth check failed"})
			}
			if !active {
				return c.JSON(http.StatusUnauthorized, api.ErrorBody{Code: "unauthorized", Message: "session revoked"})
			}
			SetPrincipal(c, Principal{
				UserID:   userID,
				JTI:      claims.ID,
				UserType: claims.UserType,
				RoleID:   claims.RoleID,
			})
			return next(c)
		}
	}
}

func RequirePermission(rbac *RBAC) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c *echo.Context) error {
			p, ok := PrincipalFrom(c)
			if !ok {
				return c.JSON(http.StatusUnauthorized, api.ErrorBody{Code: "unauthorized", Message: "not authenticated"})
			}
			if p.UserType == "superadmin" {
				return next(c)
			}
			code, ok := routePermissionCode(c.Request().Method, c.Request().URL.Path)
			if !ok {
				return c.JSON(http.StatusForbidden, api.ErrorBody{Code: "forbidden", Message: "no permission mapping"})
			}
			if p.RoleID == nil {
				return c.JSON(http.StatusForbidden, api.ErrorBody{Code: "forbidden", Message: "no role assigned"})
			}
			allowed, err := rbac.HasPermission(c.Request().Context(), *p.RoleID, code)
			if err != nil {
				return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "permission check failed"})
			}
			if !allowed {
				return c.JSON(http.StatusForbidden, api.ErrorBody{Code: "forbidden", Message: "insufficient permission"})
			}
			return next(c)
		}
	}
}

func routePermissionCode(method, fullPath string) (string, bool) {
	path := fullPath
	if i := strings.Index(path, "/api/v1"); i >= 0 {
		path = path[i:]
	}
	return rbac.CodeForRoute(method, path)
}
