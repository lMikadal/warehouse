package system

import (
	"errors"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/lMikadal/warehouse/backend/internal/api"
	"github.com/lMikadal/warehouse/backend/internal/httputil"
	applog "github.com/lMikadal/warehouse/backend/internal/log"
	"github.com/labstack/echo/v5"
)

var localePattern = regexp.MustCompile(`^[a-z]{2,10}$`)

type LanguageHandler struct {
	repo *LanguageRepository
}

func NewLanguageHandler(repo *LanguageRepository) *LanguageHandler {
	return &LanguageHandler{repo: repo}
}

type languageItem struct {
	ID        int64     `json:"id"`
	Locale    string    `json:"locale"`
	Name      string    `json:"name"`
	SortOrder int       `json:"sort_order"`
	IsActive  bool      `json:"is_active"`
	IsDefault bool      `json:"is_default"`
	UpdatedAt time.Time `json:"updated_at"`
}

func rowToLanguageItem(r LanguageRow) languageItem {
	return languageItem{
		ID: r.ID, Locale: r.Locale, Name: r.Name, SortOrder: r.SortOrder,
		IsActive: r.IsActive, IsDefault: r.IsDefault, UpdatedAt: r.UpdatedAt,
	}
}

func (h *LanguageHandler) list(c *echo.Context) error {
	q := api.ParsePageQuery(c)
	f := LanguageListFilter{Page: q.Page, Limit: q.Limit, Search: strings.TrimSpace(c.QueryParam("search"))}
	if v := strings.TrimSpace(c.QueryParam("is_active")); v != "" {
		active := v == "true" || v == "1"
		f.IsActive = &active
	}
	sortCol := strings.TrimSpace(c.QueryParam("sort"))
	order := strings.ToLower(strings.TrimSpace(c.QueryParam("order")))
	if sortCol != "" && (order == "asc" || order == "desc") {
		f.Sort = sortCol
		f.Order = order
	}
	rows, total, err := h.repo.List(c.Request().Context(), f)
	if err != nil {
		applog.HTTPError(c, "list languages", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to list languages"})
	}
	items := make([]languageItem, len(rows))
	for i, r := range rows {
		items[i] = rowToLanguageItem(r)
	}
	return c.JSON(http.StatusOK, api.NewListResponse(items, total, q))
}

func (h *LanguageHandler) get(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	row, err := h.repo.Get(c.Request().Context(), id)
	if err != nil {
		applog.HTTPError(c, "get language", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load language"})
	}
	if row == nil {
		return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "language not found"})
	}
	return c.JSON(http.StatusOK, rowToLanguageItem(*row))
}

type languageCreateBody struct {
	Locale    string `json:"locale"`
	Name      string `json:"name"`
	IsActive  *bool  `json:"is_active"`
	IsDefault *bool  `json:"is_default"`
}

type languagePatchBody struct {
	Locale    *string `json:"locale"`
	Name      *string `json:"name"`
	IsActive  *bool   `json:"is_active"`
	IsDefault *bool   `json:"is_default"`
}

func (h *LanguageHandler) create(c *echo.Context) error {
	var body languageCreateBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	locale := strings.TrimSpace(body.Locale)
	name := strings.TrimSpace(body.Name)
	if !localePattern.MatchString(locale) || name == "" {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "locale and name required"})
	}
	active := true
	if body.IsActive != nil {
		active = *body.IsActive
	}
	isDefault := body.IsDefault != nil && *body.IsDefault
	id, err := h.repo.Create(c.Request().Context(), LanguageCreateInput{
		Locale: locale, Name: name, IsActive: active, IsDefault: isDefault, ActorID: httputil.ActorID(c),
	})
	if err != nil {
		if errors.Is(err, ErrLanguageDuplicateLocale) {
			return c.JSON(http.StatusConflict, api.ErrorBody{Code: "conflict", Message: "locale already exists"})
		}
		applog.HTTPError(c, "create language", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "create failed"})
	}
	return c.JSON(http.StatusCreated, map[string]any{"id": id})
}

func (h *LanguageHandler) patch(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	var body languagePatchBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	patch := LanguagePatch{ActorID: httputil.ActorID(c)}
	if body.Locale != nil {
		loc := strings.TrimSpace(*body.Locale)
		if !localePattern.MatchString(loc) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid locale"})
		}
		patch.Locale = &loc
	}
	if body.Name != nil {
		n := strings.TrimSpace(*body.Name)
		if n == "" {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "name required"})
		}
		patch.Name = &n
	}
	if body.IsActive != nil {
		patch.IsActive = body.IsActive
	}
	if body.IsDefault != nil {
		patch.IsDefault = body.IsDefault
	}
	if patch.Locale == nil && patch.Name == nil && patch.IsActive == nil && patch.IsDefault == nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "no fields to update"})
	}
	err = h.repo.Update(c.Request().Context(), id, patch)
	if err != nil {
		if errors.Is(err, ErrLanguageNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "language not found"})
		}
		if errors.Is(err, ErrLanguageDeactivateDefault) {
			return c.JSON(http.StatusConflict, api.ErrorBody{Code: "conflict", Message: "cannot deactivate default language"})
		}
		if errors.Is(err, ErrLanguageDuplicateLocale) {
			return c.JSON(http.StatusConflict, api.ErrorBody{Code: "conflict", Message: "locale already exists"})
		}
		applog.HTTPError(c, "patch language", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "update failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *LanguageHandler) delete(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	if err := h.repo.SoftDelete(c.Request().Context(), id, httputil.ActorID(c)); err != nil {
		if errors.Is(err, ErrLanguageNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "language not found"})
		}
		applog.HTTPError(c, "delete language", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "delete failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

type languageReorderBody struct {
	DragID   int64 `json:"drag_id"`
	TargetID int64 `json:"target_id"`
}

func (h *LanguageHandler) reorder(c *echo.Context) error {
	var body languageReorderBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	if body.DragID <= 0 || body.TargetID <= 0 {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "drag_id and target_id required"})
	}
	err := h.repo.Reorder(c.Request().Context(), body.DragID, body.TargetID, httputil.ActorID(c))
	if err != nil {
		if errors.Is(err, ErrLanguageInvalidReorder) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid reorder"})
		}
		applog.HTTPError(c, "reorder languages", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "reorder failed"})
	}
	return c.NoContent(http.StatusNoContent)
}
