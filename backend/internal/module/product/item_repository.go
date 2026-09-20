package product

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
)

type ItemRepository struct {
	db *sql.DB
}

func NewItemRepository(db *sql.DB) *ItemRepository {
	return &ItemRepository{db: db}
}

const itemBrowseFrom = `
FROM product_item i
INNER JOIN product_list pl ON pl.id = i.product_list_id AND pl.deleted_at IS NULL
LEFT JOIN product_item_language il ON il.product_item_id = i.id AND il.locale = $1
LEFT JOIN product_item_language il2 ON il2.product_item_id = i.id AND il2.locale = $2
LEFT JOIN product_list_language ll ON ll.product_list_id = pl.id AND ll.locale = $1
LEFT JOIN product_list_language ll2 ON ll2.product_list_id = pl.id AND ll2.locale = $2
LEFT JOIN product_attribute_language bl ON bl.product_attribute_id = pl.product_brand_id AND bl.locale = $1
LEFT JOIN product_attribute_language cl ON cl.product_attribute_id = pl.product_category_id AND cl.locale = $1`

const itemBrowseWholesalePriceSQL = `(CASE WHEN vat.vat_type = 'include' THEN i.price_wholesale_vat ELSE i.price_wholesale END)`

func itemListOrderBy(sort, order string) string {
	col := "i.created_at ASC, i.id ASC"
	switch sort {
	case "name", "_productName":
		col = "display_name"
	case "stock", "_totalStock":
		col = "total_stock"
	case "available_stock":
		col = "available_stock"
	case "price":
		col = "display_price"
	case "category", "_categoryName":
		col = "category_name"
	case "brand", "_brandName":
		col = "brand_name"
	case "is_active":
		col = "i.is_active"
	case "updated_at":
		col = "i.updated_at"
	default:
		return col
	}
	if order == "desc" {
		return col + " DESC, i.id DESC"
	}
	return col + " ASC, i.id ASC"
}

func (r *ItemRepository) ListBrowse(ctx context.Context, f ItemListFilter) ([]ItemBrowseRow, int64, error) {
	locale := f.Locale
	if locale == "" {
		locale = "th"
	}
	fallback := "th"

	where, whereArgs := itemBrowseWhere(f, 3)
	baseArgs := []any{locale, fallback}
	allArgs := append(append([]any{}, baseArgs...), whereArgs...)

	countQ := `SELECT COUNT(*) ` + itemBrowseFrom + ` WHERE ` + where
	var total int64
	if err := r.db.QueryRowContext(ctx, countQ, allArgs...).Scan(&total); err != nil {
		return nil, 0, err
	}

	limit := f.Limit
	if limit <= 0 {
		limit = 10
	}
	page := f.Page
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * limit
	limitIdx := len(allArgs) + 1
	offsetIdx := limitIdx + 1
	listArgs := append(append([]any{}, allArgs...), limit, offset)

	q := fmt.Sprintf(`
SELECT
  i.id, i.product_list_id, COALESCE(NULLIF(TRIM(i.sku), ''), pl.sku) AS sku,
  %s::float8 AS display_price,
  i.unit::text, i.qty_per_unit, i.minimum_stock, i.is_active, i.is_stopped, i.updated_at,
  pl.tag, i.is_new, pl.product_brand_id, pl.product_category_id,
  COALESCE(NULLIF(TRIM(COALESCE(il.name, il2.name, ll.name, ll2.name)), ''), '') AS display_name,
  COALESCE(NULLIF(TRIM(bl.name), ''), '—') AS brand_name,
  COALESCE(NULLIF(TRIM(cl.name), ''), '—') AS category_name,
  COALESCE(st.total_stock, 0)::float8 AS total_stock,
  COALESCE(rs.reserved_stock, 0)::float8 AS reserved_stock,
  GREATEST(0, COALESCE(st.total_stock, 0) - COALESCE(rs.reserved_stock, 0))::float8 AS available_stock,
  i.type_price::text,
  %s::float8 AS price_wholesale,
  i.amount_price_wholesale,
  COALESCE(wh.cnt, 0)::int AS warehouse_root_count,
  COALESCE(car.cnt, 0)::int AS car_count,
  car.summary AS car_summary,
  cover.system_file_id AS cover_system_file_id
%s
LEFT JOIN LATERAL (
  SELECT pif.system_file_id
  FROM product_item_file pif
  WHERE pif.product_item_id = i.id AND pif.deleted_at IS NULL
  ORDER BY pif.sort_order ASC, pif.id ASC
  LIMIT 1
) cover ON TRUE
LEFT JOIN LATERAL (
  SELECT SUM(s.remain_quantity)::float8 AS total_stock
  FROM product_item_stock s
  WHERE s.product_item_id = i.id AND s.deleted_at IS NULL
) st ON TRUE
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(oli.amount), 0)::float8 AS reserved_stock
  FROM order_list_item oli
  INNER JOIN order_list ol ON ol.id = oli.order_list_id AND ol.deleted_at IS NULL
  WHERE oli.product_item_id = i.id AND oli.deleted_at IS NULL
    AND oli.type = 'item'::order_list_item_type
    AND oli.status IN ('pending'::order_list_item_status, 'in_progress'::order_list_item_status)
) rs ON TRUE
` + DisplayPriceStockLotJoin + `
LEFT JOIN LATERAL (
  SELECT COUNT(DISTINCT zone.parent_id) AS cnt
  FROM product_item_warehouse piw
  INNER JOIN warehouse_list bin ON bin.id = piw.bin_id AND bin.type = 'bin'
  LEFT JOIN warehouse_list rack ON rack.id = bin.parent_id AND rack.type = 'rack'
  LEFT JOIN warehouse_list shelf ON shelf.id = rack.parent_id AND shelf.type = 'shelf'
  LEFT JOIN warehouse_list zone ON zone.id = shelf.parent_id AND zone.type = 'zone'
  WHERE piw.product_item_id = i.id AND piw.deleted_at IS NULL AND zone.parent_id IS NOT NULL
) wh ON TRUE
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int AS cnt,
    (SELECT TRIM(CONCAT(COALESCE(ab.name, ''), ' ', COALESCE(am.name, ''),
      CASE WHEN c2.year_start IS NOT NULL AND c2.year_end IS NOT NULL
        THEN CONCAT(' (', c2.year_start, '-', c2.year_end, ')') ELSE '' END))
     FROM product_list_car c2
     LEFT JOIN product_attribute_language ab ON ab.product_attribute_id = c2.product_attribute_brand_id AND ab.locale = $1
     LEFT JOIN product_attribute_language am ON am.product_attribute_id = c2.product_attribute_model_id AND am.locale = $1
     WHERE c2.product_list_id = pl.id AND c2.deleted_at IS NULL
     ORDER BY c2.id ASC LIMIT 1) AS summary
  FROM product_list_car c
  WHERE c.product_list_id = pl.id AND c.deleted_at IS NULL
) car ON TRUE
WHERE %s
ORDER BY %s
LIMIT $%d OFFSET $%d`, DisplayPriceSellSQL, itemBrowseWholesalePriceSQL, itemBrowseFrom+DisplayPriceVatJoin, where, itemListOrderBy(f.Sort, f.Order), limitIdx, offsetIdx)

	rows, err := r.db.QueryContext(ctx, q, listArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var out []ItemBrowseRow
	for rows.Next() {
		var row ItemBrowseRow
		var brandID, catID, coverFileID sql.NullInt64
		var carSummary sql.NullString
		if err := rows.Scan(
			&row.ID, &row.ProductListID, &row.SKU, &row.Price, &row.Unit, &row.QtyPerUnit,
			&row.MinimumStock, &row.IsActive, &row.IsStopped, &row.UpdatedAt,
			&row.Tag, &row.IsNew, &brandID, &catID,
			&row.Name, &row.BrandName, &row.CategoryName,
			&row.TotalStock, &row.ReservedStock, &row.AvailableStock,
			&row.TypePrice, &row.PriceWholesale, &row.AmountPriceWholesale,
			&row.WarehouseRootCount, &row.CarCount, &carSummary,
			&coverFileID,
		); err != nil {
			return nil, 0, err
		}
		if brandID.Valid {
			row.ProductBrandID = &brandID.Int64
		}
		if catID.Valid {
			row.ProductCategoryID = &catID.Int64
		}
		if carSummary.Valid {
			row.CarSummary = carSummary.String
		}
		if coverFileID.Valid {
			row.CoverSystemFileID = &coverFileID.Int64
		}
		row.LowStock = row.TotalStock < float64(row.MinimumStock)
		out = append(out, row)
	}
	return out, total, rows.Err()
}

func itemBrowseWhere(f ItemListFilter, startArg int) (string, []any) {
	clauses := []string{"i.deleted_at IS NULL"}
	args := []any{}
	n := startArg
	if f.IsActive != nil {
		clauses = append(clauses, fmt.Sprintf("i.is_active = $%d", n))
		args = append(args, *f.IsActive)
		n++
	}
	if f.IsNew != nil && *f.IsNew {
		clauses = append(clauses, "i.is_new = TRUE")
	}
	if f.CategoryID != nil {
		clauses = append(clauses, fmt.Sprintf("pl.product_category_id = $%d", n))
		args = append(args, *f.CategoryID)
		n++
	}
	if f.BrandID != nil {
		clauses = append(clauses, fmt.Sprintf("pl.product_brand_id = $%d", n))
		args = append(args, *f.BrandID)
		n++
	}
	if q := strings.TrimSpace(f.Search); q != "" {
		pat := "%" + strings.ToLower(q) + "%"
		clauses = append(clauses, fmt.Sprintf(`(
  LOWER(COALESCE(i.sku, pl.sku, '')) LIKE $%d OR
  LOWER(COALESCE(pl.tag, '')) LIKE $%d OR
  LOWER(COALESCE(il.name, il2.name, ll.name, ll2.name, '')) LIKE $%d OR
  LOWER(COALESCE(bl.name, '')) LIKE $%d OR
  LOWER(COALESCE(cl.name, '')) LIKE $%d
)`, n, n, n, n, n))
		args = append(args, pat)
	}
	if carClause, carArgs, nextN := itemBrowseCarFitmentClause(f, n); carClause != "" {
		clauses = append(clauses, carClause)
		args = append(args, carArgs...)
		n = nextN
	}
	if oem := strings.TrimSpace(f.OEM); oem != "" {
		pat := "%" + strings.ToLower(oem) + "%"
		clauses = append(clauses, fmt.Sprintf(`(
  LOWER(COALESCE(pl.supplier_sku, '')) LIKE $%d OR
  EXISTS (
    SELECT 1 FROM product_list_code plc
    WHERE plc.product_list_id = pl.id AND plc.deleted_at IS NULL
      AND LOWER(COALESCE(plc.sku, '')) LIKE $%d
  )
)`, n, n))
		args = append(args, pat)
	}
	return strings.Join(clauses, " AND "), args
}

func itemBrowseCarFitmentClause(f ItemListFilter, startArg int) (string, []any, int) {
	if f.CarBrandID == nil && f.ModelID == nil && f.CarYear == nil {
		return "", nil, startArg
	}
	parts := []string{
		"c.product_list_id = pl.id",
		"c.deleted_at IS NULL",
	}
	args := []any{}
	n := startArg
	if f.CarBrandID != nil {
		parts = append(parts, fmt.Sprintf("c.product_attribute_brand_id = $%d", n))
		args = append(args, *f.CarBrandID)
		n++
	}
	if f.ModelID != nil {
		parts = append(parts, fmt.Sprintf("c.product_attribute_model_id = $%d", n))
		args = append(args, *f.ModelID)
		n++
	}
	if f.CarYear != nil {
		parts = append(parts, fmt.Sprintf(
			"c.year_start IS NOT NULL AND $%d >= c.year_start AND $%d <= COALESCE(c.year_end, c.year_start)",
			n, n,
		))
		args = append(args, *f.CarYear)
		n++
	}
	clause := fmt.Sprintf(`EXISTS (
  SELECT 1 FROM product_list_car c
  WHERE %s
)`, strings.Join(parts, " AND "))
	return clause, args, n
}

func (r *ItemRepository) PatchItemActive(ctx context.Context, id int64, active bool, actorID int64) error {
	res, err := r.db.ExecContext(ctx, `
UPDATE product_item SET is_active = $2, updated_at = NOW(), updated_by = $3
WHERE id = $1 AND deleted_at IS NULL`, id, active, nullActor(actorID))
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *ItemRepository) PatchItemStopped(ctx context.Context, id int64, stopped bool, actorID int64) error {
	res, err := r.db.ExecContext(ctx, `
UPDATE product_item SET is_stopped = $2, updated_at = NOW(), updated_by = $3
WHERE id = $1 AND deleted_at IS NULL`, id, stopped, nullActor(actorID))
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *ItemRepository) SoftDeleteItem(ctx context.Context, id int64, actorID int64) error {
	res, err := r.db.ExecContext(ctx, `
UPDATE product_item SET deleted_at = NOW(), updated_at = NOW(), updated_by = $2
WHERE id = $1 AND deleted_at IS NULL`, id, nullActor(actorID))
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *ItemRepository) ListCarsForList(ctx context.Context, listID int64, locale string) ([]CarFitmentRow, error) {
	if locale == "" {
		locale = "th"
	}
	rows, err := r.db.QueryContext(ctx, `
SELECT c.id,
  COALESCE(ab.name, ab2.name, ''),
  COALESCE(am.name, am2.name, ''),
  COALESCE(ae.name, ae2.name, ''),
  c.year_start, c.year_end, c.gear_type::text
FROM product_list_car c
LEFT JOIN product_attribute_language ab ON ab.product_attribute_id = c.product_attribute_brand_id AND ab.locale = $2
LEFT JOIN product_attribute_language ab2 ON ab2.product_attribute_id = c.product_attribute_brand_id AND ab2.locale = 'th'
LEFT JOIN product_attribute_language am ON am.product_attribute_id = c.product_attribute_model_id AND am.locale = $2
LEFT JOIN product_attribute_language am2 ON am2.product_attribute_id = c.product_attribute_model_id AND am2.locale = 'th'
LEFT JOIN product_attribute_language ae ON ae.product_attribute_id = c.product_attribute_engine_id AND ae.locale = $2
LEFT JOIN product_attribute_language ae2 ON ae2.product_attribute_id = c.product_attribute_engine_id AND ae2.locale = 'th'
WHERE c.product_list_id = $1 AND c.deleted_at IS NULL
ORDER BY c.id ASC`, listID, locale)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []CarFitmentRow
	for rows.Next() {
		var row CarFitmentRow
		var ys, ye sql.NullInt64
		var gear sql.NullString
		if err := rows.Scan(&row.ID, &row.BrandName, &row.ModelName, &row.EngineName, &ys, &ye, &gear); err != nil {
			return nil, err
		}
		if ys.Valid {
			v := int(ys.Int64)
			row.YearStart = &v
		}
		if ye.Valid {
			v := int(ye.Int64)
			row.YearEnd = &v
		}
		if gear.Valid {
			g := gear.String
			row.GearType = &g
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

func (r *ItemRepository) WarehousePlacements(ctx context.Context, itemID int64, locale string) ([]WarehousePlacementRow, error) {
	if locale == "" {
		locale = "th"
	}
	rows, err := r.db.QueryContext(ctx, `
SELECT
  piw.id,
  piw.bin_id,
  COALESCE(wl.name, wl2.name, '—'),
  COALESCE(zn.name, zn2.name, '—'),
  COALESCE(sh.name, sh2.name, '—'),
  COALESCE(rk.name, rk2.name, '—'),
  COALESCE(bn.name, bn2.name, '—'),
  COALESCE(SUM(st.remain_quantity), 0)::float8
FROM product_item_warehouse piw
INNER JOIN warehouse_list bin ON bin.id = piw.bin_id AND bin.type = 'bin'
LEFT JOIN warehouse_list rack ON rack.id = bin.parent_id AND rack.type = 'rack'
LEFT JOIN warehouse_list shelf ON shelf.id = rack.parent_id AND shelf.type = 'shelf'
LEFT JOIN warehouse_list zone ON zone.id = shelf.parent_id AND zone.type = 'zone'
LEFT JOIN warehouse_list wh ON wh.id = zone.parent_id AND wh.type = 'warehouse'
LEFT JOIN warehouse_list_language wl ON wl.warehouse_list_id = wh.id AND wl.locale = $2
LEFT JOIN warehouse_list_language wl2 ON wl2.warehouse_list_id = wh.id AND wl2.locale = 'th'
LEFT JOIN warehouse_list_language zn ON zn.warehouse_list_id = zone.id AND zn.locale = $2
LEFT JOIN warehouse_list_language zn2 ON zn2.warehouse_list_id = zone.id AND zn2.locale = 'th'
LEFT JOIN warehouse_list_language sh ON sh.warehouse_list_id = shelf.id AND sh.locale = $2
LEFT JOIN warehouse_list_language sh2 ON sh2.warehouse_list_id = shelf.id AND sh2.locale = 'th'
LEFT JOIN warehouse_list_language rk ON rk.warehouse_list_id = rack.id AND rk.locale = $2
LEFT JOIN warehouse_list_language rk2 ON rk2.warehouse_list_id = rack.id AND rk2.locale = 'th'
LEFT JOIN warehouse_list_language bn ON bn.warehouse_list_id = bin.id AND bn.locale = $2
LEFT JOIN warehouse_list_language bn2 ON bn2.warehouse_list_id = bin.id AND bn2.locale = 'th'
LEFT JOIN product_item_stock st ON st.product_item_warehouse_id = piw.id AND st.deleted_at IS NULL
WHERE piw.product_item_id = $1 AND piw.deleted_at IS NULL
GROUP BY piw.id, piw.bin_id, wl.name, wl2.name, zn.name, zn2.name, sh.name, sh2.name, rk.name, rk2.name, bn.name, bn2.name
ORDER BY piw.id`, itemID, locale)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []WarehousePlacementRow
	for rows.Next() {
		var row WarehousePlacementRow
		if err := rows.Scan(
			&row.PlacementID, &row.BinID,
			&row.WarehouseName, &row.ZoneName, &row.ShelfName, &row.RackName, &row.BinName, &row.Quantity,
		); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

func parseOptionalIDParam(s string) (*int64, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil, nil
	}
	var id int64
	if _, err := fmt.Sscan(s, &id); err != nil || id <= 0 {
		return nil, fmt.Errorf("invalid id")
	}
	return &id, nil
}
