package member

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/lMikadal/warehouse/backend/internal/api"
	"github.com/lMikadal/warehouse/backend/internal/httputil"
	applog "github.com/lMikadal/warehouse/backend/internal/log"
	"github.com/labstack/echo/v5"
)

type TierHandler struct {
	repo *TierRepository
	rel  *RelationRepository
}

func NewTierHandler(repo *TierRepository, rel *RelationRepository) *TierHandler {
	return &TierHandler{repo: repo, rel: rel}
}

type tierListItem struct {
	ID            int64     `json:"id"`
	ParentID      *int64    `json:"parent_id"`
	TreePath      string    `json:"tree_path"`
	Name          string    `json:"name"`
	SortOrder     int       `json:"sort_order"`
	SystemFileID  *int64    `json:"system_file_id"`
	IsDefault     bool      `json:"is_default"`
	IsActive      bool      `json:"is_active"`
	Discount      float64   `json:"discount"`
	DiscountType  string    `json:"discount_type"`
	MemberCount   int64     `json:"member_count"`
	RelationCount int64     `json:"relation_count"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type tierStatsResponse struct {
	TotalMembers  int64     `json:"total_members"`
	TotalSalesYTD float64   `json:"total_sales_ytd"`
	UpdatedAt     time.Time `json:"updated_at"`
}

func (h *TierHandler) stats(c *echo.Context) error {
	row, err := h.repo.Stats(c.Request().Context())
	if err != nil {
		applog.HTTPError(c, "member tier stats", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load stats"})
	}
	return c.JSON(http.StatusOK, tierStatsResponse{
		TotalMembers:  row.TotalMembers,
		TotalSalesYTD: row.TotalSalesYTD,
		UpdatedAt:     row.UpdatedAt,
	})
}

func (h *TierHandler) list(c *echo.Context) error {
	q := api.ParsePageQuery(c)
	f := TierListFilter{Page: q.Page, Limit: q.Limit, Locale: api.LocaleFromRequest(c), Search: strings.TrimSpace(c.QueryParam("search"))}
	if v := strings.TrimSpace(c.QueryParam("is_active")); v != "" {
		active := v == "true" || v == "1"
		f.IsActive = &active
	}
	rows, total, err := h.repo.List(c.Request().Context(), f)
	if err != nil {
		applog.HTTPError(c, "list member tier", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to list"})
	}
	items := make([]tierListItem, len(rows))
	for i, r := range rows {
		items[i] = tierListItem{
			ID: r.ID, ParentID: r.ParentID, TreePath: r.TreePath, Name: r.Name, SortOrder: r.SortOrder,
			SystemFileID: r.SystemFileID, IsDefault: r.IsDefault, IsActive: r.IsActive, Discount: r.Discount,
			DiscountType: r.DiscountType, MemberCount: r.MemberCount, RelationCount: r.RelationCount,
			UpdatedAt: r.UpdatedAt,
		}
	}
	return c.JSON(http.StatusOK, api.NewListResponse(items, int64(total), q))
}

func (h *TierHandler) get(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	row, err := h.repo.Get(c.Request().Context(), id, api.LocaleFromRequest(c))
	if err != nil {
		applog.HTTPError(c, "get member tier", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load"})
	}
	if row == nil {
		return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
	}
	rels, _ := h.repo.ListRelations(c.Request().Context(), id, api.LocaleFromRequest(c))
	return c.JSON(http.StatusOK, map[string]any{
		"id": row.ID, "parent_id": row.ParentID, "tree_path": row.TreePath, "sort_order": row.SortOrder,
		"system_file_id": row.SystemFileID, "is_default": row.IsDefault, "is_active": row.IsActive,
		"purchase_start": row.PurchaseStart, "purchase_end": row.PurchaseEnd,
		"discount": row.Discount, "discount_type": row.DiscountType, "type": row.ScopeType, "is_promotion": row.IsPromotion,
		"name": row.Name, "names": row.Names, "attribute_ids": row.AttributeIDs, "relations": rels, "updated_at": row.UpdatedAt,
	})
}

type tierCreateBody struct {
	ParentID      *int64    `json:"parent_id"`
	SystemFileID  *int64    `json:"system_file_id"`
	IsDefault     bool      `json:"is_default"`
	IsActive      bool      `json:"is_active"`
	PurchaseStart float64   `json:"purchase_start"`
	PurchaseEnd   float64   `json:"purchase_end"`
	Discount      float64   `json:"discount"`
	DiscountType  string    `json:"discount_type"`
	Type          string    `json:"type"`
	IsPromotion   bool      `json:"is_promotion"`
	Names         namesBody `json:"names"`
	AttributeIDs  []int64   `json:"attribute_ids"`
}

func (h *TierHandler) create(c *echo.Context) error {
	var body tierCreateBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	id, err := h.repo.Create(c.Request().Context(), TierCreateInput{
		ParentID: body.ParentID, SystemFileID: body.SystemFileID, IsDefault: body.IsDefault, IsActive: body.IsActive,
		PurchaseStart: body.PurchaseStart, PurchaseEnd: body.PurchaseEnd, Discount: body.Discount,
		DiscountType: body.DiscountType, ScopeType: body.Type, IsPromotion: body.IsPromotion,
		Names: namesFromBody(body.Names.Th, body.Names.En), AttributeIDs: body.AttributeIDs, ActorID: httputil.ActorID(c),
	})
	if err != nil {
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "validation failed"})
		}
		applog.HTTPError(c, "create member tier", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "create failed"})
	}
	return c.JSON(http.StatusCreated, map[string]any{"id": id})
}

type tierPatchBody struct {
	SystemFileID  optionalInt64 `json:"system_file_id"`
	IsDefault     *bool         `json:"is_default"`
	IsActive      *bool         `json:"is_active"`
	PurchaseStart *float64      `json:"purchase_start"`
	PurchaseEnd   *float64      `json:"purchase_end"`
	Discount      *float64      `json:"discount"`
	DiscountType  *string       `json:"discount_type"`
	Type          *string       `json:"type"`
	IsPromotion   *bool         `json:"is_promotion"`
	Names         *namesBody    `json:"names"`
	AttributeIDs  []int64       `json:"attribute_ids"`
}

func (h *TierHandler) patch(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	var body tierPatchBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	p := TierPatch{ActorID: httputil.ActorID(c), IsDefault: body.IsDefault, IsActive: body.IsActive,
		PurchaseStart: body.PurchaseStart, PurchaseEnd: body.PurchaseEnd, Discount: body.Discount,
		DiscountType: body.DiscountType, ScopeType: body.Type, IsPromotion: body.IsPromotion,
		SystemFileID: body.SystemFileID}
	if body.Names != nil {
		p.Names = namesFromBody(body.Names.Th, body.Names.En)
	}
	if body.AttributeIDs != nil {
		p.SetAttributes = true
		p.AttributeIDs = body.AttributeIDs
	}
	if err := h.repo.Patch(c.Request().Context(), id, p); err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "validation failed"})
		}
		applog.HTTPError(c, "patch member tier", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "update failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *TierHandler) delete(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	if err := h.repo.SoftDelete(c.Request().Context(), id, httputil.ActorID(c)); err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		applog.HTTPError(c, "delete member tier", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "delete failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *TierHandler) reorder(c *echo.Context) error {
	var body reorderBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	if err := h.repo.Reorder(c.Request().Context(), body.DragID, body.TargetID, httputil.ActorID(c)); err != nil {
		if errors.Is(err, ErrInvalidReorder) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid reorder"})
		}
		applog.HTTPError(c, "reorder member tier", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "reorder failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *TierHandler) move(c *echo.Context) error {
	var body reorderBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	if body.Zone == "" {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "zone required"})
	}
	if err := h.repo.Move(c.Request().Context(), body.DragID, body.TargetID, body.Zone, httputil.ActorID(c)); err != nil {
		if errors.Is(err, ErrInvalidReorder) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid move"})
		}
		applog.HTTPError(c, "move member tier", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "move failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

type tierRelationBody struct {
	MemberSettingRelationID int64   `json:"member_setting_relation_id"`
	PurchaseStart           float64 `json:"purchase_start"`
	PurchaseEnd             float64 `json:"purchase_end"`
	Discount                float64 `json:"discount"`
	DiscountType            string  `json:"discount_type"`
	Type                    string  `json:"type"`
	IsPromotion             bool    `json:"is_promotion"`
	AttributeIDs            []int64 `json:"attribute_ids"`
}

func (h *TierHandler) createRelation(c *echo.Context) error {
	tierID, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	var body tierRelationBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	if body.MemberSettingRelationID <= 0 {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "member_setting_relation_id required"})
	}
	id, err := h.repo.CreateRelation(c.Request().Context(), tierID, body.MemberSettingRelationID, TierRelationRow{
		PurchaseStart: body.PurchaseStart, PurchaseEnd: body.PurchaseEnd, Discount: body.Discount,
		DiscountType: body.DiscountType, ScopeType: body.Type, IsPromotion: body.IsPromotion, AttributeIDs: body.AttributeIDs,
	}, httputil.ActorID(c))
	if err != nil {
		applog.HTTPError(c, "create tier relation", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "create failed"})
	}
	return c.JSON(http.StatusCreated, map[string]any{"id": id})
}

func (h *TierHandler) patchRelation(c *echo.Context) error {
	relID, err := httputil.PathID(c, "relationId")
	if err != nil {
		return err
	}
	var body tierRelationBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	if err := h.repo.PatchRelation(c.Request().Context(), relID, TierRelationRow{
		PurchaseStart: body.PurchaseStart, PurchaseEnd: body.PurchaseEnd, Discount: body.Discount,
		DiscountType: body.DiscountType, ScopeType: body.Type, IsPromotion: body.IsPromotion, AttributeIDs: body.AttributeIDs,
	}, httputil.ActorID(c)); err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		applog.HTTPError(c, "patch tier relation", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "update failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *TierHandler) deleteRelation(c *echo.Context) error {
	relID, err := httputil.PathID(c, "relationId")
	if err != nil {
		return err
	}
	if err := h.repo.DeleteRelation(c.Request().Context(), relID, httputil.ActorID(c)); err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		applog.HTTPError(c, "delete tier relation", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "delete failed"})
	}
	return c.NoContent(http.StatusNoContent)
}
