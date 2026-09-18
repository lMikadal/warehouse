package product

// priceInclFromEx returns ex-VAT amount × (1 + rate/100).
func priceInclFromEx(exVat, rate float64) float64 {
	p := exVat
	if p < 0 {
		p = 0
	}
	v := rate
	if v < 0 {
		v = 0
	}
	return p * (1 + v/100)
}

// priceExFromIncl returns incl-VAT amount ÷ (1 + rate/100).
func priceExFromIncl(inclVat, rate float64) float64 {
	incl := inclVat
	if incl < 0 {
		incl = 0
	}
	v := rate
	if v <= -100 {
		return incl
	}
	return incl / (1 + v/100)
}

// normalizeStorefrontPrices applies active setting_vat axis and fills ex + incl columns on it.
func normalizeStorefrontPrices(snap SettingVatSnapshot, it *listItemBody) {
	rate := snap.Rate
	it.VatRate = rate
	it.VatType = snap.VatType
	if snap.VatType == "include" {
		incl := it.PriceVat
		inclWh := it.PriceWholesaleVat
		if incl <= 0 && it.Price > 0 {
			incl = priceInclFromEx(it.Price, rate)
		}
		if inclWh <= 0 && it.PriceWholesale > 0 {
			inclWh = priceInclFromEx(it.PriceWholesale, rate)
		}
		it.PriceVat = incl
		it.PriceWholesaleVat = inclWh
		it.Price = priceExFromIncl(incl, rate)
		it.PriceWholesale = priceExFromIncl(inclWh, rate)
		return
	}
	it.PriceVat = priceInclFromEx(it.Price, rate)
	it.PriceWholesaleVat = priceInclFromEx(it.PriceWholesale, rate)
}
