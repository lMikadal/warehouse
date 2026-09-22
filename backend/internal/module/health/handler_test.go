package health_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/lMikadal/warehouse/backend/internal/api"
	"github.com/lMikadal/warehouse/backend/internal/module/health"
	"github.com/labstack/echo/v5"
)

func TestHealth(t *testing.T) {
	e := echo.New()
	health.RegisterRoutes(e.Group(api.V1Prefix))

	req := httptest.NewRequest(http.MethodGet, api.V1Prefix+"/health", nil)
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status: got %d want %d", rec.Code, http.StatusOK)
	}
	want := `{"status":"ok"}` + "\n"
	if got := rec.Body.String(); got != want {
		t.Fatalf("body: got %q want %q", got, want)
	}
}
