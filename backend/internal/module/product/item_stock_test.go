package product

import "testing"

func TestValidateStockCreate(t *testing.T) {
	if validateStockCreate(StockCreateInput{BinID: 0}) == nil {
		t.Fatal("missing bin should fail")
	}
	if validateStockCreate(StockCreateInput{BinID: 1, Quantity: -1}) == nil {
		t.Fatal("negative qty should fail")
	}
	if validateStockCreate(StockCreateInput{BinID: 1, Quantity: 10, RemainQuantity: 5}) != nil {
		t.Fatal("valid create should pass")
	}
}

func TestValidateStockPatch(t *testing.T) {
	if validateStockPatch(StockPatchInput{}) == nil {
		t.Fatal("empty patch should fail")
	}
	q := 1.0
	if validateStockPatch(StockPatchInput{Quantity: &q}) != nil {
		t.Fatal("single field patch should pass")
	}
	if validateStockPatch(StockPatchInput{PoSKUSet: true, PoSKU: "PO-1"}) != nil {
		t.Fatal("po_sku patch should pass")
	}
}

func TestParseStockReceivedAt(t *testing.T) {
	tm, err := parseStockReceivedAt("2024-05-20")
	if err != nil {
		t.Fatal(err)
	}
	if tm.UTC().Format("2006-01-02") != "2024-05-20" {
		t.Fatalf("date parse got %v", tm)
	}
	if _, err := parseStockReceivedAt(""); err == nil {
		t.Fatal("empty should fail")
	}
}
