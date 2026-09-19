package member

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/labstack/echo/v5"
	"github.com/lMikadal/warehouse/backend/internal/api"
	"github.com/lMikadal/warehouse/backend/internal/httputil"
	"github.com/lMikadal/warehouse/backend/internal/module/setting"
	applog "github.com/lMikadal/warehouse/backend/internal/log"
)

type UserHandler struct {
	repo *UserRepository
	rel  *RelationRepository
	set  *SettingRepository
	lang *setting.LangRepository
}

func NewUserHandler(repo *UserRepository, rel *RelationRepository, set *SettingRepository, lang *setting.LangRepository) *UserHandler {
	return &UserHandler{repo: repo, rel: rel, set: set, lang: lang}
}

type userListItem struct {
	ID            int64     `json:"id"`
	SKU           *string   `json:"sku,omitempty"`
	Name          string    `json:"name"`
	Tel           *string   `json:"tel,omitempty"`
	BusinessLabel string    `json:"business_label,omitempty"`
	MemberTierID  *int64    `json:"member_tier_id,omitempty"`
	IsActive      bool      `json:"is_active"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

func (h *UserHandler) list(c *echo.Context) error {
	q := api.ParsePageQuery(c)
	f := UserListFilter{Page: q.Page, Limit: q.Limit, Search: strings.TrimSpace(c.QueryParam("search")),
		Sort: strings.TrimSpace(c.QueryParam("sort")), Order: strings.ToLower(strings.TrimSpace(c.QueryParam("order")))}
	if v := strings.TrimSpace(c.QueryParam("is_active")); v != "" {
		active := v == "true" || v == "1"
		f.IsActive = &active
	}
	if v := strings.TrimSpace(c.QueryParam("member_tier_id")); v != "" {
		if id, err := strconv.ParseInt(v, 10, 64); err == nil {
			f.MemberTierID = &id
		}
	}
	if v := strings.TrimSpace(c.QueryParam("business_id")); v != "" {
		if id, err := strconv.ParseInt(v, 10, 64); err == nil {
			f.BusinessID = &id
		}
	}
	f.CreatedFrom = strings.TrimSpace(c.QueryParam("created_from"))
	f.CreatedTo = strings.TrimSpace(c.QueryParam("created_to"))
	rows, total, err := h.repo.List(c.Request().Context(), f, api.LocaleFromRequest(c))
	if err != nil {
		applog.HTTPError(c, "list member users", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to list"})
	}
	items := make([]userListItem, len(rows))
	for i, r := range rows {
		items[i] = userListItem{ID: r.ID, SKU: r.SKU, Name: r.Name, Tel: r.Tel, BusinessLabel: r.BusinessLabel, MemberTierID: r.MemberTierID, IsActive: r.IsActive, CreatedAt: r.CreatedAt, UpdatedAt: r.UpdatedAt}
	}
	return c.JSON(http.StatusOK, api.NewListResponse(items, total, q))
}

func (h *UserHandler) get(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	base, addrs, settings, owners, files, discounts, histories, err := h.repo.GetAggregate(c.Request().Context(), id, api.LocaleFromRequest(c))
	if err != nil {
		applog.HTTPError(c, "get member user", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load"})
	}
	if base == nil {
		return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
	}
	return c.JSON(http.StatusOK, map[string]any{
		"id": base.ID, "sku": base.SKU, "member_tier_id": base.MemberTierID, "type": base.Type,
		"setting_prefix_id": base.SettingPrefixID, "name": base.Name, "store_name": base.StoreName,
		"tax_number": base.TaxNumber, "branch": base.Branch, "branch_name": base.BranchName,
		"tel": base.Tel, "email": base.Email, "address": base.Address,
		"website_province_id": base.WebsiteProvinceID, "website_district_id": base.WebsiteDistrictID,
		"website_sub_district_id": base.WebsiteSubDistrictID, "postcode": base.Postcode,
		"system_file_id": base.SystemFileID, "note": base.Note, "is_active": base.IsActive, "updated_at": base.UpdatedAt,
		"addresses": addrs, "setting_relation_ids": settings, "owner_admin_user_ids": owners,
		"files": files, "discounts": discounts, "histories": histories,
	})
}

type userCreateBody struct {
	SKU                  *string        `json:"sku"`
	MemberTierID         *int64         `json:"member_tier_id"`
	Type                 string         `json:"type"`
	SettingPrefixID      *int64         `json:"setting_prefix_id"`
	Name                 string         `json:"name"`
	StoreName            *string        `json:"store_name"`
	TaxNumber            *string        `json:"tax_number"`
	Branch               *string        `json:"branch"`
	BranchName           *string        `json:"branch_name"`
	Tel                  *string        `json:"tel"`
	Email                *string        `json:"email"`
	Address              *string        `json:"address"`
	WebsiteProvinceID    *int64         `json:"website_province_id"`
	WebsiteDistrictID    *int64         `json:"website_district_id"`
	WebsiteSubDistrictID *int64         `json:"website_sub_district_id"`
	Postcode             *string        `json:"postcode"`
	SystemFileID         *int64         `json:"system_file_id"`
	Note                 *string        `json:"note"`
	IsActive             *bool          `json:"is_active"`
	SettingRelationIDs   []int64        `json:"setting_relation_ids"`
	OwnerAdminUserIDs    []int64        `json:"owner_admin_user_ids"`
	Addresses            []AddressInput `json:"addresses"`
}

func (h *UserHandler) create(c *echo.Context) error {
	var body userCreateBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	active := true
	if body.IsActive != nil {
		active = *body.IsActive
	}
	id, err := h.repo.Create(c.Request().Context(), UserCreateInput{
		SKU: body.SKU, MemberTierID: body.MemberTierID, Type: body.Type, SettingPrefixID: body.SettingPrefixID,
		Name: strings.TrimSpace(body.Name), StoreName: body.StoreName, TaxNumber: body.TaxNumber, Branch: body.Branch, BranchName: body.BranchName,
		Tel: body.Tel, Email: body.Email, Address: body.Address, WebsiteProvinceID: body.WebsiteProvinceID,
		WebsiteDistrictID: body.WebsiteDistrictID, WebsiteSubDistrictID: body.WebsiteSubDistrictID, Postcode: body.Postcode,
		SystemFileID: body.SystemFileID, Note: body.Note, IsActive: active,
		SettingRelationIDs: body.SettingRelationIDs, OwnerAdminUserIDs: body.OwnerAdminUserIDs, Addresses: body.Addresses,
		ActorID: httputil.ActorID(c),
	})
	if err != nil {
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "validation failed"})
		}
		if errors.Is(err, ErrConflict) {
			return c.JSON(http.StatusConflict, api.ErrorBody{Code: "conflict", Message: "sku already exists"})
		}
		applog.HTTPError(c, "create member user", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "create failed"})
	}
	return c.JSON(http.StatusCreated, map[string]any{"id": id})
}

type userPatchBody struct {
	SKU                  optionalString `json:"sku"`
	MemberTierID         optionalInt64  `json:"member_tier_id"`
	Type                 *string        `json:"type"`
	SettingPrefixID      optionalInt64  `json:"setting_prefix_id"`
	Name                 *string        `json:"name"`
	StoreName            optionalString `json:"store_name"`
	TaxNumber            optionalString `json:"tax_number"`
	Branch               optionalString `json:"branch"`
	BranchName           optionalString `json:"branch_name"`
	Tel                  optionalString `json:"tel"`
	Email                optionalString `json:"email"`
	Address              optionalString `json:"address"`
	WebsiteProvinceID    optionalInt64  `json:"website_province_id"`
	WebsiteDistrictID    optionalInt64  `json:"website_district_id"`
	WebsiteSubDistrictID optionalInt64  `json:"website_sub_district_id"`
	Postcode             optionalString `json:"postcode"`
	SystemFileID         optionalInt64  `json:"system_file_id"`
	Note                 optionalString `json:"note"`
	IsActive             *bool          `json:"is_active"`
	SettingRelationIDs   []int64        `json:"setting_relation_ids"`
	OwnerAdminUserIDs    []int64        `json:"owner_admin_user_ids"`
	Addresses            []AddressInput `json:"addresses"`
}

func (h *UserHandler) patch(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	var body userPatchBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	p := UserPatch{ActorID: httputil.ActorID(c), IsActive: body.IsActive,
		MemberTierID: body.MemberTierID, SettingPrefixID: body.SettingPrefixID,
		StoreName: body.StoreName, TaxNumber: body.TaxNumber, Branch: body.Branch, BranchName: body.BranchName,
		Tel: body.Tel, Email: body.Email, Address: body.Address,
		WebsiteProvinceID: body.WebsiteProvinceID, WebsiteDistrictID: body.WebsiteDistrictID,
		WebsiteSubDistrictID: body.WebsiteSubDistrictID, Postcode: body.Postcode, SystemFileID: body.SystemFileID, Note: body.Note}
	if body.SKU.Set {
		p.SKUSet = true
		p.SKU = body.SKU.Value
	}
	if body.Type != nil {
		p.Type = body.Type
	}
	if body.Name != nil {
		p.Name = body.Name
	}
	if body.SettingRelationIDs != nil {
		p.SetSettings = true
		p.SettingRelationIDs = body.SettingRelationIDs
	}
	if body.OwnerAdminUserIDs != nil {
		p.SetOwners = true
		p.OwnerAdminUserIDs = body.OwnerAdminUserIDs
	}
	if body.Addresses != nil {
		p.SetAddresses = true
		p.Addresses = body.Addresses
	}
	if err := h.repo.Patch(c.Request().Context(), id, p); err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		if errors.Is(err, ErrConflict) {
			return c.JSON(http.StatusConflict, api.ErrorBody{Code: "conflict", Message: "sku already exists"})
		}
		applog.HTTPError(c, "patch member user", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "update failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *UserHandler) delete(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	if err := h.repo.SoftDelete(c.Request().Context(), id, httputil.ActorID(c)); err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		applog.HTTPError(c, "delete member user", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "delete failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

type fileCreateBody struct {
	SystemFileID int64 `json:"system_file_id"`
}

func (h *UserHandler) createFile(c *echo.Context) error {
	userID, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	var body fileCreateBody
	if err := c.Bind(&body); err != nil || body.SystemFileID <= 0 {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "system_file_id required"})
	}
	id, err := h.repo.CreateFile(c.Request().Context(), userID, body.SystemFileID, httputil.ActorID(c))
	if err != nil {
		applog.HTTPError(c, "create member file", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "create failed"})
	}
	return c.JSON(http.StatusCreated, map[string]any{"id": id})
}

func (h *UserHandler) reorderFiles(c *echo.Context) error {
	userID, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	var body reorderBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	if err := h.repo.ReorderFiles(c.Request().Context(), userID, body.DragID, body.TargetID, httputil.ActorID(c)); err != nil {
		if errors.Is(err, ErrInvalidReorder) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid reorder"})
		}
		applog.HTTPError(c, "reorder member files", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "reorder failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *UserHandler) deleteFile(c *echo.Context) error {
	userID, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	fileID, err := httputil.PathID(c, "fileId")
	if err != nil {
		return err
	}
	if err := h.repo.DeleteFile(c.Request().Context(), userID, fileID, httputil.ActorID(c)); err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		applog.HTTPError(c, "delete member file", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "delete failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *UserHandler) createDiscount(c *echo.Context) error {
	userID, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	var body DiscountRow
	if err := c.Bind(&body); err != nil || body.ProductItemID <= 0 {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "product_item_id required"})
	}
	id, err := h.repo.CreateDiscount(c.Request().Context(), userID, body, httputil.ActorID(c))
	if err != nil {
		applog.HTTPError(c, "create member discount", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "create failed"})
	}
	return c.JSON(http.StatusCreated, map[string]any{"id": id})
}

func (h *UserHandler) patchDiscount(c *echo.Context) error {
	userID, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	discountID, err := httputil.PathID(c, "discountId")
	if err != nil {
		return err
	}
	var body DiscountRow
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	if err := h.repo.PatchDiscount(c.Request().Context(), userID, discountID, body, httputil.ActorID(c)); err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		applog.HTTPError(c, "patch member discount", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "update failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *UserHandler) deleteDiscount(c *echo.Context) error {
	userID, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	discountID, err := httputil.PathID(c, "discountId")
	if err != nil {
		return err
	}
	if err := h.repo.DeleteDiscount(c.Request().Context(), userID, discountID, httputil.ActorID(c)); err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		applog.HTTPError(c, "delete member discount", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "delete failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

type historyCreateBody struct {
	Names namesBody `json:"names"`
}

func (h *UserHandler) createHistory(c *echo.Context) error {
	userID, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	var body historyCreateBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	id, err := h.repo.CreateHistory(c.Request().Context(), userID, namesFromBody(body.Names.Th, body.Names.En), httputil.ActorID(c))
	if err != nil {
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "validation failed"})
		}
		applog.HTTPError(c, "create member history", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "create failed"})
	}
	return c.JSON(http.StatusCreated, map[string]any{"id": id})
}
