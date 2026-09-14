package auth

import (
	"net/http"
	"strings"

	"github.com/labstack/echo/v5"
	"github.com/lMikadal/warehouse/backend/internal/api"
	pkgauth "github.com/lMikadal/warehouse/backend/internal/auth"
	applog "github.com/lMikadal/warehouse/backend/internal/log"
	"github.com/lMikadal/warehouse/backend/internal/module/system"
)

type Handler struct {
	svc    *Service
	navSvc *system.NavService
}

func NewHandler(svc *Service, navSvc *system.NavService) *Handler {
	return &Handler{svc: svc, navSvc: navSvc}
}

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type refreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type logoutRequest struct {
	RefreshToken string `json:"refresh_token"`
}

func (h *Handler) login(c *echo.Context) error {
	var req loginRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	req.Username = strings.TrimSpace(req.Username)
	if req.Username == "" || req.Password == "" {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "username and password required"})
	}
	ip := c.RealIP()
	ua := c.Request().UserAgent()
	pair, err := h.svc.Login(c.Request().Context(), req.Username, req.Password, ip, ua)
	if err != nil {
		switch err {
		case ErrInvalidCredentials:
			return c.JSON(http.StatusUnauthorized, api.ErrorBody{Code: "invalid_credentials", Message: msgInvalidCredentials(c)})
		case ErrAccountInactive:
			return c.JSON(http.StatusForbidden, api.ErrorBody{Code: "account_inactive", Message: "account is not active"})
		case ErrAccountLocked:
			return c.JSON(http.StatusForbidden, api.ErrorBody{Code: "account_locked", Message: "account is locked"})
		default:
			applog.HTTPError(c, "login", err)
			return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "login failed"})
		}
	}
	return c.JSON(http.StatusOK, pair)
}

func (h *Handler) refresh(c *echo.Context) error {
	var req refreshRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	if strings.TrimSpace(req.RefreshToken) == "" {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "refresh_token required"})
	}
	pair, err := h.svc.Refresh(c.Request().Context(), req.RefreshToken, c.RealIP(), c.Request().UserAgent())
	if err != nil {
		if err == ErrInvalidCredentials {
			return c.JSON(http.StatusUnauthorized, api.ErrorBody{Code: "invalid_token", Message: "invalid or expired refresh token"})
		}
		applog.HTTPError(c, "refresh", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "refresh failed"})
	}
	return c.JSON(http.StatusOK, pair)
}

func (h *Handler) logout(c *echo.Context) error {
	var refresh string
	var req logoutRequest
	_ = c.Bind(&req)
	refresh = req.RefreshToken
	jti := ""
	if p, ok := pkgauth.PrincipalFrom(c); ok {
		jti = p.JTI
	}
	if err := h.svc.Logout(c.Request().Context(), jti, refresh); err != nil {
		applog.HTTPError(c, "logout", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "logout failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *Handler) nav(c *echo.Context) error {
	p, ok := pkgauth.PrincipalFrom(c)
	if !ok {
		return c.JSON(http.StatusUnauthorized, api.ErrorBody{Code: "unauthorized", Message: "not authenticated"})
	}
	if h.navSvc == nil {
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "nav unavailable"})
	}
	out, err := h.navSvc.NavForPrincipal(c.Request().Context(), p)
	if err != nil {
		applog.HTTPError(c, "auth nav", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load nav"})
	}
	return c.JSON(http.StatusOK, out)
}

func (h *Handler) me(c *echo.Context) error {
	p, ok := pkgauth.PrincipalFrom(c)
	if !ok {
		return c.JSON(http.StatusUnauthorized, api.ErrorBody{Code: "unauthorized", Message: "not authenticated"})
	}
	profile, err := h.svc.Me(c.Request().Context(), p.UserID)
	if err != nil {
		applog.HTTPError(c, "me", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load profile"})
	}
	if profile == nil {
		return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "user not found"})
	}
	return c.JSON(http.StatusOK, profile)
}

func msgInvalidCredentials(c *echo.Context) string {
	al := c.Request().Header.Get("Accept-Language")
	if strings.HasPrefix(strings.ToLower(al), "en") {
		return "Invalid username or password"
	}
	return "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"
}
