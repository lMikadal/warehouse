package system

import (
	"errors"
	"net/http"

	"github.com/labstack/echo/v5"
	"github.com/lMikadal/warehouse/backend/internal/api"
	applog "github.com/lMikadal/warehouse/backend/internal/log"
)

type FileHandler struct {
	svc *FileService
}

func NewFileHandler(svc *FileService) *FileHandler {
	return &FileHandler{svc: svc}
}

func (h *FileHandler) upload(c *echo.Context) error {
	purpose := c.FormValue("purpose")
	fh, err := c.FormFile("file")
	if err != nil || fh == nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "file required"})
	}
	src, err := fh.Open()
	if err != nil {
		return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: "invalid file"})
	}
	defer src.Close()

	contentType := fh.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	out, err := h.svc.Upload(c.Request().Context(), purpose, fh.Filename, contentType, fh.Size, src, fileActorID(c))
	if err != nil {
		if errors.Is(err, ErrValidation) {
			return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "validation_error", Message: "invalid file or purpose"})
		}
		applog.HTTPError(c, "upload file", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "upload failed"})
	}
	return c.JSON(http.StatusCreated, out)
}

func (h *FileHandler) get(c *echo.Context) error {
	id, err := filePathID(c)
	if err != nil {
		return err
	}
	out, err := h.svc.Get(c.Request().Context(), id)
	if err != nil {
		if errors.Is(err, ErrFileNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		applog.HTTPError(c, "get file", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "failed to load"})
	}
	return c.JSON(http.StatusOK, out)
}

func (h *FileHandler) delete(c *echo.Context) error {
	id, err := filePathID(c)
	if err != nil {
		return err
	}
	err = h.svc.Delete(c.Request().Context(), id, fileActorID(c))
	if err != nil {
		if errors.Is(err, ErrFileNotFound) {
			return c.JSON(http.StatusNotFound, api.ErrorBody{Code: "not_found", Message: "not found"})
		}
		if errors.Is(err, ErrFileInUse) {
			return c.JSON(http.StatusConflict, api.ErrorBody{Code: "conflict", Message: "file still referenced"})
		}
		applog.HTTPError(c, "delete file", err)
		return c.JSON(http.StatusInternalServerError, api.ErrorBody{Code: "internal_error", Message: "delete failed"})
	}
	return c.NoContent(http.StatusNoContent)
}

func filePathID(c *echo.Context) (int64, error) {
	return pathID(c)
}

func fileActorID(c *echo.Context) int64 {
	return actorID(c)
}
