package order

import (
	"context"
	"database/sql"
	"os"
	"testing"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func TestSplitFreeGift(t *testing.T) {
	cases := []struct {
		label string
		qtys  []int
		bonus int
		want  []int
	}{
		{"no bonus", []int{5, 5}, 0, []int{0, 0}},
		{"even split", []int{5, 5}, 4, []int{2, 2}},
		{"remainder goes to the first placements", []int{5, 5}, 5, []int{3, 2}},
		{"weighted by paid qty", []int{9, 1}, 5, []int{5, 0}},
		{"single placement takes all", []int{7}, 3, []int{3}},
		{"zero paid qty still receives the bonus", []int{0, 0}, 2, []int{2, 0}},
	}
	for _, tc := range cases {
		placements := make([]ReceivePlacement, len(tc.qtys))
		for i, q := range tc.qtys {
			placements[i] = ReceivePlacement{BinID: int64(i + 1), StockQty: q}
		}
		got := splitFreeGift(placements, tc.bonus)
		if len(got) != len(tc.want) {
			t.Fatalf("%s: length %d want %d", tc.label, len(got), len(tc.want))
		}
		sum := 0
		for i := range got {
			if got[i] != tc.want[i] {
				t.Fatalf("%s: got %v want %v", tc.label, got, tc.want)
			}
			sum += got[i]
		}
		if tc.bonus > 0 && sum != tc.bonus {
			t.Fatalf("%s: the whole bonus must be placed, got %d of %d", tc.label, sum, tc.bonus)
		}
	}
}

func TestApplyReceiveScope(t *testing.T) {
	// An empty status must still exclude everything before the paid stage.
	var q PurchaseListQuery
	applyReceiveScope(&q)
	if len(q.StatusIn) != len(receiveStatuses) {
		t.Fatalf("empty status must scope to the receive statuses, got %v", q.StatusIn)
	}
	// A status inside the scope passes through untouched.
	q = PurchaseListQuery{Status: "receive_completed"}
	applyReceiveScope(&q)
	if q.Status != "receive_completed" || q.StatusIn != nil {
		t.Fatalf("in-scope status must pass through, got %+v", q)
	}
	// A status outside the scope is dropped, not honoured — a draft PO has no business here.
	q = PurchaseListQuery{Status: "draft"}
	applyReceiveScope(&q)
	if q.Status != "" || len(q.StatusIn) != len(receiveStatuses) {
		t.Fatalf("out-of-scope status must fall back to the receive scope, got %+v", q)
	}
	// The reject chip becomes a line-level filter while keeping the receive scope.
	q = PurchaseListQuery{Status: ReceiveRejectStatusFilter}
	applyReceiveScope(&q)
	if q.Status != "" || !q.HasReceiveReject || len(q.StatusIn) != len(receiveStatuses) {
		t.Fatalf("reject chip must filter on rejected lines inside the receive scope, got %+v", q)
	}
}

// newTestBin adds a throwaway bin under an existing rack, with the tree_path the warehouse module
// builds (parent path + ".n<id>") so path-derived reads behave like production rows.
func newTestBin(ctx context.Context, t *testing.T, db *sql.DB) int64 {
	t.Helper()
	var rackID int64
	if err := db.QueryRowContext(ctx,
		`SELECT id FROM warehouse_list WHERE type = 'rack' AND deleted_at IS NULL ORDER BY id LIMIT 1`).
		Scan(&rackID); err != nil {
		t.Skipf("no rack seed to hang a bin off: %v", err)
	}
	var id int64
	if err := db.QueryRowContext(ctx, `
INSERT INTO warehouse_list (type, sku, parent_id, tree_path, sort_order, capacity, is_active)
VALUES ('bin', 'TEST-RECEIVE-BIN', $1, 'n0'::ltree, 9999, 100, TRUE)
RETURNING id`, rackID).Scan(&id); err != nil {
		t.Fatalf("create test bin: %v", err)
	}
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM warehouse_list WHERE id = $1`, id) })
	if _, err := db.ExecContext(ctx, `
UPDATE warehouse_list SET tree_path = (
  (SELECT tree_path::text FROM warehouse_list WHERE id = $2) || '.n' || $1::text
)::ltree WHERE id = $1`, id, rackID); err != nil {
		t.Fatalf("set test bin path: %v", err)
	}
	if _, err := db.ExecContext(ctx, `
INSERT INTO warehouse_list_language (warehouse_list_id, locale, name)
VALUES ($1, 'th', 'ถังทดสอบรับเข้า'), ($1, 'en', 'Receive test bin')`, id); err != nil {
		t.Fatalf("name test bin: %v", err)
	}
	return id
}

// TestReceiveLifecycle books a paid order into a bin and back out again, against a real database.
func TestReceiveLifecycle(t *testing.T) {
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
	// Make a bin of our own: the seeded bins are all claimed, and the one-bin-one-item rule means a
	// claimed bin can never host this test's item.
	binID := newTestBin(ctx, t, db)
	var supplierID sql.NullInt64
	_ = db.QueryRowContext(ctx,
		`SELECT id FROM supplier_user WHERE deleted_at IS NULL ORDER BY id LIMIT 1`).Scan(&supplierID)

	purchases := NewPurchaseRepository(db)
	orderID, err := purchases.Create(ctx, PurchaseSaveInput{
		Status:  "draft",
		VatType: "exclude",
		VatRate: 7,
		Items: []PurchaseItemInput{
			{Type: "catalog", ProductItemID: &productItemID, Qty: 10, Unit: "piece", PricePerUnit: 100, Discount: 50},
		},
	}, 1)
	if err != nil {
		t.Fatalf("create order: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM product_item_stock WHERE purchase_order_item_id IN
			(SELECT id FROM purchase_order_item WHERE purchase_order_id = $1)`, orderID)
		_, _ = db.Exec(`DELETE FROM product_item_warehouse WHERE bin_id = $1`, binID)
		_, _ = db.Exec(`DELETE FROM purchase_history WHERE purchase_order_id = $1`, orderID)
		_, _ = db.Exec(`DELETE FROM purchase_order_item_reject WHERE purchase_order_id = $1`, orderID)
		_, _ = db.Exec(`DELETE FROM purchase_order WHERE id = $1`, orderID)
	})

	receives := NewReceiveRepository(db)
	detail, err := purchases.GetByID(ctx, orderID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	itemID := detail.Items[0].ID

	// A line can only be received once the order is paid for.
	if _, err := receives.ReceiveItem(ctx, orderID, itemID,
		ReceiveItemBody{SellPrice: 150, Placements: []ReceivePlacement{{BinID: binID, StockQty: 10}}}, 1); err == nil {
		t.Fatal("receiving a draft order must be rejected")
	}

	for _, s := range []string{"pending", "paying", "completed"} {
		if err := purchases.PatchStatus(ctx, orderID, s, 1); err != nil {
			t.Fatalf("status %s: %v", s, err)
		}
	}

	// More units than were ordered (plus free gift) must not slip in.
	if _, err := receives.ReceiveItem(ctx, orderID, itemID,
		ReceiveItemBody{SellPrice: 150, Placements: []ReceivePlacement{{BinID: binID, StockQty: 11}}}, 1); err == nil {
		t.Fatal("receiving more than ordered must be rejected")
	}

	res, err := receives.ReceiveItem(ctx, orderID, itemID, ReceiveItemBody{
		SellPrice:  150,
		BonusQty:   2,
		Placements: []ReceivePlacement{{BinID: binID, StockQty: 10}},
	}, 1)
	if err != nil {
		t.Fatalf("receive: %v", err)
	}
	if res.ProductItemID != productItemID {
		t.Fatalf("receive must report the catalog item, got %d want %d", res.ProductItemID, productItemID)
	}
	if res.OrderStatus != "receive_completed" {
		t.Fatalf("the only line was received, so the order completes; got %q", res.OrderStatus)
	}

	received, err := purchases.GetByID(ctx, orderID)
	if err != nil {
		t.Fatalf("get after receive: %v", err)
	}
	if received.Items[0].Status != "receive_approved" {
		t.Fatalf("line must be receive_approved, got %q", received.Items[0].Status)
	}
	// 10 paid + 2 free gift all land in the one bin.
	if received.Items[0].ReceivedQty != 12 {
		t.Fatalf("received qty must count the free gift too, want 12 got %v", received.Items[0].ReceivedQty)
	}

	placements, err := receives.Placements(ctx, orderID, itemID)
	if err != nil {
		t.Fatalf("placements: %v", err)
	}
	if len(placements.Items) != 1 || placements.Items[0].BinID != binID {
		t.Fatalf("want one lot in bin %d, got %+v", binID, placements.Items)
	}
	if placements.Items[0].Path == "" {
		t.Fatal("the bin path must be derived from the warehouse tree, not stored")
	}
	if placements.Items[0].SellPrice != 150 {
		t.Fatalf("sell price must be snapshotted on the lot, got %v", placements.Items[0].SellPrice)
	}

	// Receiving again corrects the first attempt instead of doubling the stock.
	if _, err := receives.ReceiveItem(ctx, orderID, itemID, ReceiveItemBody{
		SellPrice:  160,
		Placements: []ReceivePlacement{{BinID: binID, StockQty: 8}},
	}, 1); err != nil {
		t.Fatalf("re-receive: %v", err)
	}
	corrected, err := purchases.GetByID(ctx, orderID)
	if err != nil {
		t.Fatalf("get after re-receive: %v", err)
	}
	if corrected.Items[0].ReceivedQty != 8 {
		t.Fatalf("a correcting receive replaces the lots, want 8 got %v", corrected.Items[0].ReceivedQty)
	}

	// The bin may not be shared with a different product item.
	var otherItemID int64
	if err := db.QueryRowContext(ctx,
		`SELECT id FROM product_item WHERE id <> $1 AND deleted_at IS NULL ORDER BY id LIMIT 1`,
		productItemID).Scan(&otherItemID); err == nil {
		otherOrderID, cerr := purchases.Create(ctx, PurchaseSaveInput{
			Status:  "draft",
			VatType: "exclude",
			Items: []PurchaseItemInput{
				{Type: "catalog", ProductItemID: &otherItemID, Qty: 1, Unit: "piece", PricePerUnit: 10},
			},
		}, 1)
		if cerr != nil {
			t.Fatalf("create second order: %v", cerr)
		}
		t.Cleanup(func() {
			_, _ = db.Exec(`DELETE FROM purchase_history WHERE purchase_order_id = $1`, otherOrderID)
			_, _ = db.Exec(`DELETE FROM purchase_order WHERE id = $1`, otherOrderID)
		})
		for _, s := range []string{"pending", "paying", "completed"} {
			if err := purchases.PatchStatus(ctx, otherOrderID, s, 1); err != nil {
				t.Fatalf("second order status %s: %v", s, err)
			}
		}
		otherDetail, gerr := purchases.GetByID(ctx, otherOrderID)
		if gerr != nil {
			t.Fatalf("get second order: %v", gerr)
		}
		if _, err := receives.ReceiveItem(ctx, otherOrderID, otherDetail.Items[0].ID,
			ReceiveItemBody{SellPrice: 20, Placements: []ReceivePlacement{{BinID: binID, StockQty: 1}}}, 1); err == nil {
			t.Fatal("a bin already holding another item must be refused")
		}
	}

	// A reject with images is filed against the line and numbered from the RJ series.
	overage := "return"
	rejectID, err := receives.CreateReject(ctx, orderID, itemID, ReceiveRejectInput{
		Type:        "overage",
		OverageType: &overage,
		Resolution:  "return",
		Qty:         2,
		Unit:        "piece",
		Price:       100,
		VatRate:     7,
		Note:        "two extra pieces",
	}, 1)
	if err != nil {
		t.Fatalf("create reject: %v", err)
	}
	rejects, err := receives.Rejects(ctx, orderID)
	if err != nil {
		t.Fatalf("rejects: %v", err)
	}
	if len(rejects.Items) != 1 || rejects.Items[0].ID != rejectID {
		t.Fatalf("want the one reject we filed, got %+v", rejects.Items)
	}
	if rejects.Items[0].SKU == "" {
		t.Fatal("a reject must carry its own document number")
	}
	if rejects.Items[0].Status != "pending" {
		t.Fatalf("a new reject starts pending, got %q", rejects.Items[0].Status)
	}

	// An overage without a disposal choice is not a valid reject.
	if _, err := receives.CreateReject(ctx, orderID, itemID, ReceiveRejectInput{
		Type: "overage", Resolution: "claim", Qty: 1, Unit: "piece",
	}, 1); err == nil {
		t.Fatal("overage without overage_type must be rejected")
	}
}
