package setting

import (
	"database/sql"
	"encoding/json"
	"errors"
	"strings"

	"github.com/labstack/echo/v5"
)

// optionalInt64 distinguishes JSON omit (Set false) from explicit null or number.
type optionalInt64 struct {
	Set   bool
	Value *int64
}

func (o *optionalInt64) UnmarshalJSON(b []byte) error {
	o.Set = true
	if string(b) == "null" {
		o.Value = nil
		return nil
	}
	var v int64
	if err := json.Unmarshal(b, &v); err != nil {
		return err
	}
	o.Value = &v
	return nil
}

var ErrNotFound = errors.New("not found")
var ErrValidation = errors.New("validation")
var ErrInvalidReorder = errors.New("invalid reorder")
var ErrConflict = errors.New("conflict")

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
	DragID    int64 `json:"drag_id"`
	TargetID  int64 `json:"target_id"`
	IsPerson  *bool `json:"is_person,omitempty"`  // prefix reorder scope (exactly one true)
	IsCompany *bool `json:"is_company,omitempty"` // prefix reorder scope (exactly one true)
}

func prefixReorderScopeFromRequest(c *echo.Context, body reorderBody) prefixReorderScope {
	person := body.IsPerson
	company := body.IsCompany
	if person == nil {
		if v := strings.TrimSpace(c.QueryParam("is_person")); v == "true" || v == "1" {
			b := true
			person = &b
		}
	}
	if company == nil {
		if v := strings.TrimSpace(c.QueryParam("is_company")); v == "true" || v == "1" {
			b := true
			company = &b
		}
	}
	scope := prefixReorderScope{}
	if person != nil && *person && (company == nil || !*company) {
		scope.IsPerson = true
		return scope
	}
	if company != nil && *company && (person == nil || !*person) {
		scope.IsCompany = true
		return scope
	}
	return scope
}
