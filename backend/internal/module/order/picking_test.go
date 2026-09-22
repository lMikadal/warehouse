package order

import (
	"context"
	"database/sql"
	"os"
	"testing"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func TestValidatePickingPaymentInput(t *testing.T) {
	items := []PickingPaymentItemInput{{OrderListItemID: 1, Amount: 2, PricePerUnit: 100}}
	cases := []struct {
		label string
		in    PickingPaymentSaveInput
		ok    bool
	}{
		{"a loan with no methods is fine", PickingPaymentSaveInput{PaymentCategory: "credit"}, true},
		{"an unknown category is refused", PickingPaymentSaveInput{PaymentCategory: "cheque"}, false},
		{"negative money is refused", PickingPaymentSaveInput{PaymentCategory: "payment", TotalPrice: -1}, false},
		{"a method without an id is refused", PickingPaymentSaveInput{
			PaymentCategory: "payment",
			Methods:         []PickingPaymentMethodInput{{Amount: 50}},
		}, false},
		{"a loan may snapshot its goods", PickingPaymentSaveInput{
			PaymentCategory: "credit", Items: &items,
		}, true},
		{"an unpaid payment draft may not", PickingPaymentSaveInput{
			PaymentCategory: "payment", Items: &items,
		}, false},
		{"a settled payment may", PickingPaymentSaveInput{
			PaymentCategory: "payment", IsPaid: true, Items: &items,
		}, true},
	}
	for _, tc := range cases {
		err := validatePickingPaymentInput(tc.in)
		if tc.ok && err != nil {
			t.Fatalf("%s: %v", tc.label, err)
		}
		if !tc.ok && err == nil {
			t.Fatalf("%s: expected a validation error", tc.label)
		}
	}
}

// TestPickingLifecycle walks one slip from the picking desk to a settled receipt: verify a line, refuse
// an impossible quantity, settle the payment, and close the slip.
func TestPickingLifecycle(t *testing.T) {
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

	store := NewStoreSalesRepository(db)
	orderID, err := store.Create(ctx, StoreSalesCreateInput{
		Status:     "pending",
		MemberName: strPtrPicking("Walk-in"),
		Shipping:   &StoreSalesShippingInput{Type: "store"},
		Items: []StoreSalesItemInput{
			{ProductItemID: &productItemID, Type: "item", Amount: 4, PricePerUnit: 250, Discount: 0},
		},
	}, 1)
	if err != nil {
		t.Fatalf("create slip: %v", err)
	}
	t.Cleanup(func() {
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
	if family.RootID != orderID || len(family.Orders) != 1 || len(family.Orders[0].Items) != 1 {
		t.Fatalf("a fresh slip is its own family with one line, got %+v", family)
	}
	itemID := family.Orders[0].Items[0].ID

	if _, err := picking.PatchItem(ctx, orderID, itemID, PickingItemPatchInput{
		AmountChecked: float64Ptr(9),
	}, 1); err == nil {
		t.Fatal("checking more than was ordered must be refused")
	}

	checked := 4.0
	success := "success"
	item, err := picking.PatchItem(ctx, orderID, itemID, PickingItemPatchInput{
		AmountChecked: &checked,
		Status:        &success,
	}, 1)
	if err != nil {
		t.Fatalf("verify line: %v", err)
	}
	if item.AmountChecked != checked || item.Status != "success" {
		t.Fatalf("a verified line keeps its checked qty and status, got %+v", item)
	}

	pay, err := picking.SavePayment(ctx, orderID, 0, PickingPaymentSaveInput{
		PaymentCategory: "payment",
		VatRate:         7,
		TotalPrice:      1000,
		IsPaid:          true,
		Methods:         []PickingPaymentMethodInput{{SettingPaymentMethodID: methodID, Amount: 1000}},
		Items: &[]PickingPaymentItemInput{
			{OrderListItemID: itemID, Amount: 4, PricePerUnit: 250, TotalPrice: 1000},
		},
	}, 1)
	if err != nil {
		t.Fatalf("settle payment: %v", err)
	}
	if pay.SKU == "" || !pay.IsPaid || !pay.IsFull || pay.AmountPaid != 1000 {
		t.Fatalf("a settled receipt carries a number and covers its total, got %+v", pay)
	}
	if len(pay.Methods) != 1 || len(pay.Items) != 1 {
		t.Fatalf("the receipt must keep its method and its goods, got %+v", pay)
	}

	// Re-saving the same document must not open a second one.
	if _, err := picking.SavePayment(ctx, orderID, pay.ID, PickingPaymentSaveInput{
		PaymentCategory: "payment",
		VatRate:         7,
		TotalPrice:      1000,
		IsPaid:          true,
		Methods:         []PickingPaymentMethodInput{{SettingPaymentMethodID: methodID, Amount: 1000}},
	}, 1); err != nil {
		t.Fatalf("update payment: %v", err)
	}
	payments, err := picking.Payments(ctx, orderID)
	if err != nil {
		t.Fatalf("payments: %v", err)
	}
	if len(payments.Items) != 1 {
		t.Fatalf("one slip settled once has one document, got %d", len(payments.Items))
	}

	if err := picking.PatchStatus(ctx, orderID, "success", 1); err != nil {
		t.Fatalf("close slip: %v", err)
	}
	list, err := picking.List(ctx, PickingListQuery{Page: 1, Limit: 50, Status: "success", RootOnly: true})
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	found := false
	for _, row := range list.Items {
		if row.ID == orderID {
			found = true
			if row.PaymentCount != 1 || row.PaymentSKU == nil {
				t.Fatalf("a closed slip shows its payment document, got %+v", row)
			}
			if row.ItemCount != 1 || row.PieceCount != 4 {
				t.Fatalf("the list counts lines and pieces separately, got %+v", row)
			}
		}
	}
	if !found {
		t.Fatalf("the closed slip must appear under the success chip; got %d rows", len(list.Items))
	}
}

func strPtrPicking(s string) *string { return &s }

func float64Ptr(v float64) *float64 { return &v }
