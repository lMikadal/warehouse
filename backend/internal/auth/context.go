package auth

import "github.com/labstack/echo/v5"

const principalKey = "auth_principal"

type Principal struct {
	UserID   int64
	JTI      string
	UserType string
	RoleID   *int64
}

func SetPrincipal(c *echo.Context, p Principal) {
	c.Set(principalKey, p)
}

func PrincipalFrom(c *echo.Context) (Principal, bool) {
	v := c.Get(principalKey)
	if v == nil {
		return Principal{}, false
	}
	p, ok := v.(Principal)
	return p, ok
}
