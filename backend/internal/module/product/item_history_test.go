package product

import (
	"database/sql"
	"math"
	"testing"
	"time"
)

func TestHistoryPeriodKey(t *testing.T) {
	loc := bangkokLoc()
	ts := time.Date(2026, 9, 23, 15, 30, 0, 0, loc)
	cases := []struct {
		mode HistoryGroupBy
		want string
	}{
		{HistoryGroupByDay, "2026-09-23"},
		{HistoryGroupByMonth, "2026-09"},
		{HistoryGroupByYear, "2026"},
	}
	for _, tc := range cases {
		got := historyPeriodKey(tc.mode, ts)
		if got != tc.want {
			t.Fatalf("%s: got %q want %q", tc.mode, got, tc.want)
		}
	}
}

func TestBuildPurchaseHistorySummary(t *testing.T) {
	loc := bangkokLoc()
	lots := []purchaseLotRow{
		{
			ProductItemID: 1, SKU: "A-1", Name: "Item A", Unit: "piece", QtyPerUnit: 1,
			SupplierID: sql.NullInt64{Int64: 10, Valid: true}, SupplierName: "Sup A",
			Ordered: 10, Free: 1, Received: 10, CostUnit: 100, DiscUnit: 10, SellUnit: 150,
			At: time.Date(2026, 3, 1, 10, 0, 0, 0, loc),
		},
		{
			ProductItemID: 1, SKU: "A-1", Name: "Item A", Unit: "piece", QtyPerUnit: 1,
			SupplierID: sql.NullInt64{Int64: 10, Valid: true}, SupplierName: "Sup A",
			Ordered: 5, Free: 0, Received: 5, CostUnit: 80, DiscUnit: 0, SellUnit: 150,
			At: time.Date(2026, 3, 1, 12, 0, 0, 0, loc),
		},
		{
			ProductItemID: 2, SKU: "B-1", Name: "Item B", Unit: "piece", QtyPerUnit: 1,
			SupplierID: sql.NullInt64{Int64: 20, Valid: true}, SupplierName: "Sup B",
			Ordered: 2, Free: 0, Received: 2, CostUnit: 50, DiscUnit: 0, SellUnit: 80,
			At: time.Date(2026, 4, 2, 9, 0, 0, 0, loc),
		},
	}
	out := buildPurchaseHistory(HistoryGroupByMonth, lots, false, false)
	if out.GroupBy != "month" {
		t.Fatalf("group_by: %s", out.GroupBy)
	}
	if len(out.Groups) != 2 {
		t.Fatalf("groups: %d", len(out.Groups))
	}
	if out.Groups[0].PeriodKey != "2026-04" || out.Groups[1].PeriodKey != "2026-03" {
		t.Fatalf("period order: %+v %+v", out.Groups[0].PeriodKey, out.Groups[1].PeriodKey)
	}
	march := out.Groups[1]
	if len(march.Children) != 1 || march.Children[0].LotCount != 2 {
		t.Fatalf("march children: %+v", march.Children)
	}
	if march.Children[0].Metrics.QtyReceivedPieces != 15 {
		t.Fatalf("received: %v", march.Children[0].Metrics.QtyReceivedPieces)
	}
	if out.Summary.TotalReceivedPieces != 17 {
		t.Fatalf("summary received: %v", out.Summary.TotalReceivedPieces)
	}
	if out.Summary.TotalFreePieces != 1 {
		t.Fatalf("summary free: %v", out.Summary.TotalFreePieces)
	}
	// Child nets: item1 weighted (90*10+80*5)/15 ≈ 86.666..., item2 = 50
	wantMin, wantMax := 50.0, (90.0*10+80.0*5)/15
	if math.Abs(out.Summary.MinNetCostPerPiece-wantMin) > 0.001 {
		t.Fatalf("min: got %v want %v", out.Summary.MinNetCostPerPiece, wantMin)
	}
	if math.Abs(out.Summary.MaxNetCostPerPiece-wantMax) > 0.001 {
		t.Fatalf("max: got %v want %v", out.Summary.MaxNetCostPerPiece, wantMax)
	}
}

func TestBuildSalesHistory(t *testing.T) {
	loc := bangkokLoc()
	lines := []salesLineRow{
		{
			ProductItemID: 1, SKU: "A", Name: "A", BillNo: "PJB-1", Customer: "Cust",
			Qty: 2, PricePerUnit: 100, Discount: 10, AvgCost: 50,
			Date: time.Date(2026, 5, 1, 0, 0, 0, 0, loc),
		},
		{
			ProductItemID: 1, SKU: "A", Name: "A", BillNo: "PJB-2", Customer: "Cust2",
			Qty: 1, PricePerUnit: 120, Discount: 0, AvgCost: 50,
			Date: time.Date(2026, 5, 2, 0, 0, 0, 0, loc),
		},
	}
	out := buildSalesHistory(HistoryGroupByDay, lines, true, true)
	if len(out.Groups) != 2 {
		t.Fatalf("groups: %d", len(out.Groups))
	}
	if out.Groups[0].PeriodKey != "2026-05-01" {
		t.Fatalf("asc sort expected first day, got %s", out.Groups[0].PeriodKey)
	}
	if out.Summary.TotalSoldPieces != 3 {
		t.Fatalf("sold: %v", out.Summary.TotalSoldPieces)
	}
	if out.Summary.MinSellPerPiece != 90 || out.Summary.MaxSellPerPiece != 120 {
		t.Fatalf("min/max sell: %v / %v", out.Summary.MinSellPerPiece, out.Summary.MaxSellPerPiece)
	}
	if out.Summary.TotalValueBaht != 300 {
		t.Fatalf("value: %v", out.Summary.TotalValueBaht)
	}
}
