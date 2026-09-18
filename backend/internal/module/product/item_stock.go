package product

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

var ErrBinInUse = errors.New("bin in use")

type ItemStockRow struct {
	ID                     int64   `json:"id"`
	ProductItemWarehouseID int64   `json:"product_item_warehouse_id"`
	BinID                  int64   `json:"bin_id"`
	BinLabel               string  `json:"bin_label"`
	BinSKU                 string  `json:"bin_sku"`
	PartnerName            string  `json:"partner_name"`
	PoSKU                  string  `json:"po_sku,omitempty"`
	PurchaseOrderItemID    *int64  `json:"purchase_order_item_id,omitempty"`
	OrderQuantity          float64 `json:"order_quantity"`
	OrderFreeGift          float64 `json:"order_free_gift"`
	Quantity               float64 `json:"quantity"`
	RemainQuantity         float64 `json:"remain_quantity"`
	CostPerUnit            float64 `json:"cost_per_unit"`
	DiscountPerUnit        float64 `json:"discount_per_unit"`
	VatType                string  `json:"vat_type"`
	VatRate                float64 `json:"vat_rate"`
	SellPrice              float64 `json:"sell_price"`
	IsUsed                 bool    `json:"is_used"`
	ReceivedAt             *string `json:"received_at,omitempty"`
	SupplierUserID         *int64  `json:"supplier_user_id,omitempty"`
}

type StockCreateInput struct {
	BinID           int64
	SupplierUserID  *int64
	OrderQuantity   float64
	OrderFreeGift   float64
	Quantity        float64
	RemainQuantity  float64
	CostPerUnit     float64
	DiscountPerUnit float64
	SellPrice       float64
	IsUsed          bool
	ReceivedAt      *time.Time
	PoSKUSet        bool
	PoSKU           string
}

type StockPatchInput struct {
	OrderQuantity   *float64
	OrderFreeGift   *float64
	Quantity        *float64
	RemainQuantity  *float64
	CostPerUnit     *float64
	DiscountPerUnit *float64
	SellPrice       *float64
	IsUsed          *bool
	ReceivedAtSet   bool
	ReceivedAtClear bool
	ReceivedAt      *time.Time
	SupplierSet     bool
	SupplierClear   bool
	SupplierUserID  *int64
	PoSKUSet        bool
	PoSKUClear      bool
	PoSKU           string
}

func validateStockCreate(in StockCreateInput) error {
	if in.BinID <= 0 {
		return ErrValidation
	}
	if in.Quantity < 0 || in.RemainQuantity < 0 {
		return ErrValidation
	}
	return nil
}

func validateStockPatch(in StockPatchInput) error {
	if in.OrderQuantity == nil && in.OrderFreeGift == nil && in.Quantity == nil &&
		in.RemainQuantity == nil && in.CostPerUnit == nil && in.DiscountPerUnit == nil &&
		in.SellPrice == nil && in.IsUsed == nil && !in.ReceivedAtSet && !in.ReceivedAtClear &&
		!in.SupplierSet && !in.SupplierClear && !in.PoSKUSet && !in.PoSKUClear {
		return ErrValidation
	}
	return nil
}

func parseStockReceivedAt(s string) (time.Time, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return time.Time{}, ErrValidation
	}
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t, nil
	}
	if t, err := time.Parse("2006-01-02", s); err == nil {
		return time.Date(t.Year(), t.Month(), t.Day(), 12, 0, 0, 0, time.UTC), nil
	}
	return time.Time{}, ErrValidation
}

func (r *ItemRepository) supplierExists(ctx context.Context, supplierID int64) error {
	var n int
	err := r.db.QueryRowContext(ctx, `
SELECT 1 FROM supplier_user WHERE id = $1 AND deleted_at IS NULL`, supplierID).Scan(&n)
	if err == sql.ErrNoRows {
		return ErrValidation
	}
	return err
}

func (r *ItemRepository) resolvePurchaseOrderItemID(ctx context.Context, db queryRower, itemID int64, poSKU string) (int64, error) {
	sku := strings.TrimSpace(poSKU)
	if sku == "" {
		return 0, ErrValidation
	}
	var poiID int64
	err := db.QueryRowContext(ctx, `
SELECT poi.id
FROM purchase_order po
INNER JOIN purchase_order_item poi ON poi.purchase_order_id = po.id AND poi.deleted_at IS NULL
WHERE po.deleted_at IS NULL AND po.sku IS NOT NULL AND LOWER(TRIM(po.sku)) = LOWER($1)
  AND poi.product_item_id = $2
ORDER BY poi.id
LIMIT 1`, sku, itemID).Scan(&poiID)
	if err == sql.ErrNoRows {
		return 0, ErrValidation
	}
	return poiID, err
}

type queryRower interface {
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}

func (r *ItemRepository) itemExists(ctx context.Context, itemID int64) error {
	var n int
	err := r.db.QueryRowContext(ctx, `
SELECT 1 FROM product_item WHERE id = $1 AND deleted_at IS NULL`, itemID).Scan(&n)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	return err
}

const listStocksSelect = `
SELECT s.id, s.product_item_warehouse_id, piw.bin_id,
  COALESCE(NULLIF(TRIM(bn.name), ''), NULLIF(TRIM(bn2.name), ''), '—'),
  COALESCE(NULLIF(TRIM(bin.sku), ''), '—'),
  COALESCE(
    NULLIF(TRIM(si_po.name), ''),
    NULLIF(TRIM(si_st.name), ''),
    NULLIF(TRIM(su_po.sku), ''),
    NULLIF(TRIM(su_st.sku), ''),
    '—'
  ),
  COALESCE(NULLIF(TRIM(po.sku), ''), ''),
  s.purchase_order_item_id,
  s.order_quantity::float8, s.order_free_gift::float8, s.quantity::float8, s.remain_quantity::float8,
  s.cost_per_unit::float8, s.discount_per_unit::float8, s.vat_type::text, s.vat_rate::float8,
  s.sell_price::float8, s.is_used,
  s.received_at, s.supplier_user_id
FROM product_item_stock s
INNER JOIN product_item_warehouse piw ON piw.id = s.product_item_warehouse_id AND piw.deleted_at IS NULL
INNER JOIN warehouse_list bin ON bin.id = piw.bin_id AND bin.type = 'bin'
LEFT JOIN warehouse_list_language bn ON bn.warehouse_list_id = bin.id AND bn.locale = $2
LEFT JOIN warehouse_list_language bn2 ON bn2.warehouse_list_id = bin.id AND bn2.locale = 'th'
LEFT JOIN purchase_order_item poi ON poi.id = s.purchase_order_item_id AND poi.deleted_at IS NULL
LEFT JOIN purchase_order po ON po.id = poi.purchase_order_id AND po.deleted_at IS NULL
LEFT JOIN supplier_user su_po ON su_po.id = po.supplier_user_id AND su_po.deleted_at IS NULL
LEFT JOIN supplier_information si_po ON si_po.supplier_user_id = su_po.id AND si_po.type = 'contact'
LEFT JOIN supplier_user su_st ON su_st.id = s.supplier_user_id AND su_st.deleted_at IS NULL
LEFT JOIN supplier_information si_st ON si_st.supplier_user_id = su_st.id AND si_st.type = 'contact'`

func scanItemStockRow(rows *sql.Rows) (ItemStockRow, error) {
	var row ItemStockRow
	var recv sql.NullTime
	var sup sql.NullInt64
	var poi sql.NullInt64
	if err := rows.Scan(&row.ID, &row.ProductItemWarehouseID, &row.BinID, &row.BinLabel,
		&row.BinSKU, &row.PartnerName, &row.PoSKU, &poi,
		&row.OrderQuantity, &row.OrderFreeGift, &row.Quantity, &row.RemainQuantity,
		&row.CostPerUnit, &row.DiscountPerUnit, &row.VatType, &row.VatRate, &row.SellPrice, &row.IsUsed,
		&recv, &sup); err != nil {
		return row, err
	}
	if recv.Valid {
		s := recv.Time.Format(time.RFC3339)
		row.ReceivedAt = &s
	}
	if sup.Valid {
		v := sup.Int64
		row.SupplierUserID = &v
	}
	if poi.Valid {
		v := poi.Int64
		row.PurchaseOrderItemID = &v
	}
	if row.VatType != "include" && row.VatType != "exclude" {
		row.VatType = "exclude"
	}
	return row, nil
}

func (r *ItemRepository) ListStocks(ctx context.Context, itemID int64, locale string, page, limit int) ([]ItemStockRow, int, error) {
	if locale == "" {
		locale = "th"
	}
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}
	offset := (page - 1) * limit
	var total int
	if err := r.db.QueryRowContext(ctx, `
SELECT COUNT(*) FROM product_item_stock
WHERE product_item_id = $1 AND deleted_at IS NULL`, itemID).Scan(&total); err != nil {
		return nil, 0, err
	}
	q := listStocksSelect + `
WHERE s.product_item_id = $1 AND s.deleted_at IS NULL
ORDER BY s.created_at ASC, s.id ASC
LIMIT $3 OFFSET $4`
	rows, err := r.db.QueryContext(ctx, q, itemID, locale, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var out []ItemStockRow
	for rows.Next() {
		row, err := scanItemStockRow(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, row)
	}
	return out, total, rows.Err()
}

func (r *ItemRepository) lookupItemPlacement(ctx context.Context, tx *sql.Tx, itemID, binID int64) (int64, error) {
	var placementID int64
	err := tx.QueryRowContext(ctx, `
SELECT id FROM product_item_warehouse
WHERE product_item_id = $1 AND bin_id = $2 AND deleted_at IS NULL`, itemID, binID).Scan(&placementID)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, ErrValidation
	}
	return placementID, err
}

func (r *ItemRepository) assertItemAllowsNewStock(ctx context.Context, tx *sql.Tx, itemID int64) error {
	var oldItem sql.NullInt64
	err := tx.QueryRowContext(ctx, `
SELECT old_product_item_id FROM product_item WHERE id = $1 AND deleted_at IS NULL`, itemID).Scan(&oldItem)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if oldItem.Valid {
		return ErrValidation
	}
	return nil
}

func (r *ItemRepository) setActiveStockLot(ctx context.Context, tx *sql.Tx, stockID int64, itemID int64, wantUsed bool, actorID int64) error {
	act := nullActor(actorID)
	if !wantUsed {
		_, err := tx.ExecContext(ctx, `
UPDATE product_item_stock SET is_used = FALSE, updated_at = NOW(), updated_by = $2
WHERE id = $1 AND product_item_id = $3 AND deleted_at IS NULL`, stockID, act, itemID)
		return err
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE product_item_stock SET is_used = FALSE, updated_at = NOW(), updated_by = $3
WHERE product_item_id = $1 AND id <> $2 AND deleted_at IS NULL AND is_used = TRUE`,
		itemID, stockID, act); err != nil {
		return err
	}
	res, err := tx.ExecContext(ctx, `
UPDATE product_item_stock SET is_used = TRUE, updated_at = NOW(), updated_by = $3
WHERE id = $1 AND product_item_id = $2 AND deleted_at IS NULL`, stockID, itemID, act)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *ItemRepository) CreateStock(ctx context.Context, itemID int64, in StockCreateInput, actorID int64) (int64, error) {
	if err := validateStockCreate(in); err != nil {
		return 0, err
	}
	if err := r.itemExists(ctx, itemID); err != nil {
		return 0, err
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	if err := r.assertItemAllowsNewStock(ctx, tx, itemID); err != nil {
		return 0, err
	}

	placementID, err := r.lookupItemPlacement(ctx, tx, itemID, in.BinID)
	if err != nil {
		return 0, err
	}

	supplierID := in.SupplierUserID
	var poiID *int64
	if in.PoSKUSet {
		id, err := r.resolvePurchaseOrderItemID(ctx, tx, itemID, in.PoSKU)
		if err != nil {
			return 0, err
		}
		poiID = &id
		if supplierID == nil {
			var supID sql.NullInt64
			err = tx.QueryRowContext(ctx, `
SELECT po.supplier_user_id FROM purchase_order_item poi
INNER JOIN purchase_order po ON po.id = poi.purchase_order_id AND po.deleted_at IS NULL
WHERE poi.id = $1 AND poi.deleted_at IS NULL`, id).Scan(&supID)
			if err != nil && !errors.Is(err, sql.ErrNoRows) {
				return 0, err
			}
			if supID.Valid {
				supplierID = &supID.Int64
			}
		}
	}
	if supplierID != nil {
		if err := r.supplierExists(ctx, *supplierID); err != nil {
			return 0, err
		}
	}

	remain := in.RemainQuantity
	if remain == 0 && in.Quantity > 0 {
		remain = in.Quantity
	}
	isUsed := in.IsUsed

	vatSnap, err := activeSettingVatSnapshot(ctx, tx)
	if err != nil {
		return 0, err
	}

	var stockID int64
	var recv any
	if in.ReceivedAt != nil {
		recv = *in.ReceivedAt
	}
	err = tx.QueryRowContext(ctx, `
INSERT INTO product_item_stock (
  product_item_id, product_item_warehouse_id, purchase_order_item_id, supplier_user_id,
  order_quantity, order_free_gift, quantity, remain_quantity,
  cost_per_unit, discount_per_unit, vat_type, vat_rate, sell_price, is_used, received_at,
  created_by, updated_by
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::setting_vat_type, $12, $13, $14, $15, $16, $16
) RETURNING id`,
		itemID, placementID, nullOptionalInt64(poiID), nullOptionalInt64(supplierID),
		in.OrderQuantity, in.OrderFreeGift, in.Quantity, remain,
		in.CostPerUnit, in.DiscountPerUnit, vatSnap.VatType, vatSnap.Rate, in.SellPrice, isUsed, recv,
		nullActor(actorID)).Scan(&stockID)
	if err != nil {
		return 0, err
	}
	if isUsed {
		if err := r.setActiveStockLot(ctx, tx, stockID, itemID, true, actorID); err != nil {
			return 0, err
		}
	}
	if err := tx.Commit(); err != nil {
		return 0, err
	}
	return stockID, nil
}

func (r *ItemRepository) UpdateStock(ctx context.Context, itemID, stockID int64, in StockPatchInput, actorID int64) error {
	if err := validateStockPatch(in); err != nil {
		return err
	}
	if err := r.itemExists(ctx, itemID); err != nil {
		return err
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var placementID int64
	err = tx.QueryRowContext(ctx, `
SELECT product_item_warehouse_id FROM product_item_stock
WHERE id = $1 AND product_item_id = $2 AND deleted_at IS NULL`, stockID, itemID).Scan(&placementID)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	if err != nil {
		return err
	}

	sets := []string{"updated_at = NOW()", "updated_by = $1"}
	args := []any{nullActor(actorID)}
	idx := 2
	add := func(col string, v any) {
		sets = append(sets, fmt.Sprintf("%s = $%d", col, idx))
		args = append(args, v)
		idx++
	}
	if in.OrderQuantity != nil {
		add("order_quantity", *in.OrderQuantity)
	}
	if in.OrderFreeGift != nil {
		add("order_free_gift", *in.OrderFreeGift)
	}
	if in.Quantity != nil {
		add("quantity", *in.Quantity)
	}
	if in.RemainQuantity != nil {
		add("remain_quantity", *in.RemainQuantity)
	}
	if in.CostPerUnit != nil {
		add("cost_per_unit", *in.CostPerUnit)
	}
	if in.DiscountPerUnit != nil {
		add("discount_per_unit", *in.DiscountPerUnit)
	}
	if in.SellPrice != nil {
		add("sell_price", *in.SellPrice)
	}
	if in.IsUsed != nil {
		add("is_used", *in.IsUsed)
	}
	if in.ReceivedAtClear {
		sets = append(sets, "received_at = NULL")
	} else if in.ReceivedAtSet && in.ReceivedAt != nil {
		add("received_at", *in.ReceivedAt)
	}
	if in.SupplierClear {
		sets = append(sets, "supplier_user_id = NULL")
	} else if in.SupplierSet && in.SupplierUserID != nil {
		if err := r.supplierExists(ctx, *in.SupplierUserID); err != nil {
			return err
		}
		add("supplier_user_id", *in.SupplierUserID)
	}
	if in.PoSKUClear {
		sets = append(sets, "purchase_order_item_id = NULL")
	} else if in.PoSKUSet {
		poiID, err := r.resolvePurchaseOrderItemID(ctx, tx, itemID, in.PoSKU)
		if err != nil {
			return err
		}
		add("purchase_order_item_id", poiID)
		// When PO links, default supplier from PO unless this patch also sets supplier explicitly.
		if !in.SupplierSet && !in.SupplierClear {
			var supID sql.NullInt64
			err = tx.QueryRowContext(ctx, `
SELECT po.supplier_user_id FROM purchase_order_item poi
INNER JOIN purchase_order po ON po.id = poi.purchase_order_id AND po.deleted_at IS NULL
WHERE poi.id = $1 AND poi.deleted_at IS NULL`, poiID).Scan(&supID)
			if err != nil && !errors.Is(err, sql.ErrNoRows) {
				return err
			}
			if supID.Valid {
				add("supplier_user_id", supID.Int64)
			}
		}
	}

	args = append(args, stockID, itemID)
	q := fmt.Sprintf(`
UPDATE product_item_stock SET %s
WHERE id = $%d AND product_item_id = $%d AND deleted_at IS NULL`,
		strings.Join(sets, ", "), idx, idx+1)
	res, err := tx.ExecContext(ctx, q, args...)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	if in.IsUsed != nil {
		if err := r.setActiveStockLot(ctx, tx, stockID, itemID, *in.IsUsed, actorID); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (r *ItemRepository) DeleteStock(ctx context.Context, itemID, stockID int64, actorID int64) error {
	if err := r.itemExists(ctx, itemID); err != nil {
		return err
	}
	res, err := r.db.ExecContext(ctx, `
UPDATE product_item_stock SET deleted_at = NOW(), updated_at = NOW(), updated_by = $3
WHERE id = $1 AND product_item_id = $2 AND deleted_at IS NULL`, stockID, itemID, nullActor(actorID))
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

func nullOptionalInt64(id *int64) sql.NullInt64 {
	if id == nil || *id <= 0 {
		return sql.NullInt64{}
	}
	return sql.NullInt64{Int64: *id, Valid: true}
}
