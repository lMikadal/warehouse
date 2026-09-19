package order

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/labstack/echo/v5"
	"github.com/lMikadal/warehouse/backend/internal/api"
	pkgauth "github.com/lMikadal/warehouse/backend/internal/auth"
	applog "github.com/lMikadal/warehouse/backend/internal/log"
)

type CompareHandler struct {
	repo *CompareRepository
}

func NewCompareHandler(repo *CompareRepository) *CompareHandler {
	return &CompareHandler{repo: repo}
}

func (h *CompareHandler) tree(c *echo.Context) error {
	q := api.ParsePageQuery(c)
	locale := api.LocaleFromRequest(c)
	items, total, err := h.repo.ListBrandTree(c.Request().Context(), locale, q.Page, q.Limit, strings.TrimSpace(c.QueryParam("search")))
	if err != nil {
		applog.HTTPError(c, "order compare tree", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load tree"})
	}
	return c.JSON(http.StatusOK, api.NewListResponse(items, total, q))
}

func (h *CompareHandler) rules(c *echo.Context) error {
	brandID, err := int64Query(c, "brand_id")
	if err != nil || brandID <= 0 {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "brand_id required"})
	}
	var categoryID *int64
	if v := strings.TrimSpace(c.QueryParam("category_id")); v != "" {
		id, err := strconv.ParseInt(v, 10, 64)
		if err != nil || id <= 0 {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid category_id"})
		}
		categoryID = &id
	}
	locale := api.LocaleFromRequest(c)
	lines, err := h.repo.ListRules(c.Request().Context(), locale, brandID, categoryID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "brand not found"})
		}
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid scope"})
		}
		applog.HTTPError(c, "order compare rules", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load rules"})
	}
	return c.JSON(http.StatusOK, map[string]any{"items": lines})
}

type putRulesBody struct {
	BrandID    int64       `json:"brand_id"`
	CategoryID *int64      `json:"category_id"`
	Rules      []RuleWrite `json:"rules"`
}

func (h *CompareHandler) putRules(c *echo.Context) error {
	var body putRulesBody
	if err := json.NewDecoder(c.Request().Body).Decode(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid body"})
	}
	if body.BrandID <= 0 {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "brand_id required"})
	}
	actorID := int64(0)
	if p, ok := pkgauth.PrincipalFrom(c); ok {
		actorID = p.UserID
	}
	if err := h.repo.SaveRules(c.Request().Context(), body.BrandID, body.CategoryID, body.Rules, actorID); err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "brand not found"})
		}
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid rules"})
		}
		applog.HTTPError(c, "order compare save rules", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to save"})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *CompareHandler) export(c *echo.Context) error {
	locale := api.LocaleFromRequest(c)
	rows, err := h.repo.ExportAll(c.Request().Context(), locale)
	if err != nil {
		applog.HTTPError(c, "order compare export", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to export"})
	}
	return c.JSON(http.StatusOK, map[string]any{"items": rows})
}

func (h *CompareHandler) importRules(c *echo.Context) error {
	var body struct {
		Items []ImportRule `json:"items"`
	}
	if err := json.NewDecoder(c.Request().Body).Decode(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid body"})
	}
	actorID := int64(0)
	if p, ok := pkgauth.PrincipalFrom(c); ok {
		actorID = p.UserID
	}
	if err := h.repo.ImportRules(c.Request().Context(), body.Items, actorID); err != nil {
		if errors.Is(err, ErrValidation) || errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid import rows"})
		}
		applog.HTTPError(c, "order compare import", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to import"})
	}
	return c.NoContent(http.StatusNoContent)
}

func int64Query(c *echo.Context, key string) (int64, error) {
	v := strings.TrimSpace(c.QueryParam(key))
	if v == "" {
		return 0, errors.New("missing")
	}
	return strconv.ParseInt(v, 10, 64)
}
