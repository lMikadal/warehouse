//go:build integration

package system

import (
	"context"
	"database/sql"
	"os"
	"testing"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func TestAddressGeoSubDistrictListIntegration(t *testing.T) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Skip("DATABASE_URL not set")
	}
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	repo := NewAddressGeoRepository(db)
	rows, total, err := repo.List(context.Background(), GeoSubDistrict, GeoListFilter{
		Page: 1, Limit: 10, Locale: "th",
	})
	if err != nil {
		t.Fatalf("List sub-district: %v", err)
	}
	if total < 1 || len(rows) < 1 {
		t.Fatalf("expected rows, got total=%d len=%d", total, len(rows))
	}
}
