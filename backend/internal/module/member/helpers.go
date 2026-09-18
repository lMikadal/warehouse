package member

import (
	"database/sql"
	"encoding/json"
	"strings"
)

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
	Zone     string `json:"zone,omitempty"`
}
