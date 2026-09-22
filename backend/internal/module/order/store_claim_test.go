package order

import (
	"context"
	"database/sql"
	"os"
	"testing"

	_ "github.com/jackc/pgx/v5/stdlib"
)

// TestStoreClaimLifecycle files a claim against a settled payment, then proves the quota: the same line
// cannot be claimed twice beyond what was paid, and the document goes away again on delete.
func TestStoreClaimLifecycle(t *testing.T) {
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
	var returnReasonID int64
	if err := db.QueryRowContext(ctx,
		`SELECT id FROM setting_claim_reason
		 WHERE deleted_at IS NULL AND is_active AND is_return ORDER BY id LIMIT 1`).Scan(&returnReasonID); err != nil {
		t.Skipf("no return reason seed: %v", err)
	}

	store := NewStoreSalesRepository(db)
	orderID, err := store.Create(ctx, StoreSalesCreateInput{
		Status:     "pending",
		MemberName: strPtrPicking("Claim desk"),
		Shipping:   &StoreSalesShippingInput{Type: "store"},
		Items: []StoreSalesItemInput{
			{ProductItemID: &productItemID, Type: "item", Amount: 3, PricePerUnit: 100, Discount: 0},
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
	itemID := family.Orders[0].Items[0].ID
	pay, err := picking.SavePayment(ctx, orderID, 0, PickingPaymentSaveInput{
		PaymentCategory: "payment",
		VatRate:         7,
		TotalPrice:      300,
		IsPaid:          true,
		Methods:         []PickingPaymentMethodInput{{SettingPaymentMethodID: methodID, Amount: 300}},
		Items: &[]PickingPaymentItemInput{
			{OrderListItemID: itemID, Amount: 3, PricePerUnit: 100, TotalPrice: 300},
		},
	}, 1)
	if err != nil {
		t.Fatalf("settle payment: %v", err)
	}

	repo := NewStoreClaimRepository(db)
	detail, err := repo.Payment(ctx, pay.ID)
	if err != nil {
		t.Fatalf("payment detail: %v", err)
	}
	if len(detail.Lines) != 1 || detail.Lines[0].Amount != 3 || detail.Lines[0].ClaimedAmount != 0 {
		t.Fatalf("an untouched receipt offers its whole line, got %+v", detail.Lines)
	}
	lineID := detail.Lines[0].ID

	claimID, err := repo.Create(ctx, pay.ID, StoreClaimCreateInput{
		Type:        "return",
		PaymentType: "cash",
		Items: []StoreClaimItemInput{
			{OrderPaymentItemID: lineID, Type: "return", SettingClaimReasonID: returnReasonID, Amount: 2},
		},
	}, 1)
	if err != nil {
		t.Fatalf("create claim: %v", err)
	}

	claims, err := repo.Claims(ctx, pay.ID, "th")
	if err != nil {
		t.Fatalf("claims: %v", err)
	}
	if len(claims.Items) != 1 || claims.Items[0].SKU == "" || claims.Items[0].Status != "success" {
		t.Fatalf("a filed return closes immediately as success, got %+v", claims.Items)
	}
	if len(claims.Items[0].Items) != 1 || claims.Items[0].Items[0].Amount != 2 {
		t.Fatalf("the claim keeps the quantity it was filed for, got %+v", claims.Items[0].Items)
	}

	after, err := repo.Payment(ctx, pay.ID)
	if err != nil {
		t.Fatalf("payment detail after claim: %v", err)
	}
	if after.Lines[0].ClaimedAmount != 2 {
		t.Fatalf("the line must report what the open claim took, got %v", after.Lines[0].ClaimedAmount)
	}

	if _, err := repo.Create(ctx, pay.ID, StoreClaimCreateInput{
		Type:        "return",
		PaymentType: "cash",
		Items: []StoreClaimItemInput{
			{OrderPaymentItemID: lineID, Type: "return", SettingClaimReasonID: returnReasonID, Amount: 2},
		},
	}, 1); err == nil {
		t.Fatal("claiming more than was paid must be refused")
	}

	list, err := repo.List(ctx, StoreClaimListQuery{Page: 1, Limit: 50, Status: "success"})
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	found := false
	for _, row := range list.Items {
		if row.ID == claimID {
			found = true
			if row.PaymentSKU == "" || row.Type != "return" {
				t.Fatalf("the list shows the payment it came from, got %+v", row)
			}
		}
	}
	if !found {
		t.Fatalf("the filed return must show under the success chip; got %d rows", len(list.Items))
	}

	if err := repo.Delete(ctx, claimID, 1); err != nil {
		t.Fatalf("delete claim: %v", err)
	}
	freed, err := repo.Payment(ctx, pay.ID)
	if err != nil {
		t.Fatalf("payment detail after delete: %v", err)
	}
	if freed.Lines[0].ClaimedAmount != 0 {
		t.Fatalf("deleting the claim frees the quantity again, got %v", freed.Lines[0].ClaimedAmount)
	}
}
