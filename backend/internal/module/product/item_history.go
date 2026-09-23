package product

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/lMikadal/warehouse/backend/internal/api"
	"github.com/labstack/echo/v5"
)

type HistoryGroupBy string

const (
	HistoryGroupByDay   HistoryGroupBy = "day"
	HistoryGroupByMonth HistoryGroupBy = "month"
	HistoryGroupByYear  HistoryGroupBy = "year"
)

type HistoryFilter struct {
	Locale         string
	GroupBy        HistoryGroupBy
	DateFrom       string // YYYY-MM-DD
	DateTo         string
	MonthFrom      string // YYYY-MM
	MonthTo        string
	YearFrom       int
	YearTo         int
	ProductListID  *int64
	ProductItemID  *int64
	SupplierID     *int64
	Customer       string // exact member_name match
	SortByPeriod   bool
	SortOrderAsc   bool
}

type PurchaseHistoryMetrics struct {
	QtyOrderedPieces  float64 `json:"qty_ordered_pieces"`
	QtyFreePieces     float64 `json:"qty_free_pieces"`
	QtyReceivedPieces float64 `json:"qty_received_pieces"`
	CostPerUnit       float64 `json:"cost_per_unit"`
	DiscountPerUnit   float64 `json:"discount_per_unit"`
	NetCostBaht       float64 `json:"net_cost_baht"`
	DiscountBaht      float64 `json:"discount_baht"`
	NetCostPerPiece   float64 `json:"net_cost_per_piece"`
	SellPricePerPiece float64 `json:"sell_price_per_piece"`
	ProfitPerPiece    float64 `json:"profit_per_piece"`
	ProfitPct         float64 `json:"profit_pct"`
}

type PurchaseHistoryChild struct {
	ProductItemID int64                   `json:"product_item_id"`
	SKU           string                  `json:"sku"`
	Name          string                  `json:"name"`
	SupplierID    *int64                  `json:"supplier_id,omitempty"`
	SupplierName  string                  `json:"supplier_name"`
	Unit          string                  `json:"unit"`
	QtyPerUnit    int                     `json:"qty_per_unit"`
	LotCount      int                     `json:"lot_count"`
	Date          string                  `json:"date,omitempty"`
	Metrics       PurchaseHistoryMetrics  `json:"metrics"`
}

type PurchaseHistoryGroup struct {
	PeriodKey    string                 `json:"period_key"`
	PartnerCount int                    `json:"partner_count"`
	Metrics      PurchaseHistoryMetrics `json:"metrics"`
	Children     []PurchaseHistoryChild `json:"children"`
}

type PurchaseHistorySummary struct {
	TotalReceivedPieces float64 `json:"total_received_pieces"`
	TotalValueBaht      float64 `json:"total_value_baht"`
	MinNetCostPerPiece  float64 `json:"min_net_cost_per_piece"`
	MaxNetCostPerPiece  float64 `json:"max_net_cost_per_piece"`
	TotalFreePieces     float64 `json:"total_free_pieces"`
}

type PurchaseHistoryResponse struct {
	GroupBy string                   `json:"group_by"`
	Summary PurchaseHistorySummary   `json:"summary"`
	Groups  []PurchaseHistoryGroup   `json:"groups"`
	Meta    map[string]any           `json:"meta"`
}

type SalesHistoryMetrics struct {
	Qty              float64 `json:"qty"`
	NetCostPerUnit   float64 `json:"net_cost_per_unit"`
	NetSellPerUnit   float64 `json:"net_sell_per_unit"`
	NetSellTotal     float64 `json:"net_sell_total"`
	NetProfitPerUnit float64 `json:"net_profit_per_unit"`
	NetProfitTotal   float64 `json:"net_profit_total"`
	ProfitPct        float64 `json:"profit_pct"`
}

type SalesHistoryChild struct {
	ProductItemID int64               `json:"product_item_id"`
	SKU           string              `json:"sku"`
	Name          string              `json:"name"`
	Date          string              `json:"date,omitempty"`
	BillNo        string              `json:"bill_no"`
	Customer      string              `json:"customer"`
	Metrics       SalesHistoryMetrics `json:"metrics"`
}

type SalesHistoryGroup struct {
	PeriodKey    string              `json:"period_key"`
	PartnerCount int                 `json:"partner_count"`
	Metrics      SalesHistoryMetrics `json:"metrics"`
	Children     []SalesHistoryChild `json:"children"`
}

type SalesHistorySummary struct {
	TotalSoldPieces float64 `json:"total_sold_pieces"`
	TotalValueBaht  float64 `json:"total_value_baht"`
	MinSellPerPiece float64 `json:"min_sell_per_piece"`
	MaxSellPerPiece float64 `json:"max_sell_per_piece"`
}

type SalesHistoryResponse struct {
	GroupBy string               `json:"group_by"`
	Summary SalesHistorySummary  `json:"summary"`
	Groups  []SalesHistoryGroup  `json:"groups"`
	Meta    map[string]any       `json:"meta"`
}

func bangkokLoc() *time.Location {
	loc, err := time.LoadLocation("Asia/Bangkok")
	if err != nil {
		return time.FixedZone("ICT", 7*3600)
	}
	return loc
}

func defaultHistoryYTD(now time.Time) (dateFrom, dateTo string) {
	loc := bangkokLoc()
	n := now.In(loc)
	from := time.Date(n.Year(), 1, 1, 0, 0, 0, 0, loc)
	return from.Format("2006-01-02"), n.Format("2006-01-02")
}

func parseHistoryFilter(c *echo.Context) (HistoryFilter, error) {
	f := HistoryFilter{
		Locale:  api.LocaleFromRequest(c),
		GroupBy: HistoryGroupByDay,
	}
	switch strings.TrimSpace(c.QueryParam("group_by")) {
	case "", "day":
		f.GroupBy = HistoryGroupByDay
	case "month":
		f.GroupBy = HistoryGroupByMonth
	case "year":
		f.GroupBy = HistoryGroupByYear
	default:
		return f, fmt.Errorf("invalid group_by")
	}

	f.DateFrom = strings.TrimSpace(c.QueryParam("date_from"))
	f.DateTo = strings.TrimSpace(c.QueryParam("date_to"))
	f.MonthFrom = strings.TrimSpace(c.QueryParam("month_from"))
	f.MonthTo = strings.TrimSpace(c.QueryParam("month_to"))
	if v := strings.TrimSpace(c.QueryParam("year_from")); v != "" {
		y, err := strconv.Atoi(v)
		if err != nil {
			return f, fmt.Errorf("invalid year_from")
		}
		f.YearFrom = y
	}
	if v := strings.TrimSpace(c.QueryParam("year_to")); v != "" {
		y, err := strconv.Atoi(v)
		if err != nil {
			return f, fmt.Errorf("invalid year_to")
		}
		f.YearTo = y
	}
	if id, err := parseOptionalIDParam(c.QueryParam("product_item_id")); err != nil {
		return f, fmt.Errorf("invalid product_item_id")
	} else if id != nil {
		f.ProductItemID = id
	}
	if id, err := parseOptionalIDParam(c.QueryParam("supplier_id")); err != nil {
		return f, fmt.Errorf("invalid supplier_id")
	} else if id != nil {
		f.SupplierID = id
	}
	f.Customer = strings.TrimSpace(c.QueryParam("customer"))
	if strings.TrimSpace(c.QueryParam("sort_by")) == "period" {
		f.SortByPeriod = true
		f.SortOrderAsc = strings.EqualFold(strings.TrimSpace(c.QueryParam("sort_order")), "asc")
	}

	// Default YTD for day mode when range omitted.
	if f.GroupBy == HistoryGroupByDay && f.DateFrom == "" && f.DateTo == "" {
		f.DateFrom, f.DateTo = defaultHistoryYTD(time.Now())
	}
	if f.GroupBy == HistoryGroupByMonth && f.MonthFrom == "" && f.MonthTo == "" {
		loc := bangkokLoc()
		n := time.Now().In(loc)
		f.MonthFrom = fmt.Sprintf("%04d-01", n.Year())
		f.MonthTo = n.Format("2006-01")
	}
	if f.GroupBy == HistoryGroupByYear && f.YearFrom == 0 && f.YearTo == 0 {
		y := time.Now().In(bangkokLoc()).Year()
		f.YearFrom, f.YearTo = y, y
	}
	return f, nil
}

func historyPeriodKey(groupBy HistoryGroupBy, t time.Time) string {
	loc := bangkokLoc()
	t = t.In(loc)
	switch groupBy {
	case HistoryGroupByMonth:
		return t.Format("2006-01")
	case HistoryGroupByYear:
		return t.Format("2006")
	default:
		return t.Format("2006-01-02")
	}
}

func historyRangeBounds(f HistoryFilter) (from, to *time.Time, err error) {
	loc := bangkokLoc()
	switch f.GroupBy {
	case HistoryGroupByDay:
		if f.DateFrom != "" {
			t, e := time.ParseInLocation("2006-01-02", f.DateFrom, loc)
			if e != nil {
				return nil, nil, fmt.Errorf("invalid date_from")
			}
			from = &t
		}
		if f.DateTo != "" {
			t, e := time.ParseInLocation("2006-01-02", f.DateTo, loc)
			if e != nil {
				return nil, nil, fmt.Errorf("invalid date_to")
			}
			end := t.Add(24*time.Hour - time.Nanosecond)
			to = &end
		}
	case HistoryGroupByMonth:
		if f.MonthFrom != "" {
			t, e := time.ParseInLocation("2006-01", f.MonthFrom, loc)
			if e != nil {
				return nil, nil, fmt.Errorf("invalid month_from")
			}
			from = &t
		}
		if f.MonthTo != "" {
			t, e := time.ParseInLocation("2006-01", f.MonthTo, loc)
			if e != nil {
				return nil, nil, fmt.Errorf("invalid month_to")
			}
			end := t.AddDate(0, 1, 0).Add(-time.Nanosecond)
			to = &end
		}
	case HistoryGroupByYear:
		if f.YearFrom > 0 {
			t := time.Date(f.YearFrom, 1, 1, 0, 0, 0, 0, loc)
			from = &t
		}
		if f.YearTo > 0 {
			t := time.Date(f.YearTo+1, 1, 1, 0, 0, 0, 0, loc).Add(-time.Nanosecond)
			to = &t
		}
	}
	return from, to, nil
}

type purchaseLotRow struct {
	ProductItemID int64
	SKU           string
	Name          string
	Unit          string
	QtyPerUnit    int
	SupplierID    sql.NullInt64
	SupplierName  string
	Ordered       float64
	Free          float64
	Received      float64
	CostUnit      float64
	DiscUnit      float64
	SellUnit      float64
	At            time.Time
}

func (r *ItemRepository) HistoryPurchase(ctx context.Context, f HistoryFilter) (PurchaseHistoryResponse, error) {
	out := PurchaseHistoryResponse{
		GroupBy: string(f.GroupBy),
		Groups:  []PurchaseHistoryGroup{},
		Summary: PurchaseHistorySummary{},
		Meta:    map[string]any{"total": 0, "page": 1, "limit": 0},
	}
	from, to, err := historyRangeBounds(f)
	if err != nil {
		return out, err
	}
	locale := f.Locale
	if locale == "" {
		locale = "th"
	}

	args := []any{locale}
	where := []string{"s.deleted_at IS NULL", "i.deleted_at IS NULL", "pl.deleted_at IS NULL"}
	if f.ProductListID != nil {
		args = append(args, *f.ProductListID)
		where = append(where, fmt.Sprintf("i.product_list_id = $%d", len(args)))
	}
	if f.ProductItemID != nil {
		args = append(args, *f.ProductItemID)
		where = append(where, fmt.Sprintf("i.id = $%d", len(args)))
	}
	if f.SupplierID != nil {
		args = append(args, *f.SupplierID)
		where = append(where, fmt.Sprintf(`COALESCE(po.supplier_user_id, s.supplier_user_id) = $%d`, len(args)))
	}
	if from != nil {
		args = append(args, *from)
		where = append(where, fmt.Sprintf("COALESCE(s.received_at, s.created_at) >= $%d", len(args)))
	}
	if to != nil {
		args = append(args, *to)
		where = append(where, fmt.Sprintf("COALESCE(s.received_at, s.created_at) <= $%d", len(args)))
	}

	q := `
SELECT i.id, COALESCE(i.sku, ''),
  COALESCE(NULLIF(TRIM(il.name), ''), NULLIF(TRIM(il2.name), ''), NULLIF(TRIM(ll.name), ''), NULLIF(TRIM(ll2.name), ''), '—'),
  i.unit::text, i.qty_per_unit,
  COALESCE(po.supplier_user_id, s.supplier_user_id),
  COALESCE(
    NULLIF(TRIM(si_po.name), ''),
    NULLIF(TRIM(si_st.name), ''),
    NULLIF(TRIM(su_po.sku), ''),
    NULLIF(TRIM(su_st.sku), ''),
    '—'
  ),
  s.order_quantity::float8, s.order_free_gift::float8, s.quantity::float8,
  s.cost_per_unit::float8, s.discount_per_unit::float8, s.sell_price::float8,
  COALESCE(s.received_at, s.created_at)
FROM product_item_stock s
INNER JOIN product_item i ON i.id = s.product_item_id
INNER JOIN product_list pl ON pl.id = i.product_list_id
LEFT JOIN product_item_language il ON il.product_item_id = i.id AND il.locale = $1
LEFT JOIN product_item_language il2 ON il2.product_item_id = i.id AND il2.locale = 'th'
LEFT JOIN product_list_language ll ON ll.product_list_id = pl.id AND ll.locale = $1
LEFT JOIN product_list_language ll2 ON ll2.product_list_id = pl.id AND ll2.locale = 'th'
LEFT JOIN purchase_order_item poi ON poi.id = s.purchase_order_item_id AND poi.deleted_at IS NULL
LEFT JOIN purchase_order po ON po.id = poi.purchase_order_id AND po.deleted_at IS NULL
LEFT JOIN supplier_user su_po ON su_po.id = po.supplier_user_id AND su_po.deleted_at IS NULL
LEFT JOIN supplier_information si_po ON si_po.supplier_user_id = su_po.id AND si_po.type = 'contact'
LEFT JOIN supplier_user su_st ON su_st.id = s.supplier_user_id AND su_st.deleted_at IS NULL
LEFT JOIN supplier_information si_st ON si_st.supplier_user_id = su_st.id AND si_st.type = 'contact'
WHERE ` + strings.Join(where, " AND ") + `
ORDER BY COALESCE(s.received_at, s.created_at) DESC, s.id DESC`

	rows, err := r.db.QueryContext(ctx, q, args...)
	if err != nil {
		return out, err
	}
	defer rows.Close()

	var lots []purchaseLotRow
	for rows.Next() {
		var row purchaseLotRow
		if err := rows.Scan(
			&row.ProductItemID, &row.SKU, &row.Name, &row.Unit, &row.QtyPerUnit,
			&row.SupplierID, &row.SupplierName,
			&row.Ordered, &row.Free, &row.Received,
			&row.CostUnit, &row.DiscUnit, &row.SellUnit, &row.At,
		); err != nil {
			return out, err
		}
		lots = append(lots, row)
	}
	if err := rows.Err(); err != nil {
		return out, err
	}

	out = buildPurchaseHistory(f.GroupBy, lots, f.SortByPeriod, f.SortOrderAsc)
	return out, nil
}

func purchaseMetricsFromLot(lot purchaseLotRow) PurchaseHistoryMetrics {
	recv := lot.Received
	netPer := lot.CostUnit - lot.DiscUnit
	profit := lot.SellUnit - netPer
	pct := 0.0
	if lot.SellUnit > 0 {
		pct = (profit / lot.SellUnit) * 100
	}
	return PurchaseHistoryMetrics{
		QtyOrderedPieces:  lot.Ordered,
		QtyFreePieces:     lot.Free,
		QtyReceivedPieces: recv,
		CostPerUnit:       lot.CostUnit,
		DiscountPerUnit:   lot.DiscUnit,
		NetCostBaht:       lot.CostUnit * recv,
		DiscountBaht:      lot.DiscUnit * recv,
		NetCostPerPiece:   netPer,
		SellPricePerPiece: lot.SellUnit,
		ProfitPerPiece:    profit,
		ProfitPct:         pct,
	}
}

func aggregatePurchaseMetrics(parts []PurchaseHistoryMetrics) PurchaseHistoryMetrics {
	var m PurchaseHistoryMetrics
	var costW, discW, netW, sellW float64
	for _, p := range parts {
		m.QtyOrderedPieces += p.QtyOrderedPieces
		m.QtyFreePieces += p.QtyFreePieces
		m.QtyReceivedPieces += p.QtyReceivedPieces
		m.NetCostBaht += p.NetCostBaht
		m.DiscountBaht += p.DiscountBaht
		costW += p.CostPerUnit * p.QtyReceivedPieces
		discW += p.DiscountPerUnit * p.QtyReceivedPieces
		netW += p.NetCostPerPiece * p.QtyReceivedPieces
		sellW += p.SellPricePerPiece * p.QtyReceivedPieces
	}
	if m.QtyReceivedPieces > 0 {
		m.CostPerUnit = costW / m.QtyReceivedPieces
		m.DiscountPerUnit = discW / m.QtyReceivedPieces
		m.NetCostPerPiece = netW / m.QtyReceivedPieces
		m.SellPricePerPiece = sellW / m.QtyReceivedPieces
		m.ProfitPerPiece = m.SellPricePerPiece - m.NetCostPerPiece
		if m.SellPricePerPiece > 0 {
			m.ProfitPct = (m.ProfitPerPiece / m.SellPricePerPiece) * 100
		}
	}
	return m
}

func buildPurchaseHistory(groupBy HistoryGroupBy, lots []purchaseLotRow, sortByPeriod, asc bool) PurchaseHistoryResponse {
	type childKey struct {
		period string
		itemID int64
		supID  int64
	}
	type childAcc struct {
		child  PurchaseHistoryChild
		parts  []PurchaseHistoryMetrics
		latest time.Time
	}
	acc := map[childKey]*childAcc{}
	periodOrder := []string{}
	periodSeen := map[string]bool{}

	for _, lot := range lots {
		pk := historyPeriodKey(groupBy, lot.At)
		if !periodSeen[pk] {
			periodSeen[pk] = true
			periodOrder = append(periodOrder, pk)
		}
		supID := int64(0)
		if lot.SupplierID.Valid {
			supID = lot.SupplierID.Int64
		}
		ck := childKey{period: pk, itemID: lot.ProductItemID, supID: supID}
		m := purchaseMetricsFromLot(lot)
		if a, ok := acc[ck]; ok {
			a.parts = append(a.parts, m)
			a.child.LotCount++
			if lot.At.After(a.latest) {
				a.latest = lot.At
				a.child.Date = lot.At.UTC().Format(time.RFC3339)
			}
			continue
		}
		var sid *int64
		if lot.SupplierID.Valid {
			v := lot.SupplierID.Int64
			sid = &v
		}
		acc[ck] = &childAcc{
			child: PurchaseHistoryChild{
				ProductItemID: lot.ProductItemID,
				SKU:           lot.SKU,
				Name:          lot.Name,
				SupplierID:    sid,
				SupplierName:  lot.SupplierName,
				Unit:          lot.Unit,
				QtyPerUnit:    lot.QtyPerUnit,
				LotCount:      1,
				Date:          lot.At.UTC().Format(time.RFC3339),
			},
			parts:  []PurchaseHistoryMetrics{m},
			latest: lot.At,
		}
	}

	groups := make([]PurchaseHistoryGroup, 0, len(periodOrder))
	summary := PurchaseHistorySummary{}
	minSet, maxSet := false, false

	for _, pk := range periodOrder {
		g := PurchaseHistoryGroup{PeriodKey: pk, Children: []PurchaseHistoryChild{}}
		partySet := map[int64]bool{}
		var metricParts []PurchaseHistoryMetrics
		for ck, a := range acc {
			if ck.period != pk {
				continue
			}
			a.child.Metrics = aggregatePurchaseMetrics(a.parts)
			g.Children = append(g.Children, a.child)
			metricParts = append(metricParts, a.child.Metrics)
			if a.child.SupplierID != nil {
				partySet[*a.child.SupplierID] = true
			} else {
				partySet[0] = true
			}
			summary.TotalReceivedPieces += a.child.Metrics.QtyReceivedPieces
			summary.TotalValueBaht += a.child.Metrics.NetCostBaht
			summary.TotalFreePieces += a.child.Metrics.QtyFreePieces
			if a.child.Metrics.QtyReceivedPieces > 0 {
				np := a.child.Metrics.NetCostPerPiece
				if !minSet || np < summary.MinNetCostPerPiece {
					summary.MinNetCostPerPiece = np
					minSet = true
				}
				if !maxSet || np > summary.MaxNetCostPerPiece {
					summary.MaxNetCostPerPiece = np
					maxSet = true
				}
			}
		}
		sort.Slice(g.Children, func(i, j int) bool {
			if g.Children[i].Date == g.Children[j].Date {
				return g.Children[i].ProductItemID < g.Children[j].ProductItemID
			}
			return g.Children[i].Date > g.Children[j].Date
		})
		g.PartnerCount = len(partySet)
		g.Metrics = aggregatePurchaseMetrics(metricParts)
		groups = append(groups, g)
	}

	if sortByPeriod {
		sort.SliceStable(groups, func(i, j int) bool {
			if asc {
				return groups[i].PeriodKey < groups[j].PeriodKey
			}
			return groups[i].PeriodKey > groups[j].PeriodKey
		})
	} else {
		// Default: newest period first.
		sort.SliceStable(groups, func(i, j int) bool {
			return groups[i].PeriodKey > groups[j].PeriodKey
		})
	}

	return PurchaseHistoryResponse{
		GroupBy: string(groupBy),
		Summary: summary,
		Groups:  groups,
		Meta:    map[string]any{"total": len(groups), "page": 1, "limit": len(groups)},
	}
}

type salesLineRow struct {
	ProductItemID int64
	SKU           string
	Name          string
	Date          time.Time
	BillNo        string
	Customer      string
	Qty           float64
	PricePerUnit  float64
	Discount      float64
	AvgCost       float64
}

func (r *ItemRepository) HistorySales(ctx context.Context, f HistoryFilter) (SalesHistoryResponse, error) {
	out := SalesHistoryResponse{
		GroupBy: string(f.GroupBy),
		Groups:  []SalesHistoryGroup{},
		Summary: SalesHistorySummary{},
		Meta:    map[string]any{"total": 0, "page": 1, "limit": 0},
	}
	from, to, err := historyRangeBounds(f)
	if err != nil {
		return out, err
	}
	locale := f.Locale
	if locale == "" {
		locale = "th"
	}

	args := []any{locale}
	where := []string{
		"oli.deleted_at IS NULL",
		"ol.deleted_at IS NULL",
		"i.deleted_at IS NULL",
		"pl.deleted_at IS NULL",
		"oli.product_item_id IS NOT NULL",
		"ol.status NOT IN ('cancelled', 'rejected')",
		"oli.status NOT IN ('cancelled', 'rejected')",
	}
	if f.ProductListID != nil {
		args = append(args, *f.ProductListID)
		where = append(where, fmt.Sprintf("i.product_list_id = $%d", len(args)))
	}
	if f.ProductItemID != nil {
		args = append(args, *f.ProductItemID)
		where = append(where, fmt.Sprintf("i.id = $%d", len(args)))
	}
	if f.Customer != "" {
		args = append(args, f.Customer)
		where = append(where, fmt.Sprintf("COALESCE(ol.member_name, '') = $%d", len(args)))
	}
	if from != nil {
		args = append(args, *from)
		where = append(where, fmt.Sprintf("COALESCE(ol.ordered_at, ol.created_at) >= $%d", len(args)))
	}
	if to != nil {
		args = append(args, *to)
		where = append(where, fmt.Sprintf("COALESCE(ol.ordered_at, ol.created_at) <= $%d", len(args)))
	}

	q := `
SELECT i.id, COALESCE(i.sku, ''),
  COALESCE(NULLIF(TRIM(il.name), ''), NULLIF(TRIM(il2.name), ''), NULLIF(TRIM(ll.name), ''), NULLIF(TRIM(ll2.name), ''), '—'),
  COALESCE(ol.ordered_at, ol.created_at),
  COALESCE(ol.sku, '—'),
  COALESCE(NULLIF(TRIM(ol.member_name), ''), '—'),
  oli.amount::float8, oli.price_per_unit::float8, oli.discount::float8,
  COALESCE((
    SELECT CASE WHEN SUM(s.quantity) > 0
      THEN SUM((s.cost_per_unit - s.discount_per_unit) * s.quantity) / SUM(s.quantity)
      ELSE 0 END
    FROM product_item_stock s
    WHERE s.product_item_id = i.id AND s.deleted_at IS NULL
  ), 0)::float8
FROM order_list_item oli
INNER JOIN order_list ol ON ol.id = oli.order_list_id
INNER JOIN product_item i ON i.id = oli.product_item_id
INNER JOIN product_list pl ON pl.id = i.product_list_id
LEFT JOIN product_item_language il ON il.product_item_id = i.id AND il.locale = $1
LEFT JOIN product_item_language il2 ON il2.product_item_id = i.id AND il2.locale = 'th'
LEFT JOIN product_list_language ll ON ll.product_list_id = pl.id AND ll.locale = $1
LEFT JOIN product_list_language ll2 ON ll2.product_list_id = pl.id AND ll2.locale = 'th'
WHERE ` + strings.Join(where, " AND ") + `
ORDER BY COALESCE(ol.ordered_at, ol.created_at) DESC, oli.id DESC`

	rows, err := r.db.QueryContext(ctx, q, args...)
	if err != nil {
		return out, err
	}
	defer rows.Close()

	var lines []salesLineRow
	for rows.Next() {
		var row salesLineRow
		if err := rows.Scan(
			&row.ProductItemID, &row.SKU, &row.Name, &row.Date, &row.BillNo, &row.Customer,
			&row.Qty, &row.PricePerUnit, &row.Discount, &row.AvgCost,
		); err != nil {
			return out, err
		}
		lines = append(lines, row)
	}
	if err := rows.Err(); err != nil {
		return out, err
	}

	out = buildSalesHistory(f.GroupBy, lines, f.SortByPeriod, f.SortOrderAsc)
	return out, nil
}

func salesMetricsFromLine(line salesLineRow) SalesHistoryMetrics {
	netSell := line.PricePerUnit - line.Discount
	netProfit := netSell - line.AvgCost
	pct := 0.0
	if netSell > 0 {
		pct = (netProfit / netSell) * 100
	}
	return SalesHistoryMetrics{
		Qty:              line.Qty,
		NetCostPerUnit:   line.AvgCost,
		NetSellPerUnit:   netSell,
		NetSellTotal:     netSell * line.Qty,
		NetProfitPerUnit: netProfit,
		NetProfitTotal:   netProfit * line.Qty,
		ProfitPct:        pct,
	}
}

func aggregateSalesMetrics(parts []SalesHistoryMetrics) SalesHistoryMetrics {
	var m SalesHistoryMetrics
	var costW, sellW float64
	for _, p := range parts {
		m.Qty += p.Qty
		m.NetSellTotal += p.NetSellTotal
		m.NetProfitTotal += p.NetProfitTotal
		costW += p.NetCostPerUnit * p.Qty
		sellW += p.NetSellPerUnit * p.Qty
	}
	if m.Qty > 0 {
		m.NetCostPerUnit = costW / m.Qty
		m.NetSellPerUnit = sellW / m.Qty
		m.NetProfitPerUnit = m.NetSellPerUnit - m.NetCostPerUnit
		if m.NetSellPerUnit > 0 {
			m.ProfitPct = (m.NetProfitPerUnit / m.NetSellPerUnit) * 100
		}
	}
	return m
}

func buildSalesHistory(groupBy HistoryGroupBy, lines []salesLineRow, sortByPeriod, asc bool) SalesHistoryResponse {
	type groupAcc struct {
		children []SalesHistoryChild
		parts    []SalesHistoryMetrics
		parties  map[string]bool
	}
	byPeriod := map[string]*groupAcc{}
	periodOrder := []string{}

	for _, line := range lines {
		pk := historyPeriodKey(groupBy, line.Date)
		g, ok := byPeriod[pk]
		if !ok {
			g = &groupAcc{parties: map[string]bool{}}
			byPeriod[pk] = g
			periodOrder = append(periodOrder, pk)
		}
		m := salesMetricsFromLine(line)
		g.children = append(g.children, SalesHistoryChild{
			ProductItemID: line.ProductItemID,
			SKU:           line.SKU,
			Name:          line.Name,
			Date:          line.Date.UTC().Format(time.RFC3339),
			BillNo:        line.BillNo,
			Customer:      line.Customer,
			Metrics:       m,
		})
		g.parts = append(g.parts, m)
		g.parties[line.Customer] = true
	}

	groups := make([]SalesHistoryGroup, 0, len(periodOrder))
	summary := SalesHistorySummary{}
	minSet, maxSet := false, false
	for _, pk := range periodOrder {
		g := byPeriod[pk]
		gm := aggregateSalesMetrics(g.parts)
		groups = append(groups, SalesHistoryGroup{
			PeriodKey:    pk,
			PartnerCount: len(g.parties),
			Metrics:      gm,
			Children:     g.children,
		})
		summary.TotalSoldPieces += gm.Qty
		summary.TotalValueBaht += gm.NetSellTotal
		for _, c := range g.children {
			if c.Metrics.Qty <= 0 {
				continue
			}
			sp := c.Metrics.NetSellPerUnit
			if !minSet || sp < summary.MinSellPerPiece {
				summary.MinSellPerPiece = sp
				minSet = true
			}
			if !maxSet || sp > summary.MaxSellPerPiece {
				summary.MaxSellPerPiece = sp
				maxSet = true
			}
		}
	}

	if sortByPeriod {
		sort.SliceStable(groups, func(i, j int) bool {
			if asc {
				return groups[i].PeriodKey < groups[j].PeriodKey
			}
			return groups[i].PeriodKey > groups[j].PeriodKey
		})
	} else {
		sort.SliceStable(groups, func(i, j int) bool {
			return groups[i].PeriodKey > groups[j].PeriodKey
		})
	}

	return SalesHistoryResponse{
		GroupBy: string(groupBy),
		Summary: summary,
		Groups:  groups,
		Meta:    map[string]any{"total": len(groups), "page": 1, "limit": len(groups)},
	}
}

func historyFilterBadRequest(c *echo.Context, err error) error {
	return c.JSON(http.StatusBadRequest, api.ErrorBody{Code: "invalid_request", Message: err.Error()})
}
