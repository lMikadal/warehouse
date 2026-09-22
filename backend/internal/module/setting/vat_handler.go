package setting

import (
	"errors"
	"net/http"
	"time"

	"github.com/lMikadal/warehouse/backend/internal/api"
	"github.com/lMikadal/warehouse/backend/internal/httputil"
	applog "github.com/lMikadal/warehouse/backend/internal/log"
	"github.com/labstack/echo/v5"
)

type VatHandler struct {
	repo *VatRepository
}

func NewVatHandler(repo *VatRepository) *VatHandler {
	return &VatHandler{repo: repo}
}

type vatItem struct {
	ID        int64     `json:"id"`
	VatType   string    `json:"vat_type"`
	Rate      float64   `json:"rate"`
	IsActive  bool      `json:"is_active"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (h *VatHandler) getSingleton(c *echo.Context) error {
	row, err := h.repo.GetSingleton(c.Request().Context())
	if err != nil {
		applog.HTTPError(c, "get setting vat", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load"})
	}
	if row == nil {
		return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "vat not configured"})
	}
	return c.JSON(http.StatusOK, vatItem(*row))
}

func (h *VatHandler) patch(c *echo.Context) error {
	id, err := httputil.PathID(c, "id")
	if err != nil {
		return err
	}
	var body struct {
		VatType  *string  `json:"vat_type"`
		Rate     *float64 `json:"rate"`
		IsActive *bool    `json:"is_active"`
	}
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid body"})
	}
	err = h.repo.Update(c.Request().Context(), id, body.VatType, body.Rate, body.IsActive, httputil.ActorID(c))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "validation failed"})
		}
		applog.HTTPError(c, "patch setting vat", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "update failed"})
	}
	return c.NoContent(http.StatusNoContent)
}
