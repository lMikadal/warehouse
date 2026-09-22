package order

import (
	"context"
	"database/sql"
	"os"
	"testing"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func TestComputePurchaseTotals(t *testing.T) {
	// 10 × 100 = 1000 subtotal, 50 line discount + 100 order discount + 50 special = 200 off,
	// 7% VAT on the remaining 800.
	got := computePurchaseTotals(1000, 50, 100, 50, 7)
	want := PurchaseTotals{
		TotalPrice:         1000,
		TotalDiscount:      200,
		TotalPriceDiscount: 800,
		TotalVat:           56,
		TotalPriceVat:      1070,
		TotalGrandPrice:    856,
	}
	if got != want {
		t.Fatalf("totals mismatch\n got %+v\nwant %+v", got, want)
	}

	// Discounts can never push the payable below zero.
	clamped := computePurchaseTotals(100, 90, 90, 0, 7)
	if clamped.TotalDiscount != 100 || clamped.TotalPriceDiscount != 0 || clamped.TotalGrandPrice != 0 {
		t.Fatalf("over-discount must clamp at the subtotal, got %+v", clamped)
	}

	// A negative or absurd VAT rate must not leak into the money columns.
	if v := computePurchaseTotals(100, 0, 0, 0, -5).TotalVat; v != 0 {
		t.Fatalf("negative vat rate must floor at 0, got %v", v)
	}
	if v := computePurchaseTotals(100, 0, 0, 0, 500).TotalVat; v != 100 {
		t.Fatalf("vat rate must cap at 100%%, got %v", v)
	}
}

func TestValidatePurchaseItem(t *testing.T) {
	pid := int64(1)
	name := "custom part"
	blank := "  "
	cases := []struct {
		label string
		in    PurchaseItemInput
		ok    bool
	}{
		{"catalog with product", PurchaseItemInput{Type: "catalog", ProductItemID: &pid, Qty: 1}, true},
		{"catalog without product", PurchaseItemInput{Type: "catalog", Qty: 1}, false},
		{"custom with name", PurchaseItemInput{Type: "custom", Name: &name, Qty: 1}, true},
		{"custom with blank name", PurchaseItemInput{Type: "custom", Name: &blank, Qty: 1}, false},
		{"unknown type", PurchaseItemInput{Type: "other", ProductItemID: &pid, Qty: 1}, false},
		{"qty below one", PurchaseItemInput{Type: "catalog", ProductItemID: &pid, Qty: 0}, false},
		{"negative free gift", PurchaseItemInput{Type: "catalog", ProductItemID: &pid, Qty: 1, FreeGift: -1}, false},
		{"bad unit", PurchaseItemInput{Type: "catalog", ProductItemID: &pid, Qty: 1, Unit: "carton"}, false},
		{"discount within line", PurchaseItemInput{Type: "catalog", ProductItemID: &pid, Qty: 2, PricePerUnit: 50, Discount: 100}, true},
		{"discount over line", PurchaseItemInput{Type: "catalog", ProductItemID: &pid, Qty: 2, PricePerUnit: 50, Discount: 101}, false},
	}
	for _, tc := range cases {
		err := validatePurchaseItem(tc.in)
		if tc.ok && err != nil {
			t.Fatalf("%s: want accepted, got %v", tc.label, err)
		}
		if !tc.ok && err == nil {
			t.Fatalf("%s: want rejected, got nil", tc.label)
		}
	}
}

func TestPurchaseLocked(t *testing.T) {
	for _, s := range []string{"draft", "pending"} {
		if purchaseLocked(s) {
			t.Fatalf("%s must stay editable", s)
		}
	}
	for _, s := range []string{"paying", "completed", "receive_partial", "receive_completed", "rejected", "cancelled"} {
		if !purchaseLocked(s) {
			t.Fatalf("%s must freeze header/line edits", s)
		}
	}
}

// TestPurchaseLifecycle drives create → approve → read → convert unit against a real database.
// Skipped unless DATABASE_URL is set, so `go test ./...` stays green without Postgres.
func TestPurchaseLifecycle(t *testing.T) {
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

	repo := NewPurchaseRepository(db)
	id, err := repo.Create(ctx, PurchaseSaveInput{
		Status:   "draft",
		VatType:  "exclude",
		VatRate:  7,
		Discount: 100,
		Items: []PurchaseItemInput{
			{Type: "catalog", ProductItemID: &productItemID, Qty: 10, Unit: "piece", PricePerUnit: 100, Discount: 50},
		},
	}, 1)
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM purchase_history WHERE purchase_order_id = $1`, id)
		_, _ = db.Exec(`DELETE FROM purchase_order WHERE id = $1`, id)
	})

	got, err := repo.GetByID(ctx, id)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got.SKUDraft == nil || *got.SKUDraft == "" {
		t.Fatal("a draft order must carry the PO(T) draft number")
	}
	if got.SKU != nil {
		t.Fatalf("the real PO number is only issued on approval, got %v", *got.SKU)
	}
	if got.TotalGrandPrice != 909.5 {
		t.Fatalf("grand total: want 909.5 (1000 − 50 − 100, +7%% VAT), got %v", got.TotalGrandPrice)
	}
	if got.Items[0].Status != "pending" {
		t.Fatalf("new lines start pending, got %q", got.Items[0].Status)
	}

	if err := repo.PatchStatus(ctx, id, "not_a_status", 1); err == nil {
		t.Fatal("unknown status must be rejected")
	}
	if err := repo.PatchStatus(ctx, id, "pending", 1); err != nil {
		t.Fatalf("approve: %v", err)
	}
	approved, err := repo.GetByID(ctx, id)
	if err != nil {
		t.Fatalf("get after approve: %v", err)
	}
	if approved.SKU == nil || *approved.SKU == "" {
		t.Fatal("leaving draft must allocate the real PO number")
	}
	if approved.Items[0].Status != "approved" {
		t.Fatalf("approving the order approves its pending lines, got %q", approved.Items[0].Status)
	}

	// Convert 6 of the 10 pieces into boxes at 3 pieces per box → 2 boxes, 4 pieces left behind.
	itemID := approved.Items[0].ID
	conv, err := repo.ConvertItemUnit(ctx, id, itemID,
		PurchaseConvertUnitInput{QtyToConvert: 6, FromRatio: 3, ToRatio: 1, TargetUnit: "box"}, 1)
	if err != nil {
		t.Fatalf("convert unit: %v", err)
	}
	if conv.Qty != 2 || conv.SourceDeleted {
		t.Fatalf("want 2 boxes with the source line kept, got %+v", conv)
	}
	split, err := repo.GetByID(ctx, id)
	if err != nil {
		t.Fatalf("get after convert: %v", err)
	}
	if len(split.Items) != 2 {
		t.Fatalf("convert must add one split line, got %d lines", len(split.Items))
	}
	if split.Items[0].Qty != 4 {
		t.Fatalf("source line keeps the remainder, want 4 got %d", split.Items[0].Qty)
	}
	// Money stays on the source line so the order total must not move.
	if split.TotalGrandPrice != got.TotalGrandPrice {
		t.Fatalf("split lines carry price 0, so the total must hold at %v, got %v",
			got.TotalGrandPrice, split.TotalGrandPrice)
	}
	if split.Items[1].OldQty == nil || *split.Items[1].OldQty != 6 || split.Items[1].Unit != "box" {
		t.Fatalf("split line must record old_qty 6 in unit box, got %+v", split.Items[1])
	}

	if err := repo.RevertItemUnit(ctx, id, split.Items[1].ID, 1); err != nil {
		t.Fatalf("revert unit: %v", err)
	}
	reverted, err := repo.GetByID(ctx, id)
	if err != nil {
		t.Fatalf("get after revert: %v", err)
	}
	if len(reverted.Items) != 1 || reverted.Items[0].Qty != 10 {
		t.Fatalf("revert must restore the source line to qty 10, got %+v", reverted.Items)
	}
	if err := repo.RevertItemUnit(ctx, id, itemID, 1); err == nil {
		t.Fatal("a line that was never split cannot be reverted")
	}

	// A split that consumes the whole line retires it, and revert brings it back.
	all, err := repo.ConvertItemUnit(ctx, id, itemID,
		PurchaseConvertUnitInput{QtyToConvert: 10, FromRatio: 5, ToRatio: 1, TargetUnit: "box"}, 1)
	if err != nil {
		t.Fatalf("convert whole line: %v", err)
	}
	if !all.SourceDeleted || all.Qty != 2 {
		t.Fatalf("converting every piece must retire the source line, got %+v", all)
	}
	if err := repo.RevertItemUnit(ctx, id, all.NewItemID, 1); err != nil {
		t.Fatalf("revert retired line: %v", err)
	}
	restored, err := repo.GetByID(ctx, id)
	if err != nil {
		t.Fatalf("get after second revert: %v", err)
	}
	if len(restored.Items) != 1 || restored.Items[0].Qty != 10 {
		t.Fatalf("revert must undelete the source line at qty 10, got %+v", restored.Items)
	}

	if _, err := repo.ConvertItemUnit(ctx, id, itemID,
		PurchaseConvertUnitInput{QtyToConvert: 1, FromRatio: 1, ToRatio: 1, TargetUnit: "piece"}, 1); err == nil {
		t.Fatal("converting to the same unit must be rejected")
	}
	if _, err := repo.ConvertItemUnit(ctx, id, itemID,
		PurchaseConvertUnitInput{QtyToConvert: 99, FromRatio: 1, ToRatio: 1, TargetUnit: "box"}, 1); err == nil {
		t.Fatal("converting more than the line holds must be rejected")
	}

	hist, err := repo.History(ctx, id, "th")
	if err != nil {
		t.Fatalf("history: %v", err)
	}
	if len(hist.Items) == 0 {
		t.Fatal("status changes must leave history rows")
	}

	// The amount range and the "ordered" chip run their own SQL, so exercise both.
	min, max := 900.0, 920.0
	listed, err := repo.List(ctx, PurchaseListQuery{
		Page: 1, Limit: 10, GrandTotalMin: &min, GrandTotalMax: &max,
	})
	if err != nil {
		t.Fatalf("list by amount range: %v", err)
	}
	if !containsPurchaseID(listed.Items, id) {
		t.Fatalf("a 909.50 order must fall inside the 900–920 range, got %d rows", listed.Total)
	}
	narrow, err := repo.List(ctx, PurchaseListQuery{Page: 1, Limit: 10, GrandTotalMin: &max})
	if err != nil {
		t.Fatalf("list above range: %v", err)
	}
	if containsPurchaseID(narrow.Items, id) {
		t.Fatal("a 909.50 order must fall outside a >=920 filter")
	}
	if _, err := repo.List(ctx, PurchaseListQuery{
		Page: 1, Limit: 10, Status: PurchaseOrderedStatusFilter,
	}); err != nil {
		t.Fatalf("list by ordered chip: %v", err)
	}

	counts, err := repo.Count(ctx, PurchaseListQuery{Page: 1, Limit: 10})
	if err != nil {
		t.Fatalf("count: %v", err)
	}
	if counts.Count == 0 || counts.ByStatus["pending"] == 0 {
		t.Fatalf("counts must see the pending order, got %+v", counts)
	}
	// Nothing paid yet, so the whole grand total is still owed.
	if counts.SumOutstandingDebt < 909.5 {
		t.Fatalf("unpaid order must contribute its grand total to the debt KPI, got %v",
			counts.SumOutstandingDebt)
	}
}

func containsPurchaseID(items []PurchaseListItem, id int64) bool {
	for _, it := range items {
		if it.ID == id {
			return true
		}
	}
	return false
}
