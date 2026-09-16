package setting

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/labstack/echo/v5"
	"github.com/lMikadal/warehouse/backend/internal/api"
	applog "github.com/lMikadal/warehouse/backend/internal/log"
)

type LangHandler struct {
	k      LangKind
	repo   *LangRepository
	purger FilePurger
}

func NewLangHandler(k LangKind, repo *LangRepository, purger FilePurger) *LangHandler {
	return &LangHandler{k: k, repo: repo, purger: purger}
}

func langHasLogo(k LangKind) bool {
	return k == LangBank || k == LangSaleChannel
}

func int64PtrEqual(a, b *int64) bool {
	if a == nil && b == nil {
		return true
	}
	if a == nil || b == nil {
		return false
	}
	return *a == *b
}

func (h *LangHandler) purgeFileIfUnreferenced(ctx context.Context, fileID *int64, actorID int64) {
	if h.purger == nil || fileID == nil || *fileID <= 0 || !langHasLogo(h.k) {
		return
	}
	if err := h.purger.DeleteIfUnreferenced(ctx, *fileID, actorID); err != nil {
		slog.Warn("purge system file after setting change", "file_id", *fileID, "error", err)
	}
}

type langItem struct {
	ID                      int64             `json:"id"`
	Name                    string            `json:"name"`
	SortOrder               int               `json:"sort_order"`
	IsActive                bool              `json:"is_active"`
	UpdatedAt               time.Time         `json:"updated_at"`
	Names                   map[string]string `json:"names,omitempty"`
	IsSale                  *bool             `json:"is_sale,omitempty"`
	IsPurchase              *bool             `json:"is_purchase,omitempty"`
	IsDefault               *bool             `json:"is_default,omitempty"`
	IsClaim                 *bool             `json:"is_claim,omitempty"`
	IsReturn                *bool             `json:"is_return,omitempty"`
	SystemFileID            *int64            `json:"system_file_id,omitempty"`
	MemberSettingRelationID *int64            `json:"member_setting_relation_id,omitempty"`
	Type                    string            `json:"type,omitempty"`
	Code                    string            `json:"code,omitempty"`
}

func langItemFromRow(r LangRow, k LangKind, includeNames bool) langItem {
	item := langItem{
		ID: r.ID, Name: r.Name, SortOrder: r.SortOrder, IsActive: r.IsActive, UpdatedAt: r.UpdatedAt,
		SystemFileID: r.SystemFileID, MemberSettingRelationID: r.MemberSettingRelationID,
		Type: r.PrefixType, Code: r.Code,
	}
	if includeNames && r.Names != nil {
		item.Names = r.Names
	}
	if k == LangPaymentMethod {
		s, p := r.IsSale, r.IsPurchase
		item.IsSale, item.IsPurchase = &s, &p
	}
	if k == LangClaimReason {
		c, ret := r.IsClaim, r.IsReturn
		item.IsClaim, item.IsReturn = &c, &ret
	}
	if k == LangSaleChannel {
		d := r.IsDefault
		item.IsDefault = &d
	}
	return item
}

func (h *LangHandler) list(c *echo.Context) error {
	q := api.ParsePageQuery(c)
	f := LangListFilter{Page: q.Page, Limit: q.Limit, Locale: api.LocaleFromRequest(c), Search: strings.TrimSpace(c.QueryParam("search"))}
	if v := strings.TrimSpace(c.QueryParam("is_active")); v != "" {
		active := v == "true" || v == "1"
		f.IsActive = &active
	}
	if v := strings.TrimSpace(c.QueryParam("is_sale")); v != "" {
		b := v == "true" || v == "1"
		f.IsSale = &b
	}
	if v := strings.TrimSpace(c.QueryParam("is_purchase")); v != "" {
		b := v == "true" || v == "1"
		f.IsPurchase = &b
	}
	if v := strings.TrimSpace(c.QueryParam("is_claim")); v != "" {
		b := v == "true" || v == "1"
		f.IsClaim = &b
	}
	if v := strings.TrimSpace(c.QueryParam("is_return")); v != "" {
		b := v == "true" || v == "1"
		f.IsReturn = &b
	}
	f.PrefixType = strings.TrimSpace(c.QueryParam("type"))
	f.Sort = strings.TrimSpace(c.QueryParam("sort"))
	f.Order = strings.ToLower(strings.TrimSpace(c.QueryParam("order")))

	rows, total, err := h.repo.List(c.Request().Context(), h.k, f)
	if err != nil {
		applog.HTTPError(c, "list setting lang", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to list"})
	}
	items := make([]langItem, len(rows))
	for i, r := range rows {
		items[i] = langItemFromRow(r, h.k, false)
	}
	return c.JSON(http.StatusOK, api.NewListResponse(items, int64(total), q))
}

func (h *LangHandler) get(c *echo.Context) error {
	id, err := pathID(c)
	if err != nil {
		return err
	}
	row, err := h.repo.Get(c.Request().Context(), h.k, id, api.LocaleFromRequest(c))
	if err != nil {
		applog.HTTPError(c, "get setting lang", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load"})
	}
	if row == nil {
		return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
	}
	return c.JSON(http.StatusOK, langItemFromRow(*row, h.k, true))
}

type langCreateBody struct {
	IsActive                bool      `json:"is_active"`
	Names                   namesBody `json:"names"`
	IsSale                  bool      `json:"is_sale"`
	IsPurchase              bool      `json:"is_purchase"`
	IsDefault               bool      `json:"is_default"`
	IsClaim                 bool      `json:"is_claim"`
	IsReturn                bool      `json:"is_return"`
	SystemFileID            *int64    `json:"system_file_id"`
	MemberSettingRelationID *int64    `json:"member_setting_relation_id"`
	Type                    string    `json:"type"`
	Code                    string    `json:"code"`
}

func (h *LangHandler) create(c *echo.Context) error {
	var body langCreateBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	in := LangCreateInput{
		IsActive: body.IsActive, Names: namesFromBody(body.Names.Th, body.Names.En), ActorID: actorID(c),
		IsSale: body.IsSale, IsPurchase: body.IsPurchase, IsDefault: body.IsDefault,
		IsClaim: body.IsClaim, IsReturn: body.IsReturn,
		SystemFileID: body.SystemFileID, MemberSettingRelationID: body.MemberSettingRelationID,
		PrefixType: body.Type, Code: body.Code,
	}
	id, err := h.repo.Create(c.Request().Context(), h.k, in)
	if err != nil {
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "validation failed"})
		}
		if errors.Is(err, ErrConflict) {
			return c.JSON(http.StatusConflict, api.ErrorBody{Code: "conflict", Message: "code already taken"})
		}
		applog.HTTPError(c, "create setting lang", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "create failed"})
	}
	return c.JSON(http.StatusCreated, map[string]any{"id": id})
}

type langPatchBody struct {
	IsActive                *bool      `json:"is_active"`
	Names                   *namesBody `json:"names"`
	IsSale                  *bool      `json:"is_sale"`
	IsPurchase              *bool      `json:"is_purchase"`
	IsDefault               *bool      `json:"is_default"`
	IsClaim                 *bool      `json:"is_claim"`
	IsReturn                *bool      `json:"is_return"`
	SystemFileID            optionalInt64 `json:"system_file_id"`
	MemberSettingRelationID *int64        `json:"member_setting_relation_id"`
	Code                    *string       `json:"code"`
}

func (h *LangHandler) patch(c *echo.Context) error {
	id, err := pathID(c)
	if err != nil {
		return err
	}
	var body langPatchBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	patch := LangPatch{ActorID: actorID(c), IsActive: body.IsActive, IsSale: body.IsSale, IsPurchase: body.IsPurchase,
		IsDefault: body.IsDefault, IsClaim: body.IsClaim, IsReturn: body.IsReturn, Code: body.Code}
	if body.Names != nil {
		patch.Names = namesFromBody(body.Names.Th, body.Names.En)
	}
	if body.SystemFileID.Set {
		patch.SystemFileIDSet = true
		patch.SystemFileID = body.SystemFileID.Value
	}
	patch.MemberSettingRelationID = body.MemberSettingRelationID

	ctx := c.Request().Context()
	var oldFileID *int64
	if patch.SystemFileIDSet && langHasLogo(h.k) {
		row, getErr := h.repo.Get(ctx, h.k, id, "")
		if getErr == nil && row != nil {
			oldFileID = row.SystemFileID
		}
	}

	err = h.repo.Update(ctx, h.k, id, patch)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "validation failed"})
		}
		if errors.Is(err, ErrConflict) {
			return c.JSON(http.StatusConflict, api.ErrorBody{Code: "conflict", Message: "code already taken"})
		}
		applog.HTTPError(c, "patch setting lang", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "update failed"})
	}
	if patch.SystemFileIDSet && !int64PtrEqual(oldFileID, patch.SystemFileID) {
		h.purgeFileIfUnreferenced(ctx, oldFileID, actorID(c))
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *LangHandler) delete(c *echo.Context) error {
	id, err := pathID(c)
	if err != nil {
		return err
	}
	ctx := c.Request().Context()
	var oldFileID *int64
	if langHasLogo(h.k) {
		row, getErr := h.repo.Get(ctx, h.k, id, "")
		if getErr == nil && row != nil {
			oldFileID = row.SystemFileID
		}
	}
	if err := h.repo.SoftDelete(ctx, h.k, id, actorID(c)); err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		applog.HTTPError(c, "delete setting lang", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "delete failed"})
	}
	h.purgeFileIfUnreferenced(ctx, oldFileID, actorID(c))
	return c.NoContent(http.StatusNoContent)
}

func (h *LangHandler) reorder(c *echo.Context) error {
	var body reorderBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	if body.DragID <= 0 || body.TargetID <= 0 {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "drag_id and target_id required"})
	}
	prefixType := body.Type
	if h.k == LangPrefix && prefixType == "" {
		prefixType = strings.TrimSpace(c.QueryParam("type"))
	}
	err := h.repo.Reorder(c.Request().Context(), h.k, body.DragID, body.TargetID, prefixType, actorID(c))
	if err != nil {
		if errors.Is(err, ErrInvalidReorder) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid reorder"})
		}
		applog.HTTPError(c, "reorder setting lang", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "reorder failed"})
	}
	return c.NoContent(http.StatusNoContent)
}
