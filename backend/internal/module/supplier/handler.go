package supplier

import (
	"database/sql"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/labstack/echo/v5"
	"github.com/lMikadal/warehouse/backend/internal/api"
	"github.com/lMikadal/warehouse/backend/internal/httputil"
	applog "github.com/lMikadal/warehouse/backend/internal/log"
)

type Handler struct {
	repo *Repository
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

type listItem struct {
	ID              int64   `json:"id"`
	SKU             string  `json:"sku"`
	CreditTerm      *int32  `json:"credit_term,omitempty"`
	CreditTermNote  *string `json:"credit_term_note,omitempty"`
	IsActive        bool    `json:"is_active"`
	UpdatedAt       time.Time `json:"updated_at"`
	TaxNumber       string  `json:"tax_number,omitempty"`
	CompanyName     string  `json:"company_name,omitempty"`
	SettingPrefixID *int64  `json:"setting_prefix_id,omitempty"`
	CompanyAddress  string  `json:"company_address,omitempty"`
	ContactTel      string  `json:"contact_tel,omitempty"`
	ContactEmail    string  `json:"contact_email,omitempty"`
}

func (h *Handler) list(c *echo.Context) error {
	q := api.ParsePageQuery(c)
	f := UserListFilter{Page: q.Page, Limit: q.Limit, Search: strings.TrimSpace(c.QueryParam("search"))}
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
		applog.HTTPError(c, "list supplier users", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to list suppliers"})
	}
	items := make([]listItem, len(rows))
	for i, r := range rows {
		items[i] = toListItem(r)
	}
	return c.JSON(http.StatusOK, api.NewListResponse(items, total, q))
}

func (h *Handler) get(c *echo.Context) error {
	id, err := httputil.PathIDValidation(c, "id")
	if err != nil {
		return err
	}
	base, info, contacts, banks, err := h.repo.GetAggregate(c.Request().Context(), id)
	if err != nil {
		applog.HTTPError(c, "get supplier user", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load supplier"})
	}
	if base == nil {
		return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "supplier not found"})
	}
	return c.JSON(http.StatusOK, toDetailResponse(*base, info, contacts, banks))
}

type createBody struct {
	SKU            string                        `json:"sku"`
	CreditTerm     *int32                        `json:"credit_term"`
	CreditTermNote *string                       `json:"credit_term_note"`
	IsActive       *bool                         `json:"is_active"`
	Information    map[string]InformationInput   `json:"information"`
	Contacts       []ContactInput                `json:"contacts"`
	Banks          []BankInput                   `json:"banks"`
}

func (h *Handler) create(c *echo.Context) error {
	var body createBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	body.SKU = strings.TrimSpace(body.SKU)
	if body.SKU == "" {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "sku required"})
	}
	ctx := c.Request().Context()
	exists, err := h.repo.SKUExists(ctx, body.SKU, 0)
	if err != nil {
		applog.HTTPError(c, "create supplier sku check", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "create failed"})
	}
	if exists {
		return c.JSON(http.StatusConflict, api.ErrorBody{Code: "conflict", Message: "sku taken"})
	}
	if msg := h.validateInformationMap(c, body.Information, true); msg != "" {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: msg})
	}
	for _, ct := range body.Contacts {
		if msg := validateContactInput(ct); msg != "" {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: msg})
		}
	}
	for _, b := range body.Banks {
		if msg := validateBankInput(b); msg != "" {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: msg})
		}
		if ok, err := h.repo.BankActive(ctx, b.SettingBankID); err != nil || !ok {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid bank"})
		}
	}
	active := true
	if body.IsActive != nil {
		active = *body.IsActive
	}
	id, err := h.repo.Create(ctx, CreateUserInput{
		SKU: body.SKU, CreditTerm: body.CreditTerm, CreditTermNote: body.CreditTermNote,
		IsActive: active, Information: body.Information, Contacts: body.Contacts, Banks: body.Banks,
	}, httputil.ActorID(c))
	if err != nil {
		applog.HTTPError(c, "create supplier", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "create failed"})
	}
	return c.JSON(http.StatusCreated, map[string]any{"id": id})
}

type patchBody struct {
	SKU            *string                     `json:"sku"`
	CreditTerm     *int32                      `json:"credit_term"`
	CreditTermNote *string                     `json:"credit_term_note"`
	IsActive       *bool                       `json:"is_active"`
	Information    map[string]InformationInput `json:"information"`
}

func (h *Handler) patch(c *echo.Context) error {
	id, err := httputil.PathIDValidation(c, "id")
	if err != nil {
		return err
	}
	var body patchBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	ctx := c.Request().Context()
	if body.SKU != nil {
		sku := strings.TrimSpace(*body.SKU)
		if sku == "" {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "sku required"})
		}
		exists, err := h.repo.SKUExists(ctx, sku, id)
		if err != nil {
			applog.HTTPError(c, "patch supplier sku check", err)
			return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "update failed"})
		}
		if exists {
			return c.JSON(http.StatusConflict, api.ErrorBody{Code: "conflict", Message: "sku taken"})
		}
		body.SKU = &sku
	}
	if body.Information != nil {
		if msg := h.validateInformationMap(c, body.Information, false); msg != "" {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: msg})
		}
	}
	if err := h.repo.Patch(ctx, id, PatchUserInput{
		SKU: body.SKU, CreditTerm: body.CreditTerm, CreditTermNote: body.CreditTermNote,
		IsActive: body.IsActive, Information: body.Information,
	}, httputil.ActorID(c)); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "supplier not found"})
		}
		applog.HTTPError(c, "patch supplier", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "update failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *Handler) delete(c *echo.Context) error {
	id, err := httputil.PathIDValidation(c, "id")
	if err != nil {
		return err
	}
	if err := h.repo.SoftDelete(c.Request().Context(), id, httputil.ActorID(c)); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "supplier not found"})
		}
		applog.HTTPError(c, "delete supplier", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "delete failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *Handler) createContact(c *echo.Context) error {
	sid, err := httputil.PathIDValidation(c, "id")
	if err != nil {
		return err
	}
	var body ContactInput
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	if msg := validateContactInput(body); msg != "" {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: msg})
	}
	ctx := c.Request().Context()
	ok, err := h.repo.UserExists(ctx, sid)
	if err != nil || !ok {
		return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "supplier not found"})
	}
	id, err := h.repo.CreateContact(ctx, sid, body, httputil.ActorID(c))
	if err != nil {
		applog.HTTPError(c, "create supplier contact", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "create failed"})
	}
	return c.JSON(http.StatusCreated, map[string]any{"id": id})
}

func (h *Handler) reorderContacts(c *echo.Context) error {
	sid, err := httputil.PathIDValidation(c, "id")
	if err != nil {
		return err
	}
	var body httputil.ReorderBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	ctx := c.Request().Context()
	ok, err := h.repo.UserExists(ctx, sid)
	if err != nil || !ok {
		return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "supplier not found"})
	}
	if err := h.repo.ReorderContacts(ctx, sid, body.DragID, body.TargetID, httputil.ActorID(c)); err != nil {
		if errors.Is(err, ErrInvalidReorder) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid reorder"})
		}
		applog.HTTPError(c, "reorder supplier contacts", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "reorder failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *Handler) patchContact(c *echo.Context) error {
	sid, err := httputil.PathIDValidation(c, "id")
	if err != nil {
		return err
	}
	cid, err := httputil.PathIDValidation(c, "contactId")
	if err != nil {
		return err
	}
	var body ContactInput
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	if msg := validateContactInput(body); msg != "" {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: msg})
	}
	if err := h.repo.PatchContact(c.Request().Context(), sid, cid, body, httputil.ActorID(c)); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "contact not found"})
		}
		applog.HTTPError(c, "patch supplier contact", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "update failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *Handler) deleteContact(c *echo.Context) error {
	sid, err := httputil.PathIDValidation(c, "id")
	if err != nil {
		return err
	}
	cid, err := httputil.PathIDValidation(c, "contactId")
	if err != nil {
		return err
	}
	if err := h.repo.DeleteContact(c.Request().Context(), sid, cid, httputil.ActorID(c)); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "contact not found"})
		}
		applog.HTTPError(c, "delete supplier contact", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "delete failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *Handler) createBank(c *echo.Context) error {
	sid, err := httputil.PathIDValidation(c, "id")
	if err != nil {
		return err
	}
	var body BankInput
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	if msg := validateBankInput(body); msg != "" {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: msg})
	}
	ctx := c.Request().Context()
	ok, err := h.repo.UserExists(ctx, sid)
	if err != nil || !ok {
		return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "supplier not found"})
	}
	active, err := h.repo.BankActive(ctx, body.SettingBankID)
	if err != nil || !active {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid bank"})
	}
	id, err := h.repo.CreateBank(ctx, sid, body, httputil.ActorID(c))
	if err != nil {
		applog.HTTPError(c, "create supplier bank", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "create failed"})
	}
	return c.JSON(http.StatusCreated, map[string]any{"id": id})
}

func (h *Handler) reorderBanks(c *echo.Context) error {
	sid, err := httputil.PathIDValidation(c, "id")
	if err != nil {
		return err
	}
	var body httputil.ReorderBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	ctx := c.Request().Context()
	ok, err := h.repo.UserExists(ctx, sid)
	if err != nil || !ok {
		return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "supplier not found"})
	}
	if err := h.repo.ReorderBanks(ctx, sid, body.DragID, body.TargetID, httputil.ActorID(c)); err != nil {
		if errors.Is(err, ErrInvalidReorder) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid reorder"})
		}
		applog.HTTPError(c, "reorder supplier banks", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "reorder failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *Handler) patchBank(c *echo.Context) error {
	sid, err := httputil.PathIDValidation(c, "id")
	if err != nil {
		return err
	}
	bid, err := httputil.PathIDValidation(c, "bankId")
	if err != nil {
		return err
	}
	var body BankInput
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	if msg := validateBankInput(body); msg != "" {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: msg})
	}
	ctx := c.Request().Context()
	active, err := h.repo.BankActive(ctx, body.SettingBankID)
	if err != nil || !active {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid bank"})
	}
	if err := h.repo.PatchBank(ctx, sid, bid, body, httputil.ActorID(c)); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "bank not found"})
		}
		applog.HTTPError(c, "patch supplier bank", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "update failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *Handler) deleteBank(c *echo.Context) error {
	sid, err := httputil.PathIDValidation(c, "id")
	if err != nil {
		return err
	}
	bid, err := httputil.PathIDValidation(c, "bankId")
	if err != nil {
		return err
	}
	if err := h.repo.DeleteBank(c.Request().Context(), sid, bid, httputil.ActorID(c)); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "bank not found"})
		}
		applog.HTTPError(c, "delete supplier bank", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "delete failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *Handler) validateInformationMap(c *echo.Context, m map[string]InformationInput, create bool) string {
	if create {
		contact, ok := m[InfoContact]
		if !ok {
			return "contact information required"
		}
		if msg := validateInformation(contact, true); msg != "" {
			return msg
		}
		if err := h.validateInformationRefs(c, contact); err != nil {
			return err.Error()
		}
	}
	for typ, info := range m {
		requireName := typ == InfoContact && create
		if msg := validateInformation(info, requireName); msg != "" {
			return msg
		}
		if err := h.validateInformationRefs(c, info); err != nil {
			return err.Error()
		}
	}
	return ""
}

func (h *Handler) validateInformationRefs(c *echo.Context, info InformationInput) error {
	ctx := c.Request().Context()
	if info.SettingPrefixID != nil && *info.SettingPrefixID > 0 {
		ok, err := h.repo.PrefixIsCompany(ctx, *info.SettingPrefixID)
		if err != nil {
			return err
		}
		if !ok {
			return errors.New("invalid prefix")
		}
	}
	return h.repo.GeoChainValid(ctx, info.WebsiteProvinceID, info.WebsiteDistrictID, info.WebsiteSubDistrictID)
}

func toListItem(r UserRow) listItem {
	item := listItem{ID: r.ID, SKU: r.SKU, IsActive: r.IsActive, UpdatedAt: r.UpdatedAt}
	if r.CreditTerm.Valid {
		item.CreditTerm = &r.CreditTerm.Int32
	}
	if r.CreditTermNote.Valid {
		s := r.CreditTermNote.String
		item.CreditTermNote = &s
	}
	if r.TaxNumber.Valid {
		item.TaxNumber = r.TaxNumber.String
	}
	if r.CompanyName.Valid {
		item.CompanyName = r.CompanyName.String
	}
	if r.SettingPrefixID.Valid {
		id := r.SettingPrefixID.Int64
		item.SettingPrefixID = &id
	}
	if r.CompanyAddress.Valid {
		item.CompanyAddress = r.CompanyAddress.String
	}
	if r.ContactTel.Valid {
		item.ContactTel = r.ContactTel.String
	}
	if r.ContactEmail.Valid {
		item.ContactEmail = r.ContactEmail.String
	}
	return item
}

func toDetailResponse(base UserRow, info map[string]InformationRow, contacts []ContactRow, banks []BankRow) map[string]any {
	out := map[string]any{
		"id": base.ID, "sku": base.SKU, "is_active": base.IsActive, "updated_at": base.UpdatedAt,
		"information": map[string]any{}, "contacts": []any{}, "banks": []any{},
	}
	if base.CreditTerm.Valid {
		out["credit_term"] = base.CreditTerm.Int32
	}
	if base.CreditTermNote.Valid {
		out["credit_term_note"] = base.CreditTermNote.String
	}
	for typ, row := range info {
		out["information"].(map[string]any)[typ] = informationJSON(row)
	}
	cArr := out["contacts"].([]any)
	for _, row := range contacts {
		cArr = append(cArr, contactJSON(row))
	}
	out["contacts"] = cArr
	bArr := out["banks"].([]any)
	for _, row := range banks {
		bArr = append(bArr, bankJSON(row))
	}
	out["banks"] = bArr
	return out
}

func informationJSON(row InformationRow) map[string]any {
	m := map[string]any{"is_same_information": row.IsSameInformation}
	if row.SettingPrefixID.Valid {
		m["setting_prefix_id"] = row.SettingPrefixID.Int64
	}
	if row.Name.Valid {
		m["name"] = row.Name.String
	}
	if row.Branch.Valid {
		m["branch"] = row.Branch.String
	}
	if row.BranchName.Valid {
		m["branch_name"] = row.BranchName.String
	}
	if row.TaxNumber.Valid {
		m["tax_number"] = row.TaxNumber.String
	}
	if row.Address.Valid {
		m["address"] = row.Address.String
	}
	if row.WebsiteProvinceID.Valid {
		m["website_province_id"] = row.WebsiteProvinceID.Int64
	}
	if row.WebsiteDistrictID.Valid {
		m["website_district_id"] = row.WebsiteDistrictID.Int64
	}
	if row.WebsiteSubDistrictID.Valid {
		m["website_sub_district_id"] = row.WebsiteSubDistrictID.Int64
	}
	if row.Postcode.Valid {
		m["postcode"] = row.Postcode.String
	}
	if row.Tel.Valid {
		m["tel"] = row.Tel.String
	}
	if row.Email.Valid {
		m["email"] = row.Email.String
	}
	return m
}

func contactJSON(row ContactRow) map[string]any {
	m := map[string]any{"id": row.ID, "name": row.Name, "sort_order": row.SortOrder}
	if row.Email.Valid {
		m["email"] = row.Email.String
	}
	if row.Tel.Valid {
		m["tel"] = row.Tel.String
	}
	if row.Position.Valid {
		m["position"] = row.Position.String
	}
	return m
}

func bankJSON(row BankRow) map[string]any {
	m := map[string]any{
		"id": row.ID, "setting_bank_id": row.SettingBankID, "name": row.Name, "number": row.Number,
		"is_active": row.IsActive, "is_default": row.IsDefault, "sort_order": row.SortOrder,
	}
	if row.Branch.Valid {
		m["branch"] = row.Branch.String
	}
	return m
}
