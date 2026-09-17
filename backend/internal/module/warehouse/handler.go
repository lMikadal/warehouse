package warehouse

import (
	"errors"
	"net/http"
	"strconv"
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
	ID        int64             `json:"id"`
	Type      string            `json:"type"`
	SKU       string            `json:"sku"`
	Name      string            `json:"name"`
	SortOrder int               `json:"sort_order"`
	Capacity  int               `json:"capacity"`
	IsActive  bool              `json:"is_active"`
	UpdatedAt time.Time         `json:"updated_at"`
	Stats     *Stats            `json:"stats,omitempty"`
	Names     map[string]string `json:"names,omitempty"`
}

func (h *Handler) list(c *echo.Context) error {
	q := api.ParsePageQuery(c)
	f := ListFilter{
		Page: q.Page, Limit: q.Limit, Locale: api.LocaleFromRequest(c),
		Search: strings.TrimSpace(c.QueryParam("search")),
		Type:   strings.TrimSpace(c.QueryParam("type")),
	}
	if f.Type == "" {
		f.Type = "warehouse"
	}
	if v := strings.TrimSpace(c.QueryParam("is_active")); v != "" {
		active := v == "true" || v == "1"
		f.IsActive = &active
	}
	if v := strings.TrimSpace(c.QueryParam("parent_id")); v != "" {
		id, err := strconv.ParseInt(v, 10, 64)
		if err == nil {
			f.ParentID = &id
		}
	}
	if v := strings.TrimSpace(c.QueryParam("root_id")); v != "" {
		id, err := strconv.ParseInt(v, 10, 64)
		if err == nil {
			f.RootID = &id
		}
	}
	f.IncludeStats = c.QueryParam("include") == "stats"

	rows, total, err := h.repo.List(c.Request().Context(), f)
	if err != nil {
		applog.HTTPError(c, "list warehouse", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to list"})
	}
	items := make([]listItem, len(rows))
	for i, r := range rows {
		items[i] = listItem{
			ID: r.ID, Type: r.Type, SKU: r.SKU, Name: r.Name,
			SortOrder: r.SortOrder, Capacity: r.Capacity, IsActive: r.IsActive, UpdatedAt: r.UpdatedAt,
		}
		if f.IncludeStats && r.Type == "warehouse" {
			st, err := h.repo.Stats(c.Request().Context(), r.ID)
			if err == nil {
				items[i].Stats = st
			}
		}
	}
	return c.JSON(http.StatusOK, api.NewListResponse(items, int64(total), q))
}

func (h *Handler) get(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	row, err := h.repo.Get(c.Request().Context(), id, api.LocaleFromRequest(c))
	if err != nil {
		applog.HTTPError(c, "get warehouse node", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load"})
	}
	if row == nil {
		return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
	}
	out := map[string]any{
		"id": row.ID, "type": row.Type, "sku": row.SKU, "name": row.Name,
		"parent_id": row.ParentID, "sort_order": row.SortOrder, "capacity": row.Capacity,
		"is_active": row.IsActive, "updated_at": row.UpdatedAt, "names": row.Names,
		"barcode": row.Barcode, "qrcode": row.QRCode, "rfid": row.RFID,
	}
	if row.Type == "zone" {
		conds, err := h.repo.LoadConditions(c.Request().Context(), id)
		if err != nil {
			applog.HTTPError(c, "load conditions", err)
			return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load"})
		}
		out["conditions"] = conds
	}
	return c.JSON(http.StatusOK, out)
}

func (h *Handler) stats(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	st, err := h.repo.Stats(c.Request().Context(), id)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid warehouse"})
		}
		applog.HTTPError(c, "warehouse stats", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load"})
	}
	return c.JSON(http.StatusOK, st)
}

func (h *Handler) tree(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	nodes, err := h.repo.Tree(c.Request().Context(), id, api.LocaleFromRequest(c))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid warehouse"})
		}
		applog.HTTPError(c, "warehouse tree", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load"})
	}
	return c.JSON(http.StatusOK, map[string]any{"items": nodes})
}

type namesBody struct {
	Th string `json:"th"`
	En string `json:"en"`
}

type createBody struct {
	Type     string    `json:"type"`
	SKU      string    `json:"sku"`
	ParentID *int64    `json:"parent_id"`
	Capacity int       `json:"capacity"`
	IsActive bool      `json:"is_active"`
	Names    namesBody `json:"names"`
	conditionsBody
}

func conditionsPatchFromBody(body conditionsBody) ConditionsPatch {
	cp := ConditionsPatch{}
	if body.Shelf != nil {
		cp.Shelf = &conditionAmounts{Amount: body.Shelf.Amount, AmountActive: body.Shelf.AmountActive}
	}
	if body.Rack != nil {
		cp.Rack = &conditionAmounts{Amount: body.Rack.Amount, AmountActive: body.Rack.AmountActive}
	}
	if body.Bin != nil {
		cp.Bin = &conditionAmounts{Amount: body.Bin.Amount, AmountActive: body.Bin.AmountActive}
	}
	return cp
}

func (h *Handler) create(c *echo.Context) error {
	var body createBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	nodeType := strings.TrimSpace(body.Type)
	in := CreateInput{
		Type: nodeType, SKU: body.SKU, ParentID: body.ParentID,
		Capacity: body.Capacity, IsActive: body.IsActive,
		Names: map[string]string{"th": body.Names.Th, "en": body.Names.En},
		ActorID: httputil.ActorID(c),
	}
	if nodeType == "zone" {
		cp := conditionsPatchFromBody(body.conditionsBody)
		if cp.Shelf != nil || cp.Rack != nil || cp.Bin != nil {
			in.Conditions = &cp
		}
	}
	id, err := h.repo.Create(c.Request().Context(), in)
	if err != nil {
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "validation failed"})
		}
		if errors.Is(err, ErrConflict) {
			return c.JSON(http.StatusConflict, api.ErrorBody{Code: "conflict", Message: "sku already exists"})
		}
		applog.HTTPError(c, "create warehouse node", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "create failed"})
	}
	return c.JSON(http.StatusCreated, map[string]any{"id": id})
}

type patchBody struct {
	SKU      *string    `json:"sku"`
	Barcode  *string    `json:"barcode"`
	QRCode   *string    `json:"qrcode"`
	RFID     *string    `json:"rfid"`
	Capacity *int       `json:"capacity"`
	IsActive *bool      `json:"is_active"`
	Names    *namesBody `json:"names"`
}

func (h *Handler) patch(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	var body patchBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	p := Patch{ActorID: httputil.ActorID(c), SKU: body.SKU, Barcode: body.Barcode, QRCode: body.QRCode, RFID: body.RFID, Capacity: body.Capacity, IsActive: body.IsActive}
	if body.Names != nil {
		p.Names = map[string]string{"th": body.Names.Th, "en": body.Names.En}
	}
	err = h.repo.Update(c.Request().Context(), id, p)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "validation failed"})
		}
		if errors.Is(err, ErrConflict) {
			return c.JSON(http.StatusConflict, api.ErrorBody{Code: "conflict", Message: "conflict"})
		}
		applog.HTTPError(c, "patch warehouse node", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "update failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

type conditionsBody struct {
	Shelf *struct {
		Amount       int `json:"amount"`
		AmountActive int `json:"amount_active"`
	} `json:"shelf"`
	Rack *struct {
		Amount       int `json:"amount"`
		AmountActive int `json:"amount_active"`
	} `json:"rack"`
	Bin *struct {
		Amount       int `json:"amount"`
		AmountActive int `json:"amount_active"`
	} `json:"bin"`
}

func (h *Handler) patchConditions(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	var body conditionsBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	cp := conditionsPatchFromBody(body)
	err = h.repo.PatchConditions(c.Request().Context(), id, cp, httputil.ActorID(c))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "validation failed"})
		}
		applog.HTTPError(c, "patch conditions", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "update failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *Handler) delete(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	if err := h.repo.SoftDelete(c.Request().Context(), id, httputil.ActorID(c)); err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		if errors.Is(err, ErrConflict) {
			return c.JSON(http.StatusConflict, api.ErrorBody{Code: "has_stock", Message: "has stock"})
		}
		applog.HTTPError(c, "delete warehouse node", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "delete failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

type reorderBody struct {
	DragID   int64 `json:"drag_id"`
	TargetID int64 `json:"target_id"`
}

func (h *Handler) reorder(c *echo.Context) error {
	var body reorderBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	if body.DragID <= 0 || body.TargetID <= 0 {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "drag_id and target_id required"})
	}
	err := h.repo.Reorder(c.Request().Context(), body.DragID, body.TargetID, httputil.ActorID(c))
	if err != nil {
		if errors.Is(err, ErrInvalidReorder) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid reorder"})
		}
		applog.HTTPError(c, "reorder warehouse", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "reorder failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

type moveBody struct {
	DragID   int64  `json:"drag_id"`
	TargetID int64  `json:"target_id"`
	Zone     string `json:"zone"`
}

func (h *Handler) move(c *echo.Context) error {
	var body moveBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	if err := h.repo.Move(c.Request().Context(), body.DragID, body.TargetID, body.Zone, httputil.ActorID(c)); err != nil {
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid move"})
		}
		applog.HTTPError(c, "move warehouse node", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "move failed"})
	}
	return c.NoContent(http.StatusNoContent)
}
