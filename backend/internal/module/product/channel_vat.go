package product

// normalizeChannelPrice applies active setting_vat and fills ex + incl on a channel price row.
func normalizeChannelPrice(snap SettingVatSnapshot, p *itemChannelPriceBody) {
	rate := snap.Rate
	p.VatRate = rate
	p.VatType = snap.VatType
	if snap.VatType == "include" {
		incl := p.PriceVat
		if incl <= 0 && p.Price > 0 {
			incl = priceInclFromEx(p.Price, rate)
		}
		p.PriceVat = incl
		p.Price = priceExFromIncl(incl, rate)
		return
	}
	p.PriceVat = priceInclFromEx(p.Price, rate)
}
