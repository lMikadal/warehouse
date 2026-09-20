package member

import (
	"strings"
	"testing"

	"github.com/lMikadal/warehouse/backend/internal/module/product"
)

func TestUserProductItemFilterSelect_usesStorefrontDisplayPrice(t *testing.T) {
	if !strings.Contains(userProductItemFilterSelect, product.DisplayPriceSellSQL) {
		t.Fatal("member product_items filter price must match product DisplayPriceSellSQL")
	}
	if !strings.Contains(userProductItemFilterJoins, product.DisplayPriceVatJoin) {
		t.Fatal("missing active setting_vat join")
	}
}
