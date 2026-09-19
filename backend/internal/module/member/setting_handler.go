package member

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/labstack/echo/v5"
	"github.com/lMikadal/warehouse/backend/internal/api"
	"github.com/lMikadal/warehouse/backend/internal/httputil"
	applog "github.com/lMikadal/warehouse/backend/internal/log"
)

type SettingHandler struct {
	k    SettingKind
	repo *SettingRepository
	rel  *RelationRepository
}

func NewSettingHandler(k SettingKind, repo *SettingRepository, rel *RelationRepository) *SettingHandler {
	return &SettingHandler{k: k, repo: repo, rel: rel}
}

type settingItem struct {
	ID        int64             `json:"id"`
	SKU       *string           `json:"sku,omitempty"`
	Name      string            `json:"name"`
	IsActive  bool              `json:"is_active"`
	UpdatedAt time.Time         `json:"updated_at"`
	Names     map[string]string `json:"names,omitempty"`
}

func settingItemFromRow(r SettingRow, includeNames bool) settingItem {
	item := settingItem{ID: r.ID, SKU: r.SKU, Name: r.Name, IsActive: r.IsActive, UpdatedAt: r.UpdatedAt}
	if includeNames && r.Names != nil {
		item.Names = r.Names
	}
	return item
}

func (h *SettingHandler) list(c *echo.Context) error {
	q := api.ParsePageQuery(c)
	f := SettingListFilter{Page: q.Page, Limit: q.Limit, Locale: api.LocaleFromRequest(c), Search: strings.TrimSpace(c.QueryParam("search"))}
	if v := strings.TrimSpace(c.QueryParam("is_active")); v != "" {
		active := v == "true" || v == "1"
		f.IsActive = &active
	}
	rows, total, err := h.repo.List(c.Request().Context(), h.k, f)
	if err != nil {
		applog.HTTPError(c, "list member setting", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to list"})
	}
	items := make([]settingItem, len(rows))
	for i, r := range rows {
		items[i] = settingItemFromRow(r, false)
	}
	return c.JSON(http.StatusOK, api.NewListResponse(items, int64(total), q))
}

func (h *SettingHandler) get(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	row, err := h.repo.Get(c.Request().Context(), h.k, id, api.LocaleFromRequest(c))
	if err != nil {
		applog.HTTPError(c, "get member setting", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load"})
	}
	if row == nil {
		return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
	}
	return c.JSON(http.StatusOK, settingItemFromRow(*row, true))
}

type settingCreateBody struct {
	SKU      *string   `json:"sku"`
	IsActive bool      `json:"is_active"`
	Names    namesBody `json:"names"`
	CreditIDs []int64  `json:"credit_ids,omitempty"`
	GroupIDs  []int64  `json:"group_ids,omitempty"`
}

func (h *SettingHandler) create(c *echo.Context) error {
	var body settingCreateBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	in := SettingCreateInput{
		SKU: body.SKU, IsActive: body.IsActive, Names: namesFromBody(body.Names.Th, body.Names.En), ActorID: httputil.ActorID(c),
	}
	id, err := h.repo.Create(c.Request().Context(), h.k, in)
	if err != nil {
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "validation failed"})
		}
		if errors.Is(err, ErrConflict) {
			return c.JSON(http.StatusConflict, api.ErrorBody{Code: "conflict", Message: "sku already exists"})
		}
		applog.HTTPError(c, "create member setting", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "create failed"})
	}
	if h.k == SettingBusiness && h.rel != nil && (len(body.CreditIDs) > 0 || len(body.GroupIDs) > 0) {
		if err := h.rel.SyncBusinessRelations(c.Request().Context(), id, body.CreditIDs, body.GroupIDs, httputil.ActorID(c)); err != nil {
			applog.HTTPError(c, "sync business relations", err)
			return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "relation_sync_failed", Message: "relation sync failed"})
		}
	}
	return c.JSON(http.StatusCreated, map[string]any{"id": id})
}

type settingPatchBody struct {
	SKU       optionalString `json:"sku"`
	IsActive  *bool          `json:"is_active"`
	Names     *namesBody     `json:"names"`
	CreditIDs []int64        `json:"credit_ids,omitempty"`
	GroupIDs  []int64        `json:"group_ids,omitempty"`
}

type optionalString struct {
	Set   bool
	Value *string
}

func (o *optionalString) UnmarshalJSON(b []byte) error {
	o.Set = true
	if string(b) == "null" {
		o.Value = nil
		return nil
	}
	var s string
	if err := json.Unmarshal(b, &s); err != nil {
		return err
	}
	o.Value = &s
	return nil
}

func (h *SettingHandler) patch(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	var body settingPatchBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	patch := SettingPatch{ActorID: httputil.ActorID(c), IsActive: body.IsActive}
	if body.SKU.Set {
		patch.SKUSet = true
		if body.SKU.Value != nil {
			v := strings.TrimSpace(*body.SKU.Value)
			if v == "" {
				patch.SKU = nil
			} else {
				patch.SKU = &v
			}
		}
	}
	if body.Names != nil {
		patch.Names = namesFromBody(body.Names.Th, body.Names.En)
	}
	err = h.repo.Update(c.Request().Context(), h.k, id, patch)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "validation failed"})
		}
		if errors.Is(err, ErrConflict) {
			return c.JSON(http.StatusConflict, api.ErrorBody{Code: "conflict", Message: "sku already exists"})
		}
		applog.HTTPError(c, "patch member setting", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "update failed"})
	}
	if h.k == SettingBusiness && h.rel != nil && (body.CreditIDs != nil || body.GroupIDs != nil) {
		credits, groups := body.CreditIDs, body.GroupIDs
		if credits == nil {
			credits = []int64{}
		}
		if groups == nil {
			groups = []int64{}
		}
		if err := h.rel.SyncBusinessRelations(c.Request().Context(), id, credits, groups, httputil.ActorID(c)); err != nil {
			applog.HTTPError(c, "sync business relations", err)
			return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "relation_sync_failed", Message: "relation sync failed"})
		}
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *SettingHandler) delete(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	if err := h.repo.SoftDelete(c.Request().Context(), h.k, id, httputil.ActorID(c)); err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		applog.HTTPError(c, "delete member setting", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "delete failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *SettingHandler) listBusinessRelations(c *echo.Context) error {
	businessID, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	rows, err := h.rel.ListByBusiness(c.Request().Context(), businessID, api.LocaleFromRequest(c))
	if err != nil {
		applog.HTTPError(c, "list business relations", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to list relations"})
	}
	return c.JSON(http.StatusOK, map[string]any{"items": rows})
}
