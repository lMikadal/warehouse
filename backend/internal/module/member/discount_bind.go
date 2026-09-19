package member

import "fmt"

type discountInputBody struct {
	MemberCreditID *int64  `json:"member_credit_id"`
	ProductItemID  int64   `json:"product_item_id"`
	MinimumQty     float64 `json:"minimum_qty"`
	Discount       float64 `json:"discount"`
	DiscountType   string  `json:"discount_type"`
	DateStart      *string `json:"date_start"`
	DateEnd        *string `json:"date_end"`
	IsActive       bool    `json:"is_active"`
}

func (b discountInputBody) toDiscountRow() (DiscountRow, error) {
	ds, err := parseOptionalISODate(b.DateStart)
	if err != nil {
		return DiscountRow{}, fmt.Errorf("date_start")
	}
	de, err := parseOptionalISODate(b.DateEnd)
	if err != nil {
		return DiscountRow{}, fmt.Errorf("date_end")
	}
	return DiscountRow{
		MemberCreditID: b.MemberCreditID,
		ProductItemID:  b.ProductItemID,
		MinimumQty:     b.MinimumQty,
		Discount:       b.Discount,
		DiscountType:   b.DiscountType,
		DateStart:      ds,
		DateEnd:        de,
		IsActive:       b.IsActive,
	}, nil
}
