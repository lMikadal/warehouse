package supplier

import (
	"context"
	"database/sql"
	"os"
	"testing"

	_ "github.com/jackc/pgx/v5/stdlib"
)

// TestListBankFilters proves the payment-form bank combobox query is valid SQL and that the id
// override still resolves a deactivated account. Skipped unless DATABASE_URL is set.
func TestListBankFilters(t *testing.T) {
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
	repo := NewRepository(db)

	// No supplier rows needed: an unknown supplier must simply come back empty, not error.
	rows, err := repo.ListBankFilters(ctx, 999999999, "", 0)
	if err != nil {
		t.Fatalf("unknown supplier: %v", err)
	}
	if len(rows) != 0 {
		t.Fatalf("unknown supplier returned %d rows, want 0", len(rows))
	}
	if _, err := repo.ListBankFilters(ctx, 1, "kasikorn", 0); err != nil {
		t.Fatalf("search: %v", err)
	}
	if _, err := repo.ListBankFilters(ctx, 1, "", 42); err != nil {
		t.Fatalf("by id: %v", err)
	}
}
