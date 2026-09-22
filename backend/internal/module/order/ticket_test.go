package order

import (
	"context"
	"database/sql"
	"os"
	"testing"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func TestValidateTicketItem(t *testing.T) {
	pid := int64(1)
	name := "custom part"
	blank := "   "
	cases := []struct {
		label string
		in    TicketItemInput
		ok    bool
	}{
		{"catalog with product", TicketItemInput{Type: "catalog", ProductItemID: &pid, QtySell: 1}, true},
		{"catalog without product", TicketItemInput{Type: "catalog", QtySell: 1}, false},
		{"custom with name", TicketItemInput{Type: "custom", Name: &name, QtySell: 1}, true},
		{"custom with blank name", TicketItemInput{Type: "custom", Name: &blank, QtySell: 1}, false},
		{"unknown type", TicketItemInput{Type: "new", ProductItemID: &pid, QtySell: 1}, false},
		{"qty below one", TicketItemInput{Type: "catalog", ProductItemID: &pid, QtySell: 0}, false},
		{"negative reorder", TicketItemInput{Type: "catalog", ProductItemID: &pid, QtySell: 1, QtyReorder: -1}, false},
		{"negative deposit", TicketItemInput{Type: "catalog", ProductItemID: &pid, QtySell: 1, Deposit: -0.5}, false},
		{"bad unit", TicketItemInput{Type: "catalog", ProductItemID: &pid, QtySell: 1, Unit: "carton"}, false},
		{"three images", TicketItemInput{Type: "custom", Name: &name, QtySell: 1, SystemFileIDs: []int64{1, 2, 3}}, true},
		{"four images", TicketItemInput{Type: "custom", Name: &name, QtySell: 1, SystemFileIDs: []int64{1, 2, 3, 4}}, false},
	}
	for _, tc := range cases {
		err := validateTicketItem(tc.in)
		if tc.ok && err != nil {
			t.Fatalf("%s: want accepted, got %v", tc.label, err)
		}
		if !tc.ok && err == nil {
			t.Fatalf("%s: want rejected, got nil", tc.label)
		}
	}
}

func TestTicketLinesLocked(t *testing.T) {
	for _, s := range []string{"approved", "received", "completed"} {
		if !ticketLinesLocked(s) {
			t.Fatalf("%s must lock line edits", s)
		}
	}
	for _, s := range []string{"draft", "pending", "cancelled", "rejected"} {
		if ticketLinesLocked(s) {
			t.Fatalf("%s must stay editable", s)
		}
	}
}

func TestInt64Array(t *testing.T) {
	if got := int64Array([]int64{3, 1, 2}); got != "{3,1,2}" {
		t.Fatalf("int64Array: got %q", got)
	}
	if got := int64ArrayOrNil(nil); got != nil {
		t.Fatalf("empty slice must become NULL so the NOT-IN guard keeps every row, got %v", got)
	}
}

func TestPurchaseHistoryTitle(t *testing.T) {
	draft, pending := "draft", "pending"
	title, desc := purchaseHistoryTitle(&draft, &pending, false)
	if title != "เปลี่ยนสถานะ" || desc != "ฉบับร่าง → รออนุมัติ" {
		t.Fatalf("th transition: %q / %q", title, desc)
	}
	title, _ = purchaseHistoryTitle(nil, &draft, true)
	if title != "Status set to Draft" {
		t.Fatalf("en initial: %q", title)
	}
}

// TestTicketLifecycle drives create → status transition → read against a real database.
// Skipped unless DATABASE_URL is set, so `go test ./...` stays green without Postgres.
func TestTicketLifecycle(t *testing.T) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Skip("DATABASE_URL not set")
	}
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	// t.Cleanup, not defer: deferred closes run before registered cleanups, so row cleanup
	// would hit a closed pool and silently leave test rows behind.
	t.Cleanup(func() { _ = db.Close() })
	ctx := context.Background()
	if err := db.PingContext(ctx); err != nil {
		t.Skipf("database unreachable: %v", err)
	}

	var productItemID int64
	if err := db.QueryRowContext(ctx,
		`SELECT id FROM product_item WHERE deleted_at IS NULL ORDER BY id LIMIT 1`).Scan(&productItemID); err != nil {
		t.Skipf("no product_item seed: %v", err)
	}

	repo := NewTicketRepository(db)
	name := "custom line"
	id, err := repo.Create(ctx, TicketCreateInput{
		Status:   "draft",
		Customer: &TicketCustomerInput{Name: "ลูกค้าทดสอบ", Tel: "0800000000"},
		Items: []TicketItemInput{
			{Type: "catalog", ProductItemID: &productItemID, QtySell: 2, QtyReorder: 1, Deposit: 100},
			{Type: "custom", Name: &name, QtySell: 1},
		},
	}, 1)
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM purchase_history WHERE purchase_request_id = $1`, id)
		_, _ = db.Exec(`DELETE FROM purchase_request WHERE id = $1`, id)
	})

	got, err := repo.GetByID(ctx, id)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got.SKU == "" {
		t.Fatal("create must allocate a document number")
	}
	if got.TotalQty != 2 {
		t.Fatalf("total_qty counts line rows, want 2 got %d", got.TotalQty)
	}
	if len(got.Items) != 2 {
		t.Fatalf("want 2 lines, got %d", len(got.Items))
	}
	if got.Items[0].Status != "pending" {
		t.Fatalf("lines of a draft ticket still start pending, got %q", got.Items[0].Status)
	}
	if got.Customer == nil || got.Customer.Name != "ลูกค้าทดสอบ" {
		t.Fatalf("customer snapshot missing: %+v", got.Customer)
	}

	if err := repo.PatchStatus(ctx, id, "pending", 1); err != nil {
		t.Fatalf("patch status: %v", err)
	}
	if err := repo.PatchStatus(ctx, id, "not_a_status", 1); err == nil {
		t.Fatal("unknown status must be rejected")
	}

	// Rejecting every line must drag the header to rejected (v1 rejectIfAllItemsRejected).
	for _, it := range got.Items {
		if err := repo.PatchItemStatus(ctx, id, it.ID, TicketItemStatusInput{Status: "rejected"}, 1); err != nil {
			t.Fatalf("reject line %d: %v", it.ID, err)
		}
	}
	after, err := repo.GetByID(ctx, id)
	if err != nil {
		t.Fatalf("get after reject: %v", err)
	}
	if after.Status != "rejected" {
		t.Fatalf("all lines rejected must reject the ticket, got %q", after.Status)
	}

	hist, err := repo.History(ctx, id, "th")
	if err != nil {
		t.Fatalf("history: %v", err)
	}
	if len(hist.Items) == 0 {
		t.Fatal("status changes must leave history rows")
	}
}
