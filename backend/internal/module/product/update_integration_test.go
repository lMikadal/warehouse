//go:build integration

package product

import (
	"context"
	"database/sql"
	"os"
	"testing"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func TestUpdateCategoryBrandIDsIntegration(t *testing.T) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Skip("DATABASE_URL not set")
	}
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	repo := NewRepository(db)
	p := Patch{
		ActorID:  1,
		SetBrand: true,
		BrandIDs: []int64{1, 2},
		IsActive: boolPtr(true),
		Names:    map[string]string{"th": "เครื่องยนต์", "en": "Engine parts"},
	}
	p.ParentID.Set = true
	p.ParentID.Value = nil

	if err := repo.Update(context.Background(), 3, "category", p); err != nil {
		t.Fatalf("Update category 3: %v", err)
	}
}

func boolPtr(b bool) *bool { return &b }
