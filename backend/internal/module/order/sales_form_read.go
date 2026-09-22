package order

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/lMikadal/warehouse/backend/internal/api"
	"github.com/lMikadal/warehouse/backend/internal/config"
	"github.com/lMikadal/warehouse/backend/internal/httputil"
	applog "github.com/lMikadal/warehouse/backend/internal/log"
	"github.com/lMikadal/warehouse/backend/internal/module/member"
	"github.com/lMikadal/warehouse/backend/internal/module/product"
	"github.com/lMikadal/warehouse/backend/internal/module/setting"
	"github.com/lMikadal/warehouse/backend/internal/module/supplier"
	"github.com/lMikadal/warehouse/backend/internal/module/system"
	"github.com/lMikadal/warehouse/backend/internal/module/warehouse"
	"github.com/labstack/echo/v5"
)

// SalesFormReadHandlers exposes member/product/vat reads under order.*.view RBAC.
type SalesFormReadHandlers struct {
	memberUsers    *member.UserRepository
	memberSettings *member.SettingRepository
	productItems   *product.ItemHandler
	productFilters *product.FiltersHandler
	vat            *setting.VatRepository
	settingLang    *setting.LangRepository
	supplierBanks  *supplier.Repository
}

func NewSalesFormReadHandlers(db *sql.DB, cfg config.Config) *SalesFormReadHandlers {
	setRepo := member.NewSettingRepository(db)
	codePrefix := system.NewCodePrefixRepository(db)
	userRepo := member.NewUserRepository(db, codePrefix, cfg)
	prodRepo := product.NewRepository(db)
	supplierRepo := supplier.NewRepository(db)
	itemRepo := product.NewItemRepository(db)
	listRepo := product.NewListRepository(db)
	langRepo := setting.NewLangRepository(db)
	return &SalesFormReadHandlers{
		memberUsers:    userRepo,
		memberSettings: setRepo,
		productItems:   product.NewItemHandler(itemRepo, listRepo),
		productFilters: product.NewFiltersHandler(prodRepo, supplierRepo, langRepo, warehouse.NewRepository(db)),
		vat:            setting.NewVatRepository(db),
		settingLang:    langRepo,
		supplierBanks:  supplierRepo,
	}
}

type salesFormFilterItem struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
	SKU  string `json:"sku,omitempty"`
	// Only the supplier_banks facet fills these; the payment form shows them as the payee details.
	AccountName string `json:"account_name,omitempty"`
	Branch      string `json:"branch,omitempty"`
}

type salesFormFiltersResponse struct {
	Items []salesFormFilterItem `json:"items"`
	Meta  api.ListMeta          `json:"meta"`
}

func salesFormFilterQueryID(c *echo.Context) int64 {
	v := strings.TrimSpace(c.QueryParam("id"))
	if v == "" {
		return 0
	}
	id, err := strconv.ParseInt(v, 10, 64)
	if err != nil || id <= 0 {
		return 0
	}
	return id
}

func (h *SalesFormReadHandlers) ActiveVat(c *echo.Context) error {
	row, err := h.vat.GetSingleton(c.Request().Context())
	if err != nil {
		applog.HTTPError(c, "order form vat", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load"})
	}
	if row == nil {
		return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "vat not configured"})
	}
	return c.JSON(http.StatusOK, map[string]any{
		"id": row.ID, "vat_type": row.VatType, "rate": row.Rate,
		"is_active": row.IsActive, "updated_at": row.UpdatedAt,
	})
}

func (h *SalesFormReadHandlers) ListItems(c *echo.Context) error {
	return h.productItems.ListBrowse(c)
}

func (h *SalesFormReadHandlers) GetMember(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	locale := api.LocaleFromRequest(c)
	base, addrs, settings, _, files, discounts, histories, err := h.memberUsers.GetAggregate(c.Request().Context(), id, locale)
	if err != nil {
		applog.HTTPError(c, "order form member get", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load"})
	}
	if base == nil {
		return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
	}
	body := map[string]any{
		"id": base.ID, "sku": base.SKU, "member_tier_id": base.MemberTierID, "type": base.Type,
		"setting_prefix_id": base.SettingPrefixID, "name": base.Name, "store_name": base.StoreName,
		"tax_number": base.TaxNumber, "branch": base.Branch, "branch_name": base.BranchName,
		"tel": base.Tel, "email": base.Email, "address": base.Address,
		"website_province_id": base.WebsiteProvinceID, "website_district_id": base.WebsiteDistrictID,
		"website_sub_district_id": base.WebsiteSubDistrictID, "postcode": base.Postcode,
		"system_file_id": base.SystemFileID, "note": base.Note, "is_active": base.IsActive,
		"created_at": base.CreatedAt, "updated_at": base.UpdatedAt,
		"addresses": addrs, "setting_relation_ids": settings,
		"files": files, "discounts": discounts, "histories": histories,
	}
	putNullStringSQL(body, "setting_prefix_name", base.SettingPrefixName)
	putNullStringSQL(body, "website_province_name", base.WebsiteProvinceName)
	putNullStringSQL(body, "website_district_name", base.WebsiteDistrictName)
	putNullStringSQL(body, "website_sub_district_name", base.WebsiteSubDistrictName)
	return c.JSON(http.StatusOK, body)
}

func putNullStringSQL(m map[string]any, key string, n sql.NullString) {
	if n.Valid {
		m[key] = n.String
	}
}

func (h *SalesFormReadHandlers) FormFilters(c *echo.Context) error {
	facet := strings.TrimSpace(strings.ToLower(c.QueryParam("facet")))
	switch facet {
	case "member_credits":
		return h.filterMemberCredits(c)
	case "members":
		return h.filterMembers(c)
	case "categories", "brands":
		return h.productFilters.ItemBrowseFilters(c)
	case "cars":
		return h.productFilters.CarFilters(c)
	case "suppliers":
		return h.productFilters.SupplierFilters(c)
	case "supplier_banks":
		return h.filterSupplierBanks(c)
	case "sale_channels":
		return h.filterSettingLang(c, setting.LangSaleChannel)
	case "payment_methods":
		return h.filterSettingLang(c, setting.LangPaymentMethod)
	case "claim_reasons":
		return h.filterSettingLang(c, setting.LangClaimReason)
	default:
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid or missing facet"})
	}
}

// filterSupplierBanks lists the payee accounts of one supplier for the purchase payment form. The
// combobox is meaningless without a supplier, so a missing supplier_user_id returns an empty page
// rather than every bank row in the system.
func (h *SalesFormReadHandlers) filterSupplierBanks(c *echo.Context) error {
	q := api.ParsePageQuery(c)
	empty := salesFormFiltersResponse{
		Items: []salesFormFilterItem{},
		Meta:  api.ListMeta{Total: 0, Page: 1, Limit: q.Limit},
	}
	supplierID, err := strconv.ParseInt(strings.TrimSpace(c.QueryParam("supplier_user_id")), 10, 64)
	if err != nil || supplierID <= 0 {
		return c.JSON(http.StatusOK, empty)
	}
	rows, err := h.supplierBanks.ListBankFilters(c.Request().Context(), supplierID,
		strings.TrimSpace(c.QueryParam("search")), salesFormFilterQueryID(c))
	if err != nil {
		applog.HTTPError(c, "order form filters supplier banks", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load filters"})
	}
	items := make([]salesFormFilterItem, len(rows))
	for i, r := range rows {
		items[i] = salesFormFilterItem{
			ID: r.ID, Name: r.Name, SKU: r.SKU,
			AccountName: r.AccountName, Branch: r.Branch,
		}
	}
	return c.JSON(http.StatusOK, salesFormFiltersResponse{
		Items: items,
		Meta:  api.ListMeta{Total: int64(len(items)), Page: 1, Limit: q.Limit},
	})
}

// filterSettingLang exposes active setting_* options to sales/order pages under their own RBAC resource.
func (h *SalesFormReadHandlers) filterSettingLang(c *echo.Context, kind setting.LangKind) error {
	locale := api.LocaleFromRequest(c)
	q := api.ParsePageQuery(c)
	id := salesFormFilterQueryID(c)
	if id > 0 {
		row, err := h.settingLang.Get(c.Request().Context(), kind, id, locale)
		if err != nil {
			applog.HTTPError(c, "order form filters setting by id", err)
			return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load filters"})
		}
		if row == nil {
			return c.JSON(http.StatusOK, salesFormFiltersResponse{
				Items: []salesFormFilterItem{},
				Meta:  api.ListMeta{Total: 0, Page: 1, Limit: q.Limit},
			})
		}
		return c.JSON(http.StatusOK, salesFormFiltersResponse{
			Items: []salesFormFilterItem{{ID: row.ID, Name: row.Name}},
			Meta:  api.ListMeta{Total: 1, Page: 1, Limit: q.Limit},
		})
	}
	active := true
	f := setting.LangListFilter{
		Page: q.Page, Limit: q.Limit, Locale: locale,
		Search: strings.TrimSpace(c.QueryParam("search")), IsActive: &active,
	}
	if kind == setting.LangPaymentMethod {
		if v := strings.TrimSpace(c.QueryParam("is_purchase")); v == "true" {
			t := true
			f.IsPurchase = &t
		}
		if v := strings.TrimSpace(c.QueryParam("is_sale")); v == "true" {
			t := true
			f.IsSale = &t
		}
	}
	if kind == setting.LangClaimReason {
		if v := strings.TrimSpace(c.QueryParam("is_claim")); v == "true" {
			t := true
			f.IsClaim = &t
		}
		if v := strings.TrimSpace(c.QueryParam("is_return")); v == "true" {
			t := true
			f.IsReturn = &t
		}
	}
	rows, total, err := h.settingLang.List(c.Request().Context(), kind, f)
	if err != nil {
		applog.HTTPError(c, "order form filters setting", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load filters"})
	}
	items := make([]salesFormFilterItem, len(rows))
	for i, r := range rows {
		items[i] = salesFormFilterItem{ID: r.ID, Name: r.Name}
	}
	return c.JSON(http.StatusOK, salesFormFiltersResponse{
		Items: items,
		Meta:  api.ListMeta{Total: int64(total), Page: q.Page, Limit: q.Limit},
	})
}

func (h *SalesFormReadHandlers) filterMemberCredits(c *echo.Context) error {
	locale := api.LocaleFromRequest(c)
	q := api.ParsePageQuery(c)
	search := strings.TrimSpace(c.QueryParam("search"))
	id := salesFormFilterQueryID(c)
	active := true
	f := member.SettingListFilter{
		Page: q.Page, Limit: q.Limit, Locale: locale, Search: search, IsActive: &active,
	}
	if id > 0 {
		row, err := h.memberSettings.Get(c.Request().Context(), member.SettingCredit, id, locale)
		if err != nil {
			applog.HTTPError(c, "order form filters credit", err)
			return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load filters"})
		}
		if row == nil {
			return c.JSON(http.StatusOK, salesFormFiltersResponse{
				Items: []salesFormFilterItem{},
				Meta:  api.ListMeta{Total: 0, Page: 1, Limit: q.Limit},
			})
		}
		return c.JSON(http.StatusOK, salesFormFiltersResponse{
			Items: []salesFormFilterItem{{ID: row.ID, Name: row.Name}},
			Meta:  api.ListMeta{Total: 1, Page: 1, Limit: q.Limit},
		})
	}
	rows, total, err := h.memberSettings.List(c.Request().Context(), member.SettingCredit, f)
	if err != nil {
		applog.HTTPError(c, "order form filters credits", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load filters"})
	}
	items := make([]salesFormFilterItem, len(rows))
	for i, r := range rows {
		items[i] = salesFormFilterItem{ID: r.ID, Name: r.Name}
	}
	return c.JSON(http.StatusOK, salesFormFiltersResponse{
		Items: items,
		Meta:  api.ListMeta{Total: int64(total), Page: q.Page, Limit: q.Limit},
	})
}

func (h *SalesFormReadHandlers) filterMembers(c *echo.Context) error {
	locale := api.LocaleFromRequest(c)
	q := api.ParsePageQuery(c)
	search := strings.TrimSpace(c.QueryParam("search"))
	id := salesFormFilterQueryID(c)
	if id > 0 {
		base, _, _, _, _, _, _, err := h.memberUsers.GetAggregate(c.Request().Context(), id, locale)
		if err != nil {
			applog.HTTPError(c, "order form filters member by id", err)
			return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load filters"})
		}
		if base == nil {
			return c.JSON(http.StatusOK, salesFormFiltersResponse{
				Items: []salesFormFilterItem{},
				Meta:  api.ListMeta{Total: 0, Page: 1, Limit: q.Limit},
			})
		}
		label := memberListComboboxLabel(base.SKU, base.Name, base.ID)
		return c.JSON(http.StatusOK, salesFormFiltersResponse{
			Items: []salesFormFilterItem{{ID: base.ID, Name: label, SKU: derefStr(base.SKU)}},
			Meta:  api.ListMeta{Total: 1, Page: 1, Limit: q.Limit},
		})
	}
	f := member.UserListFilter{Page: q.Page, Limit: q.Limit, Search: search}
	active := true
	f.IsActive = &active
	rows, total, err := h.memberUsers.List(c.Request().Context(), f, locale)
	if err != nil {
		applog.HTTPError(c, "order form filters members", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load filters"})
	}
	items := make([]salesFormFilterItem, len(rows))
	for i, r := range rows {
		items[i] = salesFormFilterItem{
			ID:   r.ID,
			Name: memberListComboboxLabel(r.SKU, r.Name, r.ID),
			SKU:  derefStr(r.SKU),
		}
	}
	return c.JSON(http.StatusOK, salesFormFiltersResponse{
		Items: items,
		Meta:  api.ListMeta{Total: total, Page: q.Page, Limit: q.Limit},
	})
}

func memberListComboboxLabel(sku *string, name string, id int64) string {
	s := strings.TrimSpace(derefStr(sku))
	n := strings.TrimSpace(name)
	if n == "" {
		n = fmt.Sprintf("#%d", id)
	}
	if s != "" {
		return s + " — " + n
	}
	return n
}

func derefStr(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}
