package product

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v5"
)

func TestReadPatchBodyBindsJSONMap(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodPatch, "/", bytes.NewBufferString(`{"is_active":true,"brand_ids":[1,2]}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	raw, err := readPatchBody(c)
	if err != nil {
		t.Fatalf("bind: %v", err)
	}
	if raw["is_active"] != true {
		t.Fatalf("is_active: %v", raw["is_active"])
	}
	arr, ok := raw["brand_ids"].([]any)
	if !ok || len(arr) != 2 {
		t.Fatalf("brand_ids: %v %v", raw["brand_ids"], ok)
	}
}
