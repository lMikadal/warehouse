package setting

import (
	"database/sql"
	"errors"
	"strconv"
	"strings"

	"github.com/labstack/echo/v5"
	"github.com/lMikadal/warehouse/backend/internal/api"
	pkgauth "github.com/lMikadal/warehouse/backend/internal/auth"
)

var ErrNotFound = errors.New("not found")
var ErrValidation = errors.New("validation")
var ErrInvalidReorder = errors.New("invalid reorder")
var ErrConflict = errors.New("conflict")

func pathID(c *echo.Context) (int64, error) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		_ = c.JSON(400, api.ErrorBody{Code: "invalid_request", Message: "invalid id"})
		return 0, err
	}
	return id, nil
}

func actorID(c *echo.Context) int64 {
	if p, ok := pkgauth.PrincipalFrom(c); ok {
		return p.UserID
	}
	return 0
}

func nullActor(id int64) sql.NullInt64 {
	if id <= 0 {
		return sql.NullInt64{}
	}
	return sql.NullInt64{Int64: id, Valid: true}
}

func validateNames(names map[string]string) error {
	if strings.TrimSpace(names["th"]) == "" || strings.TrimSpace(names["en"]) == "" {
		return ErrValidation
	}
	return nil
}

func namesFromBody(th, en string) map[string]string {
	return map[string]string{"th": strings.TrimSpace(th), "en": strings.TrimSpace(en)}
}

type namesBody struct {
	Th string `json:"th"`
	En string `json:"en"`
}

type reorderBody struct {
	DragID   int64  `json:"drag_id"`
	TargetID int64  `json:"target_id"`
	Type     string `json:"type"` // prefix reorder scope: person | company
}
