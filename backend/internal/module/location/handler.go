package location

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

type Handler struct {
	repo *Repository
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

type item struct {
	ID        int64             `json:"id"`
	Name      string            `json:"name"`
	SortOrder int               `json:"sort_order"`
	IsActive  bool              `json:"is_active"`
	UpdatedAt time.Time         `json:"updated_at"`
	Names     map[string]string `json:"names,omitempty"`
}

func itemFromRow(r Row, includeNames bool) item {
	it := item{
		ID: r.ID, Name: r.Name, SortOrder: r.SortOrder, IsActive: r.IsActive, UpdatedAt: r.UpdatedAt,
	}
	if includeNames && r.Names != nil {
		it.Names = r.Names
	}
	return it
}

func (h *Handler) list(c *echo.Context) error {
	q := api.ParsePageQuery(c)
	f := ListFilter{
		Page: q.Page, Limit: q.Limit, Locale: api.LocaleFromRequest(c),
		Search: strings.TrimSpace(c.QueryParam("search")),
	}
	if v := strings.TrimSpace(c.QueryParam("is_active")); v != "" {
		active := v == "true" || v == "1"
		f.IsActive = &active
	}
	f.Sort = strings.TrimSpace(c.QueryParam("sort"))
	f.Order = strings.ToLower(strings.TrimSpace(c.QueryParam("order")))

	rows, total, err := h.repo.List(c.Request().Context(), f)
	if err != nil {
		applog.HTTPError(c, "list location", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to list"})
	}
	items := make([]item, len(rows))
	for i, r := range rows {
		items[i] = itemFromRow(r, false)
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
		applog.HTTPError(c, "get location", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load"})
	}
	if row == nil {
		return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
	}
	return c.JSON(http.StatusOK, itemFromRow(*row, true))
}

type namesBody struct {
	Th string `json:"th"`
	En string `json:"en"`
}

type createBody struct {
	IsActive bool      `json:"is_active"`
	Names    namesBody `json:"names"`
}

func namesFromBody(th, en string) map[string]string {
	return map[string]string{"th": strings.TrimSpace(th), "en": strings.TrimSpace(en)}
}

func (h *Handler) create(c *echo.Context) error {
	var body createBody
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	id, err := h.repo.Create(c.Request().Context(), CreateInput{
		IsActive: body.IsActive,
		Names:    namesFromBody(body.Names.Th, body.Names.En),
		ActorID:  httputil.ActorID(c),
	})
	if err != nil {
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "validation failed"})
		}
		applog.HTTPError(c, "create location", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "create failed"})
	}
	return c.JSON(http.StatusCreated, map[string]any{"id": id})
}

type patchBody struct {
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
	patch := Patch{ActorID: httputil.ActorID(c), IsActive: body.IsActive}
	if body.Names != nil {
		patch.Names = namesFromBody(body.Names.Th, body.Names.En)
	}
	err = h.repo.Update(c.Request().Context(), id, patch)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "validation failed"})
		}
		applog.HTTPError(c, "patch location", err)
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
		applog.HTTPError(c, "delete location", err)
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
		applog.HTTPError(c, "reorder location", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "reorder failed"})
	}
	return c.NoContent(http.StatusNoContent)
}
