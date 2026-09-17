package product

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

type Handler struct {
	repo     *Repository
	attrType string
}

func NewHandler(repo *Repository, attrType string) *Handler {
	return &Handler{repo: repo, attrType: attrType}
}

type listItem struct {
	ID        int64   `json:"id"`
	ParentID  *int64  `json:"parent_id"`
	TypeCar   *string `json:"type_car,omitempty"`
	TreePath  string  `json:"tree_path,omitempty"`
	Name      string  `json:"name"`
	SortOrder int     `json:"sort_order"`
	IsActive  bool    `json:"is_active"`
	IsStopped bool    `json:"is_stopped,omitempty"`
	UpdatedAt time.Time `json:"updated_at"`
}

type detailItem struct {
	listItem
	Names    map[string]string `json:"names,omitempty"`
	BrandIDs []int64           `json:"brand_ids,omitempty"`
}

func rowToListItem(r Row) listItem {
	return listItem{
		ID: r.ID, ParentID: r.ParentID, TypeCar: r.TypeCar, TreePath: r.TreePath, Name: r.Name,
		SortOrder: r.SortOrder, IsActive: r.IsActive, IsStopped: r.IsStopped, UpdatedAt: r.UpdatedAt,
	}
}

func (h *Handler) list(c *echo.Context) error {
	q := api.ParsePageQuery(c)
	f := ListFilter{
		AttrType: h.attrType,
		Page:     q.Page,
		Limit:    q.Limit,
		Locale:   api.LocaleFromRequest(c),
		Search:   strings.TrimSpace(c.QueryParam("search")),
	}
	if v := strings.TrimSpace(c.QueryParam("is_active")); v != "" {
		active := v == "true" || v == "1"
		f.IsActive = &active
	}
	rows, total, err := h.repo.List(c.Request().Context(), f)
	if err != nil {
		applog.HTTPError(c, "list product attribute", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to list"})
	}
	items := make([]listItem, len(rows))
	for i, r := range rows {
		items[i] = rowToListItem(r)
	}
	return c.JSON(http.StatusOK, api.NewListResponse(items, int64(total), q))
}

func (h *Handler) get(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	row, err := h.repo.Get(c.Request().Context(), id, h.attrType, api.LocaleFromRequest(c))
	if err != nil {
		applog.HTTPError(c, "get product attribute", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load"})
	}
	if row == nil {
		return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
	}
	out := detailItem{listItem: rowToListItem(*row), Names: row.Names, BrandIDs: row.BrandIDs}
	return c.JSON(http.StatusOK, out)
}

type namesBody struct {
	Th string `json:"th"`
	En string `json:"en"`
}

func namesFromBody(th, en string) map[string]string {
	return map[string]string{"th": strings.TrimSpace(th), "en": strings.TrimSpace(en)}
}

type createBody struct {
	IsActive bool      `json:"is_active"`
	Names    namesBody `json:"names"`
	ParentID *int64    `json:"parent_id"`
	TypeCar  *string   `json:"type_car"`
	BrandIDs []int64   `json:"brand_ids"`
}

func (h *Handler) create(c *echo.Context) error {
	var body createBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	id, err := h.repo.Create(c.Request().Context(), CreateInput{
		AttrType: h.attrType,
		TypeCar:  body.TypeCar,
		ParentID: body.ParentID,
		IsActive: body.IsActive,
		Names:    namesFromBody(body.Names.Th, body.Names.En),
		BrandIDs: body.BrandIDs,
		ActorID:  httputil.ActorID(c),
	})
	if err != nil {
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "validation failed"})
		}
		applog.HTTPError(c, "create product attribute", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "create failed"})
	}
	return c.JSON(http.StatusCreated, map[string]any{"id": id})
}

func (h *Handler) patch(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	raw, err := readPatchBody(c)
	if err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	p := Patch{ActorID: httputil.ActorID(c)}
	if v, ok := raw["is_active"]; ok {
		if b, ok := v.(bool); ok {
			p.IsActive = &b
		}
	}
	if v, ok := raw["names"]; ok && v != nil {
		b, _ := json.Marshal(v)
		var nb namesBody
		if json.Unmarshal(b, &nb) == nil {
			p.Names = namesFromBody(nb.Th, nb.En)
		}
	}
	if _, ok := raw["parent_id"]; ok {
		p.ParentID.Set = true
		if raw["parent_id"] == nil {
			p.ParentID.Value = nil
		} else if f, ok := raw["parent_id"].(float64); ok {
			v := int64(f)
			p.ParentID.Value = &v
		}
	}
	if v, ok := raw["type_car"]; ok && v != nil {
		if s, ok := v.(string); ok {
			p.TypeCar = &s
		}
	}
	if _, ok := raw["brand_ids"]; ok {
		p.SetBrand = true
		if arr, ok := raw["brand_ids"].([]any); ok {
			for _, it := range arr {
				if f, ok := it.(float64); ok {
					p.BrandIDs = append(p.BrandIDs, int64(f))
				}
			}
		}
	}
	err = h.repo.Update(c.Request().Context(), id, h.attrType, p)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "validation failed"})
		}
		applog.HTTPError(c, "patch product attribute", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "update failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

func readPatchBody(c *echo.Context) (map[string]any, error) {
	var raw map[string]any
	if err := c.Bind(&raw); err != nil {
		return nil, err
	}
	if raw == nil {
		raw = map[string]any{}
	}
	return raw, nil
}

func (h *Handler) delete(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	if err := h.repo.SoftDelete(c.Request().Context(), id, h.attrType, httputil.ActorID(c)); err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		applog.HTTPError(c, "delete product attribute", err)
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
	err := h.repo.Reorder(c.Request().Context(), h.attrType, body.DragID, body.TargetID, httputil.ActorID(c))
	if err != nil {
		if errors.Is(err, ErrInvalidReorder) || errors.Is(err, ErrDragSiblingOnly) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: err.Error()})
		}
		applog.HTTPError(c, "reorder product attribute", err)
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
	if err := h.repo.Move(c.Request().Context(), h.attrType, body.DragID, body.TargetID, body.Zone, httputil.ActorID(c)); err != nil {
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid move"})
		}
		applog.HTTPError(c, "move product attribute", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "move failed"})
	}
	return c.NoContent(http.StatusNoContent)
}
