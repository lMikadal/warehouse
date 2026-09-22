package order

import (
	"context"
	"database/sql"
	"os"
	"testing"

	_ "github.com/jackc/pgx/v5/stdlib"
)

// TestSalesClaimWorkflow walks a filed claim the way purchasing does: acknowledge it, review the line,
// then close it — and proves the two guards, that a claim cannot skip straight to done and that an
// unreviewed line keeps it open.
func TestSalesClaimWorkflow(t *testing.T) {
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
	var methodID int64
	if err := db.QueryRowContext(ctx,
		`SELECT id FROM setting_payment_method
		 WHERE deleted_at IS NULL AND is_active AND is_sale ORDER BY id LIMIT 1`).Scan(&methodID); err != nil {
		t.Skipf("no sale payment method seed: %v", err)
	}
	var claimReasonID int64
	if err := db.QueryRowContext(ctx,
		`SELECT id FROM setting_claim_reason
		 WHERE deleted_at IS NULL AND is_active AND is_claim ORDER BY id LIMIT 1`).Scan(&claimReasonID); err != nil {
		t.Skipf("no claim reason seed: %v", err)
	}

	store := NewStoreSalesRepository(db)
	orderID, err := store.Create(ctx, StoreSalesCreateInput{
		Status:     "pending",
		MemberName: strPtrPicking("Sales claim desk"),
		Shipping:   &StoreSalesShippingInput{Type: "store"},
		Items: []StoreSalesItemInput{
			{ProductItemID: &productItemID, Type: "item", Amount: 2, PricePerUnit: 150, Discount: 0},
		},
	}, 1)
	if err != nil {
		t.Fatalf("create slip: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM order_claim_item WHERE order_claim_id IN
			(SELECT c.id FROM order_claim c JOIN order_payment p ON p.id = c.order_payment_id
			 WHERE p.order_list_id = $1)`, orderID)
		_, _ = db.Exec(`DELETE FROM order_claim WHERE order_payment_id IN
			(SELECT id FROM order_payment WHERE order_list_id = $1)`, orderID)
		_, _ = db.Exec(`DELETE FROM order_payment_method WHERE order_payment_id IN
			(SELECT id FROM order_payment WHERE order_list_id = $1)`, orderID)
		_, _ = db.Exec(`DELETE FROM order_payment_item WHERE order_payment_id IN
			(SELECT id FROM order_payment WHERE order_list_id = $1)`, orderID)
		_, _ = db.Exec(`DELETE FROM order_payment WHERE order_list_id = $1`, orderID)
		_, _ = db.Exec(`DELETE FROM order_list_item_warehouse WHERE order_list_item_id IN
			(SELECT id FROM order_list_item WHERE order_list_id = $1)`, orderID)
		_, _ = db.Exec(`DELETE FROM order_list_item WHERE order_list_id = $1`, orderID)
		_, _ = db.Exec(`DELETE FROM order_list_shipping WHERE order_list_id = $1`, orderID)
		_, _ = db.Exec(`DELETE FROM order_list WHERE id = $1`, orderID)
	})

	picking := NewPickingRepository(db)
	family, err := picking.Family(ctx, orderID)
	if err != nil {
		t.Fatalf("family: %v", err)
	}
	pay, err := picking.SavePayment(ctx, orderID, 0, PickingPaymentSaveInput{
		PaymentCategory: "payment",
		VatRate:         7,
		TotalPrice:      300,
		IsPaid:          true,
		Methods:         []PickingPaymentMethodInput{{SettingPaymentMethodID: methodID, Amount: 300}},
		Items: &[]PickingPaymentItemInput{
			{OrderListItemID: family.Orders[0].Items[0].ID, Amount: 2, PricePerUnit: 150, TotalPrice: 300},
		},
	}, 1)
	if err != nil {
		t.Fatalf("settle payment: %v", err)
	}

	repo := NewSalesClaimRepository(db)
	payment, err := repo.Payment(ctx, pay.ID)
	if err != nil {
		t.Fatalf("payment detail: %v", err)
	}
	claimID, err := repo.Create(ctx, pay.ID, StoreClaimCreateInput{
		Type:        "claim",
		PaymentType: "cash",
		Items: []StoreClaimItemInput{
			{OrderPaymentItemID: payment.Lines[0].ID, Type: "claim", SettingClaimReasonID: claimReasonID, Amount: 2},
		},
	}, 1)
	if err != nil {
		t.Fatalf("file claim: %v", err)
	}

	detail, err := repo.Detail(ctx, claimID, "th")
	if err != nil {
		t.Fatalf("detail: %v", err)
	}
	if detail.Status != "pending" || len(detail.Items) != 1 {
		t.Fatalf("a fresh claim waits with its lines, got %+v", detail)
	}
	if detail.PaymentSKU == "" || detail.Items[0].PaidTotalPrice != 300 {
		t.Fatalf("the detail must carry the receipt it came from, got %+v", detail)
	}
	itemID := detail.Items[0].ID

	if err := repo.UpdateStatus(ctx, claimID, "success", 1); err == nil {
		t.Fatal("a claim nobody has looked at must not close")
	}
	if err := repo.PatchItem(ctx, claimID, itemID,
		SalesClaimItemPatchInput{Status: strPtrPicking("success")}, 1); err == nil {
		t.Fatal("a line may only be reviewed once the claim is under review")
	}

	if err := repo.UpdateStatus(ctx, claimID, "acknowledged", 1); err != nil {
		t.Fatalf("acknowledge: %v", err)
	}
	if err := repo.UpdateStatus(ctx, claimID, "success", 1); err == nil {
		t.Fatal("an unreviewed line must keep the claim open")
	}

	if err := repo.PatchItem(ctx, claimID, itemID, SalesClaimItemPatchInput{
		Status: strPtrPicking("success"),
		Note:   strPtrPicking("supplier accepted"),
	}, 1); err != nil {
		t.Fatalf("review line: %v", err)
	}
	if err := repo.UpdateStatus(ctx, claimID, "waiting_supplier", 1); err != nil {
		t.Fatalf("park at supplier: %v", err)
	}
	if err := repo.UpdateStatus(ctx, claimID, "success", 1); err != nil {
		t.Fatalf("close claim: %v", err)
	}

	closed, err := repo.Detail(ctx, claimID, "th")
	if err != nil {
		t.Fatalf("detail after close: %v", err)
	}
	if closed.Status != "success" || closed.TotalPrice != 2 {
		t.Fatalf("closing pays for the confirmed lines only, got status %q total %v",
			closed.Status, closed.TotalPrice)
	}
	if closed.Items[0].Note != "supplier accepted" {
		t.Fatalf("the reviewer's note must stick, got %q", closed.Items[0].Note)
	}

	list, err := repo.List(ctx, StoreClaimListQuery{Page: 1, Limit: 50, Type: "claim", Status: "success"})
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	found := false
	for _, row := range list.Items {
		if row.ID == claimID {
			found = true
		}
	}
	if !found {
		t.Fatalf("the closed claim must show under its chip; got %d rows", len(list.Items))
	}

	if err := repo.Delete(ctx, claimID, 1); err == nil {
		t.Fatal("a closed claim must not be deletable")
	}
}
