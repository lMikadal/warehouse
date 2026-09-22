package order

import (
	"context"
	"database/sql"
	"os"
	"testing"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func TestClaimNextStatus(t *testing.T) {
	cases := []struct {
		label      string
		from, want string
		rerouted   bool
		ok         bool
	}{
		{"a waiting line goes to the supplier", "pending", "in_progress", false, true},
		{"a waiting line can be dropped", "pending", "cancelled", false, true},
		{"the supplier settles", "in_progress", "completed", false, true},
		{"the supplier refuses", "in_progress", "cancelled", false, true},
		{"a settled line does not reopen on its own", "completed", "pending", false, false},
		{"a dropped line reopens when rerouted", "cancelled", "pending", true, true},
		{"a settled line cannot go back to the supplier", "completed", "in_progress", true, false},
		{"the same status is a no-op", "completed", "completed", false, true},
		{"an unknown status is refused", "pending", "archived", false, false},
	}
	for _, tc := range cases {
		got, err := claimNextStatus(tc.from, tc.want, tc.rerouted)
		if tc.ok {
			if err != nil {
				t.Fatalf("%s: %v", tc.label, err)
			}
			if got != tc.want {
				t.Fatalf("%s: got %q want %q", tc.label, got, tc.want)
			}
			continue
		}
		if err == nil {
			t.Fatalf("%s: %s → %s must be refused", tc.label, tc.from, tc.want)
		}
	}
}

// TestClaimLifecycle walks a real discrepancy from filing to settlement and then writes a second one
// off, checking the claim document and the restored purchase line along the way.
func TestClaimLifecycle(t *testing.T) {
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

	var productItemID int64
	if err := db.QueryRowContext(ctx,
		`SELECT id FROM product_item WHERE deleted_at IS NULL ORDER BY id LIMIT 1`).Scan(&productItemID); err != nil {
		t.Skipf("no product_item seed: %v", err)
	}

	purchases := NewPurchaseRepository(db)
	orderID, err := purchases.Create(ctx, PurchaseSaveInput{
		Status:  "draft",
		VatType: "exclude",
		VatRate: 7,
		Items: []PurchaseItemInput{
			{Type: "catalog", ProductItemID: &productItemID, Qty: 10, Unit: "piece", PricePerUnit: 100, Discount: 50},
			{Type: "catalog", ProductItemID: &productItemID, Qty: 10, Unit: "piece", PricePerUnit: 100, Discount: 50},
		},
	}, 1)
	if err != nil {
		t.Fatalf("create order: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM purchase_claim_item WHERE purchase_claim_id IN
			(SELECT id FROM purchase_claim WHERE purchase_order_id = $1)`, orderID)
		_, _ = db.Exec(`DELETE FROM purchase_claim WHERE purchase_order_id = $1`, orderID)
		_, _ = db.Exec(`DELETE FROM purchase_history WHERE purchase_order_id = $1`, orderID)
		_, _ = db.Exec(`DELETE FROM purchase_order_item_reject WHERE purchase_order_id = $1`, orderID)
		_, _ = db.Exec(`DELETE FROM purchase_order WHERE id = $1`, orderID)
	})
	for _, s := range []string{"pending", "paying", "completed"} {
		if err := purchases.PatchStatus(ctx, orderID, s, 1); err != nil {
			t.Fatalf("status %s: %v", s, err)
		}
	}
	detail, err := purchases.GetByID(ctx, orderID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	itemID := detail.Items[0].ID
	// A reject takes its line out of receive, so the write-off case below needs a line of its own.
	secondItemID := detail.Items[1].ID

	receives := NewReceiveRepository(db)
	rejectID, err := receives.CreateReject(ctx, orderID, itemID, ReceiveRejectInput{
		Type:       "damaged",
		Resolution: "claim",
		Qty:        3,
		Unit:       "piece",
		Price:      100,
		VatRate:    7,
		Note:       "three arrived cracked",
	}, 1)
	if err != nil {
		t.Fatalf("file reject: %v", err)
	}

	claims := NewClaimRepository(db)
	list, err := claims.List(ctx, ClaimListQuery{Page: 1, Limit: 50, Status: "pending"})
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	found := false
	for _, row := range list.Items {
		if row.ID == rejectID {
			found = true
			if row.Resolution != "claim" || row.SKU == "" {
				t.Fatalf("a filed claim must carry its resolution and number, got %+v", row)
			}
			if row.PurchaseOrderSKU == nil {
				t.Fatal("the list must show which order the claim came from")
			}
		}
	}
	if !found {
		t.Fatalf("the new claim must appear under the pending chip; got %d rows", len(list.Items))
	}

	// Confirming pushes it to the supplier and opens the claim document.
	inProgress := "in_progress"
	note := "sent photos to the supplier"
	res, err := claims.Update(ctx, rejectID, ClaimUpdateInput{Status: &inProgress, NoteProcess: &note}, 1)
	if err != nil {
		t.Fatalf("confirm: %v", err)
	}
	if res.PurchaseClaimID == nil || res.ClaimSKU == nil || *res.ClaimSKU == "" {
		t.Fatalf("confirming must open a numbered claim document, got %+v", res)
	}
	claimDocID := *res.PurchaseClaimID

	// The supplier agrees: the line settles and the document closes as a success.
	completed := "completed"
	accepted := "supplier credited us"
	if _, err := claims.Update(ctx, rejectID,
		ClaimUpdateInput{Status: &completed, NoteProcess: &accepted}, 1); err != nil {
		t.Fatalf("settle: %v", err)
	}
	var docStatus string
	if err := db.QueryRowContext(ctx,
		`SELECT status::text FROM purchase_claim WHERE id = $1`, claimDocID).Scan(&docStatus); err != nil {
		t.Fatalf("read claim doc: %v", err)
	}
	if docStatus != "success" {
		t.Fatalf("a settled claim closes its document as success, got %q", docStatus)
	}

	got, err := claims.GetByID(ctx, purchases, rejectID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got.Status != "completed" || got.NoteProcess != accepted {
		t.Fatalf("detail must show the settlement, got status=%q note=%q", got.Status, got.NoteProcess)
	}
	if got.Order == nil || got.Item == nil || got.Item.ID != itemID {
		t.Fatal("detail must carry the order and the affected line for the process screen")
	}
	history, err := claims.History(ctx, rejectID, "th")
	if err != nil {
		t.Fatalf("history: %v", err)
	}
	if len(history.Items) < 2 {
		t.Fatalf("both status moves must be in the history, got %d", len(history.Items))
	}

	// A second discrepancy gets written off: the quantity must come back to the purchase line.
	writeOffID, err := receives.CreateReject(ctx, orderID, secondItemID, ReceiveRejectInput{
		Type:       "shortage",
		Resolution: "claim",
		Qty:        2,
		Unit:       "piece",
		Price:      100,
		VatRate:    7,
		Note:       "two short",
	}, 1)
	if err != nil {
		t.Fatalf("file second reject: %v", err)
	}
	if _, err := db.ExecContext(ctx,
		`UPDATE purchase_order_item SET qty = qty - 2 WHERE id = $1`, secondItemID); err != nil {
		t.Fatalf("simulate the receive desk deducting the shortage: %v", err)
	}
	writeOff := ClaimResolutionWriteOff
	cancelled := "cancelled"
	reason := "not worth chasing"
	// A write-off without a reason is refused: it is a decision, not a default.
	if _, err := claims.Update(ctx, writeOffID,
		ClaimUpdateInput{Resolution: &writeOff, Status: &cancelled}, 1); err == nil {
		t.Fatal("a write-off with no reason must be refused")
	}
	wo, err := claims.Update(ctx, writeOffID, ClaimUpdateInput{
		Resolution: &writeOff, Status: &cancelled, NoteResolution: &reason,
	}, 1)
	if err != nil {
		t.Fatalf("write off: %v", err)
	}
	if wo.RestoredItemQty == nil || *wo.RestoredItemQty != 10 {
		t.Fatalf("writing off must hand the quantity back to the line, got %v", wo.RestoredItemQty)
	}
	var discount float64
	if err := db.QueryRowContext(ctx,
		`SELECT discount::float8 FROM purchase_order_item WHERE id = $1`, secondItemID).Scan(&discount); err != nil {
		t.Fatalf("read discount: %v", err)
	}
	// 50 over 8 units scaled back to 10 units keeps the per-unit discount the buyer negotiated.
	if discount < 62.4 || discount > 62.6 {
		t.Fatalf("the discount must scale with the restored quantity, got %v", discount)
	}

	// A written-off line reopens only by being rerouted to a real outcome.
	pending := "pending"
	if _, err := claims.Update(ctx, writeOffID, ClaimUpdateInput{Status: &pending}, 1); err == nil {
		t.Fatal("a written-off line must not reopen without a new resolution")
	}
	ret := "return"
	if _, err := claims.Update(ctx, writeOffID,
		ClaimUpdateInput{Resolution: &ret, Status: &pending}, 1); err != nil {
		t.Fatalf("reroute to a return: %v", err)
	}

	counts, err := claims.Count(ctx, ClaimListQuery{})
	if err != nil {
		t.Fatalf("count: %v", err)
	}
	if counts.ByStatus["completed"] < 1 || counts.ByStatus["pending"] < 1 {
		t.Fatalf("the chips must count both the settled and the rerouted line, got %+v", counts.ByStatus)
	}
}
