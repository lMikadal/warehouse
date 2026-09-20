package product

import "strings"
import "testing"

func TestDisplayPriceManualSellSQL_vatAxis(t *testing.T) {
	if !strings.Contains(DisplayPriceManualSellSQL, "vat.vat_type = 'include'") {
		t.Fatal("missing include branch")
	}
	if !strings.Contains(DisplayPriceManualSellSQL, "i.price_vat") || !strings.Contains(DisplayPriceManualSellSQL, "i.price") {
		t.Fatal("expected price_vat and price columns")
	}
}

func TestDisplayPriceSellSQL_stockFallback(t *testing.T) {
	if !strings.Contains(DisplayPriceSellSQL, "type_price = 'stock'") {
		t.Fatal("missing stock type branch")
	}
	if !strings.Contains(DisplayPriceSellSQL, "stock_px.sell_price") {
		t.Fatal("missing stock lot sell_price")
	}
	if !strings.Contains(DisplayPriceSellSQL, DisplayPriceManualSellSQL) {
		t.Fatal("sell SQL should embed manual sell axis")
	}
}
