package admin

import (
	"database/sql"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/labstack/echo/v5"
	"github.com/lMikadal/warehouse/backend/internal/api"
	pkgauth "github.com/lMikadal/warehouse/backend/internal/auth"
	applog "github.com/lMikadal/warehouse/backend/internal/log"
)

type UserHandler struct {
	repo *UserRepository
}

func NewUserHandler(repo *UserRepository) *UserHandler {
	return &UserHandler{repo: repo}
}

type userListItem struct {
	ID          int64      `json:"id"`
	Username    string     `json:"username"`
	Email       *string    `json:"email,omitempty"`
	Type        string     `json:"type"`
	Status      string     `json:"status"`
	AdminRoleID *int64     `json:"admin_role_id,omitempty"`
	RoleName    string     `json:"role_name,omitempty"`
	LastLoginAt *time.Time `json:"last_login_at,omitempty"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

func (h *UserHandler) list(c *echo.Context) error {
	q := api.ParsePageQuery(c)
	f := UserListFilter{Page: q.Page, Limit: q.Limit, Locale: api.LocaleFromRequest(c), Search: strings.TrimSpace(c.QueryParam("search")),
		Type: strings.TrimSpace(c.QueryParam("type")), Status: strings.TrimSpace(c.QueryParam("status"))}
	if rid := strings.TrimSpace(c.QueryParam("admin_role_id")); rid != "" {
		if id, err := strconv.ParseInt(rid, 10, 64); err == nil {
			f.AdminRoleID = &id
		}
	}
	rows, total, err := h.repo.List(c.Request().Context(), f)
	if err != nil {
		applog.HTTPError(c, "list users", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to list users"})
	}
	items := make([]userListItem, len(rows))
	for i, r := range rows {
		items[i] = toUserListItem(r)
	}
	return c.JSON(http.StatusOK, api.NewListResponse(items, total, q))
}

func (h *UserHandler) get(c *echo.Context) error {
	id, err := parseID(c)
	if err != nil {
		return err
	}
	row, err := h.repo.Get(c.Request().Context(), id)
	if err != nil {
		applog.HTTPError(c, "get user", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load user"})
	}
	if row == nil {
		return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "user not found"})
	}
	return c.JSON(http.StatusOK, toUserListItem(*row))
}

type userWriteBody struct {
	Username    string  `json:"username"`
	Email       string  `json:"email"`
	Password    string  `json:"password"`
	AdminRoleID int64   `json:"admin_role_id"`
	Type        string  `json:"type"`
	Status      string  `json:"status"`
}

func (h *UserHandler) create(c *echo.Context) error {
	var body userWriteBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	body.Username = strings.TrimSpace(body.Username)
	if body.Username == "" || body.Password == "" || body.AdminRoleID == 0 {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "username, password, role required"})
	}
	exists, err := h.repo.UsernameExists(c.Request().Context(), body.Username, 0)
	if err != nil {
		applog.HTTPError(c, "create user check", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "create failed"})
	}
	if exists {
		return c.JSON(http.StatusConflict, api.ErrorBody{Code: "conflict", Message: "username taken"})
	}
	hash, err := pkgauth.HashPassword(body.Password)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "create failed"})
	}
	userType := body.Type
	if userType == "" {
		userType = "staff"
	}
	status := body.Status
	if status == "" {
		status = "active"
	}
	id, err := h.repo.Create(c.Request().Context(), body.Username, body.Email, hash, userType, status, body.AdminRoleID, actorID(c))
	if err != nil {
		applog.HTTPError(c, "create user", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "create failed"})
	}
	return c.JSON(http.StatusCreated, map[string]any{"id": id})
}

type userPatchBody struct {
	Email       *string `json:"email"`
	Password    *string `json:"password"`
	AdminRoleID *int64  `json:"admin_role_id"`
	Type        *string `json:"type"`
	Status      *string `json:"status"`
}

func (h *UserHandler) patch(c *echo.Context) error {
	id, err := parseID(c)
	if err != nil {
		return err
	}
	var body userPatchBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	var hash *string
	if body.Password != nil && *body.Password != "" {
		h, err := pkgauth.HashPassword(*body.Password)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "update failed"})
		}
		hash = &h
	}
	if err := h.repo.Update(c.Request().Context(), id, body.Email, hash, body.Type, body.Status, body.AdminRoleID, actorID(c)); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "user not found"})
		}
		applog.HTTPError(c, "update user", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "update failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *UserHandler) delete(c *echo.Context) error {
	id, err := parseID(c)
	if err != nil {
		return err
	}
	if id == 1 {
		return c.JSON(http.StatusConflict, api.ErrorBody{Code: "forbidden", Message: "cannot delete bootstrap user"})
	}
	if err := h.repo.SoftDelete(c.Request().Context(), id, actorID(c)); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "user not found"})
		}
		applog.HTTPError(c, "delete user", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "delete failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

func toUserListItem(r UserRow) userListItem {
	item := userListItem{
		ID: r.ID, Username: r.Username, Type: r.Type, Status: r.Status, RoleName: r.RoleName,
		UpdatedAt: r.UpdatedAt.Time,
	}
	if r.Email.Valid {
		item.Email = &r.Email.String
	}
	if r.AdminRoleID.Valid {
		item.AdminRoleID = &r.AdminRoleID.Int64
	}
	if r.LastLoginAt.Valid {
		t := r.LastLoginAt.Time
		item.LastLoginAt = &t
	}
	return item
}

func actorID(c *echo.Context) int64 {
	if p, ok := pkgauth.PrincipalFrom(c); ok {
		return p.UserID
	}
	return 0
}
