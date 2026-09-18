package product

import "testing"

func TestNormalizeStorefrontPricesInclude(t *testing.T) {
	it := listItemBody{PriceVat: 481.5, PriceWholesaleVat: 428}
	normalizeStorefrontPrices(SettingVatSnapshot{Rate: 7, VatType: "include"}, &it)
	if it.VatType != "include" || it.VatRate != 7 {
		t.Fatalf("snapshot: type=%q rate=%v", it.VatType, it.VatRate)
	}
	const eps = 0.0001
	if diff := it.Price - 450; diff > eps || diff < -eps {
		t.Fatalf("price ex: got %v want 450", it.Price)
	}
	if diff := it.PriceWholesale - 400; diff > eps || diff < -eps {
		t.Fatalf("wholesale ex: got %v want 400", it.PriceWholesale)
	}
}

func TestNormalizeStorefrontPricesExclude(t *testing.T) {
	it := listItemBody{Price: 450, PriceWholesale: 400}
	normalizeStorefrontPrices(SettingVatSnapshot{Rate: 7, VatType: "exclude"}, &it)
	const eps = 0.0001
	if diff := it.PriceVat - 481.5; diff > eps || diff < -eps {
		t.Fatalf("price_vat: got %v want 481.5", it.PriceVat)
	}
	if diff := it.PriceWholesaleVat - 428; diff > eps || diff < -eps {
		t.Fatalf("price_wholesale_vat: got %v want 428", it.PriceWholesaleVat)
	}
}
