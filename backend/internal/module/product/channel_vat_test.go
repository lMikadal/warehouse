package product

import "testing"

func TestNormalizeChannelPriceInclude(t *testing.T) {
	p := itemChannelPriceBody{PriceVat: 107}
	normalizeChannelPrice(SettingVatSnapshot{Rate: 7, VatType: "include"}, &p)
	if p.VatType != "include" || p.VatRate != 7 {
		t.Fatalf("snapshot: type=%q rate=%v", p.VatType, p.VatRate)
	}
	const eps = 0.0001
	if diff := p.Price - 100; diff > eps || diff < -eps {
		t.Fatalf("price ex: got %v want 100", p.Price)
	}
}

func TestNormalizeChannelPriceExclude(t *testing.T) {
	p := itemChannelPriceBody{Price: 100}
	normalizeChannelPrice(SettingVatSnapshot{Rate: 7, VatType: "exclude"}, &p)
	const eps = 0.0001
	if diff := p.PriceVat - 107; diff > eps || diff < -eps {
		t.Fatalf("price_vat: got %v want 107", p.PriceVat)
	}
}
