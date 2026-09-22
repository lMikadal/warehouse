package product

import (
	"context"
	"database/sql"
	"os"
	"testing"

	_ "github.com/jackc/pgx/v5/stdlib"
)

// TestItemBrowseRefillFilter proves each refill_filter branch is valid SQL against a real database.
// Skipped unless DATABASE_URL is set, so `go test ./...` stays green without Postgres.
func TestItemBrowseRefillFilter(t *testing.T) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Skip("DATABASE_URL not set")
	}
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	ctx := context.Background()
	if err := db.PingContext(ctx); err != nil {
		t.Skipf("database unreachable: %v", err)
	}

	repo := NewItemRepository(db)
	base, _, err := repo.ListBrowse(ctx, ItemListFilter{Page: 1, Limit: 50, Locale: "th"})
	if err != nil {
		t.Fatalf("unfiltered browse: %v", err)
	}
	for _, filter := range []string{"low_stock", "is_stop", "ordered", "all", "nonsense"} {
		rows, total, err := repo.ListBrowse(ctx, ItemListFilter{
			Page: 1, Limit: 50, Locale: "th", Refill: filter,
		})
		if err != nil {
			t.Fatalf("refill=%q: %v", filter, err)
		}
		if int64(len(rows)) > total {
			t.Fatalf("refill=%q returned more rows than the count: %d > %d", filter, len(rows), total)
		}
		// "all" and an unknown value must not filter anything out.
		if (filter == "all" || filter == "nonsense") && len(rows) != len(base) {
			t.Fatalf("refill=%q must behave like no filter, got %d rows want %d", filter, len(rows), len(base))
		}
	}

	// low_stock must agree with the LowStock flag the row already computes.
	low, _, err := repo.ListBrowse(ctx, ItemListFilter{Page: 1, Limit: 50, Locale: "th", Refill: "low_stock"})
	if err != nil {
		t.Fatalf("low_stock browse: %v", err)
	}
	for _, row := range low {
		if !row.LowStock {
			t.Fatalf("item %d matched low_stock but LowStock is false (stock %v, minimum %d)",
				row.ID, row.TotalStock, row.MinimumStock)
		}
	}
}
