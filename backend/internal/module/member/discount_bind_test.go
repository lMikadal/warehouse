package member

import "testing"

func TestDiscountInputBody_toDiscountRow_dateStart(t *testing.T) {
	ds := "2026-09-19"
	row, err := (discountInputBody{
		ProductItemID: 1,
		DateStart:     &ds,
	}).toDiscountRow()
	if err != nil {
		t.Fatal(err)
	}
	if row.DateStart == nil || row.DateStart.Format("2006-01-02") != "2026-09-19" {
		t.Fatalf("date_start: got %v", row.DateStart)
	}
}
