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

func TestAddressGeoProvinceListGroupsByCountryIntegration(t *testing.T) {
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
	rows, _, err := repo.List(context.Background(), GeoProvince, GeoListFilter{
		Page: 1, Limit: 100, Locale: "th",
	})
	if err != nil {
		t.Fatalf("List provinces: %v", err)
	}

	parentBlock := map[int64]int{}
	var blockOrder []int64
	lastSortByParent := map[int64]int{}

	for _, row := range rows {
		if !row.SystemCountryID.Valid {
			continue
		}
		pid := row.SystemCountryID.Int64
		blockIdx, seen := parentBlock[pid]
		if !seen {
			parentBlock[pid] = len(blockOrder)
			blockOrder = append(blockOrder, pid)
		} else if blockIdx != len(blockOrder)-1 {
			t.Fatalf("country_id=%d rows not contiguous (sibling group split)", pid)
		}
		if prev, ok := lastSortByParent[pid]; ok && row.SortOrder < prev {
			t.Fatalf("country_id=%d sort_order decreased within group: %d after %d", pid, row.SortOrder, prev)
		}
		lastSortByParent[pid] = row.SortOrder
	}
	if len(blockOrder) < 2 {
		t.Skip("need provinces under at least two countries to verify grouping")
	}
}
