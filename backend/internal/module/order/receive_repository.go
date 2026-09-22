package order

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/lMikadal/warehouse/backend/internal/module/system"
)

// ReceiveRepository handles goods-in for an approved purchase line: it turns the line into real stock
// under a bin, records what arrived damaged or short, and moves the order along.
type ReceiveRepository struct {
	db   *sql.DB
	code *system.CodePrefixRepository
}

func NewReceiveRepository(db *sql.DB) *ReceiveRepository {
	return &ReceiveRepository{db: db, code: system.NewCodePrefixRepository(db)}
}

var receiveRejectTypes = map[string]struct{}{
	"overage": {}, "shortage": {}, "damaged": {}, "wrong": {}, "other": {},
}

var receiveRejectResolutions = map[string]struct{}{
	"claim": {}, "return": {}, "accept_loss": {},
}

var receiveRejectOverageTypes = map[string]struct{}{"receive": {}, "return": {}}

// product_unit enum; a clean 400 beats letting the enum cast fail as a 500.
var purchaseUnits = map[string]struct{}{
	"piece": {}, "box": {}, "set": {}, "roll": {}, "pair": {},
	"bag": {}, "sheet": {}, "meter": {}, "liter": {}, "kg": {},
}

// receiveBinPath renders warehouse ▸ zone ▸ shelf ▸ rack for a bin by walking parent_id upward. The
// bin-only rule forbids storing that path on the placement, so every read derives it.
const receiveBinPath = `
WITH RECURSIVE up AS (
  SELECT w.id, w.parent_id, w.type::text AS type, w.sku, 0 AS depth
  FROM warehouse_list w WHERE w.id = b.id
  UNION ALL
  SELECT p.id, p.parent_id, p.type::text, p.sku, up.depth + 1
  FROM warehouse_list p INNER JOIN up ON up.parent_id = p.id
)
SELECT STRING_AGG(COALESCE(NULLIF(TRIM(wl.name), ''), up.sku), ' / ' ORDER BY up.depth DESC)
FROM up
LEFT JOIN warehouse_list_language wl ON wl.warehouse_list_id = up.id AND wl.locale = 'th'
WHERE up.depth > 0`

// ListBins returns bins the picker may offer for one product item: free bins plus the bins that
// already hold this very item, since one bin holds at most one item.
func (r *ReceiveRepository) ListBins(ctx context.Context, productItemID int64, search string, limit int) (ReceiveBinsResponse, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	rows, err := r.db.QueryContext(ctx, `
SELECT b.id, b.sku,
  COALESCE(NULLIF(TRIM(bl.name), ''), b.sku),
  COALESCE(($1::text), '') AS unused_path_placeholder,
  b.capacity,
  COALESCE(occ.used, 0)::float8,
  occ.product_item_id,
  COALESCE(b.barcode, ''), COALESCE(b.qrcode, ''),
  (`+receiveBinPath+`)
FROM warehouse_list b
LEFT JOIN warehouse_list_language bl ON bl.warehouse_list_id = b.id AND bl.locale = 'th'
LEFT JOIN (
  SELECT pw.bin_id, pw.product_item_id,
    COALESCE(SUM(s.remain_quantity), 0) AS used
  FROM product_item_warehouse pw
  LEFT JOIN product_item_stock s ON s.product_item_warehouse_id = pw.id AND s.deleted_at IS NULL
  WHERE pw.deleted_at IS NULL
  GROUP BY pw.bin_id, pw.product_item_id
) occ ON occ.bin_id = b.id
WHERE b.type = 'bin' AND b.deleted_at IS NULL AND b.is_active = TRUE
  AND (occ.product_item_id IS NULL OR occ.product_item_id = $2)
  AND ($3 = '' OR LOWER(b.sku) LIKE '%' || LOWER($3) || '%'
       OR LOWER(COALESCE(bl.name, '')) LIKE '%' || LOWER($3) || '%')
ORDER BY (occ.product_item_id = $2) DESC NULLS LAST, b.sku
LIMIT $4`, "", productItemID, strings.TrimSpace(search), limit)
	if err != nil {
		return ReceiveBinsResponse{}, err
	}
	defer rows.Close()
	out := ReceiveBinsResponse{Items: []ReceiveBinOption{}}
	for rows.Next() {
		var b ReceiveBinOption
		var placeholder string
		var itemID sql.NullInt64
		var path sql.NullString
		if err := rows.Scan(&b.ID, &b.SKU, &b.Name, &placeholder, &b.Capacity, &b.Used,
			&itemID, &b.Barcode, &b.QRCode, &path); err != nil {
			return out, err
		}
		if itemID.Valid {
			v := itemID.Int64
			b.ProductItemID = &v
		}
		if path.Valid {
			b.Path = path.String
		}
		b.Free = float64(b.Capacity) - b.Used
		if b.Free < 0 {
			b.Free = 0
		}
		out.Items = append(out.Items, b)
	}
	return out, rows.Err()
}

// Placements lists the lots one received line produced, replacing v1's store_data JSON.
func (r *ReceiveRepository) Placements(ctx context.Context, orderID, itemID int64) (ReceivePlacementsResponse, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT s.id, b.id, b.sku, COALESCE(NULLIF(TRIM(bl.name), ''), b.sku),
  (`+receiveBinPath+`),
  s.quantity::float8, s.order_free_gift::float8, s.remain_quantity::float8,
  s.cost_per_unit::float8, s.sell_price::float8, s.received_at
FROM product_item_stock s
INNER JOIN product_item_warehouse pw ON pw.id = s.product_item_warehouse_id
INNER JOIN warehouse_list b ON b.id = pw.bin_id
INNER JOIN purchase_order_item i ON i.id = s.purchase_order_item_id
LEFT JOIN warehouse_list_language bl ON bl.warehouse_list_id = b.id AND bl.locale = 'th'
WHERE s.purchase_order_item_id = $2 AND i.purchase_order_id = $1 AND s.deleted_at IS NULL
ORDER BY s.id`, orderID, itemID)
	if err != nil {
		return ReceivePlacementsResponse{}, err
	}
	defer rows.Close()
	out := ReceivePlacementsResponse{Items: []ReceivePlacementRow{}}
	for rows.Next() {
		var row ReceivePlacementRow
		var path sql.NullString
		var receivedAt sql.NullTime
		if err := rows.Scan(&row.StockID, &row.BinID, &row.BinSKU, &row.BinName, &path,
			&row.Quantity, &row.FreeGift, &row.RemainQuantity,
			&row.CostPerUnit, &row.SellPrice, &receivedAt); err != nil {
			return out, err
		}
		if path.Valid {
			row.Path = path.String
		}
		if receivedAt.Valid {
			s := receivedAt.Time.Format(time.RFC3339)
			row.ReceivedAt = &s
		}
		out.Items = append(out.Items, row)
	}
	return out, rows.Err()
}

// splitFreeGift spreads a free-gift quantity across placements in proportion to the paid quantity each
// one takes, with the remainder landing on the first placements — v1 splitBonusQtyAcrossPlacements.
func splitFreeGift(placements []ReceivePlacement, bonus int) []int {
	out := make([]int, len(placements))
	if bonus <= 0 || len(placements) == 0 {
		return out
	}
	total := 0
	for _, p := range placements {
		if p.StockQty > 0 {
			total += p.StockQty
		}
	}
	if total == 0 {
		out[0] = bonus
		return out
	}
	assigned := 0
	for i, p := range placements {
		if p.StockQty <= 0 {
			continue
		}
		share := bonus * p.StockQty / total
		out[i] = share
		assigned += share
	}
	for i := range out {
		if assigned >= bonus {
			break
		}
		if placements[i].StockQty <= 0 {
			continue
		}
		out[i]++
		assigned++
	}
	return out
}

// ReceiveItem books an approved line into stock. Re-receiving an already received line first undoes
// the previous inbound, so correcting a mistake never double-counts (v1 revertPurchaseReceiveInbound).
func (r *ReceiveRepository) ReceiveItem(ctx context.Context, orderID, itemID int64, in ReceiveItemBody, actorID int64) (*ReceiveItemResult, error) {
	if len(in.Placements) == 0 || in.BonusQty < 0 || in.SellPrice < 0 {
		return nil, ErrValidation
	}
	placedQty := 0
	seenBins := map[int64]struct{}{}
	for _, p := range in.Placements {
		if p.BinID <= 0 || p.StockQty <= 0 {
			return nil, ErrValidation
		}
		if _, dup := seenBins[p.BinID]; dup {
			return nil, ErrValidation
		}
		seenBins[p.BinID] = struct{}{}
		placedQty += p.StockQty
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback() //nolint:errcheck

	var (
		status, unit  string
		qty           int
		pricePerUnit  float64
		vatRate       float64
		discount      float64
		productItemID sql.NullInt64
		supplierID    sql.NullInt64
		orderStatus   string
		vatType       string
	)
	err = tx.QueryRowContext(ctx, `
SELECT i.status::text, i.unit::text, i.qty, i.price_per_unit::float8, i.vat_rate::float8, i.discount::float8,
  i.product_item_id, po.supplier_user_id, po.status::text, po.vat_type::text
FROM purchase_order_item i
INNER JOIN purchase_order po ON po.id = i.purchase_order_id AND po.deleted_at IS NULL
WHERE i.id = $2 AND i.purchase_order_id = $1 AND i.deleted_at IS NULL
FOR UPDATE OF i`, orderID, itemID).
		Scan(&status, &unit, &qty, &pricePerUnit, &vatRate, &discount, &productItemID, &supplierID, &orderStatus, &vatType)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	// v1 accepts a receive only on an approved line, or again on one already received (a correction).
	if status != "approved" && status != "receive_approved" {
		return nil, ErrValidation
	}
	if orderStatus != "completed" && orderStatus != "receive_partial" && orderStatus != "receive_completed" {
		return nil, ErrValidation
	}
	if !productItemID.Valid || productItemID.Int64 <= 0 {
		// Custom lines have no catalog row yet; v1 required the product item before receiving.
		return nil, ErrValidation
	}
	if placedQty > qty+in.BonusQty {
		return nil, ErrValidation
	}

	if status == "receive_approved" {
		if err := revertReceiveInboundTx(ctx, tx, itemID); err != nil {
			return nil, err
		}
	}

	itemPID := productItemID.Int64
	costPerUnit := pricePerUnit
	discountPerUnit := 0.0
	if qty > 0 {
		discountPerUnit = discount / float64(qty)
	}
	bonusParts := splitFreeGift(in.Placements, in.BonusQty)

	var firstLotID int64
	for i, p := range in.Placements {
		whID, err := findOrCreatePlacementTx(ctx, tx, itemPID, p.BinID, actorID)
		if err != nil {
			return nil, err
		}
		if err := assertBinCapacityTx(ctx, tx, p.BinID, float64(p.StockQty+bonusParts[i])); err != nil {
			return nil, err
		}
		// is_used stays FALSE here: only one lot per product item may be the active one, and that
		// choice is made below once every placement exists.
		var lotID int64
		if err := tx.QueryRowContext(ctx, `
INSERT INTO product_item_stock (
  product_item_id, product_item_warehouse_id, purchase_order_item_id, supplier_user_id,
  order_quantity, order_free_gift, quantity, remain_quantity,
  cost_per_unit, discount_per_unit, vat_type, vat_rate, sell_price, is_used, received_at,
  created_by, updated_by
) VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9, $10::setting_vat_type, $11, $12, FALSE,
  CURRENT_TIMESTAMP, $13, $13)
RETURNING id`,
			itemPID, whID, itemID, nullInt64OrNil(supplierID),
			p.StockQty, bonusParts[i], float64(p.StockQty+bonusParts[i]),
			costPerUnit, discountPerUnit, vatType, vatRate, in.SellPrice,
			nullActorID(actorID)).Scan(&lotID); err != nil {
			return nil, err
		}
		if firstLotID == 0 {
			firstLotID = lotID
		}
	}
	if err := activateLotIfItemHasNoneTx(ctx, tx, itemPID, firstLotID, actorID); err != nil {
		return nil, err
	}

	if _, err := tx.ExecContext(ctx, `
UPDATE purchase_order_item SET
  status = 'receive_approved', free_gift = $2,
  updated_by = $3, updated_at = CURRENT_TIMESTAMP
WHERE id = $1`, itemID, in.BonusQty, nullActorID(actorID)); err != nil {
		return nil, err
	}
	oldItemStatus := status
	newItemStatus := "receive_approved"
	if err := insertPurchaseHistoryTx(ctx, tx,
		purchaseHistoryRef{OrderID: &orderID, OrderItemID: &itemID},
		&oldItemStatus, &newItemStatus, actorID); err != nil {
		return nil, err
	}

	nextOrderStatus, err := refreshReceiveOrderStatusTx(ctx, tx, orderID, orderStatus, actorID)
	if err != nil {
		return nil, err
	}

	var productListID int64
	if err := tx.QueryRowContext(ctx,
		`SELECT product_list_id FROM product_item WHERE id = $1`, itemPID).Scan(&productListID); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &ReceiveItemResult{
		ProductItemID: itemPID,
		ProductListID: productListID,
		OrderStatus:   nextOrderStatus,
	}, nil
}

// activateLotIfItemHasNoneTx makes the freshly received lot the item's selling lot when it has none,
// which is what a first receive means. An item that already sells from another lot keeps it, since
// switching the active lot is the product screen's decision, not the receive desk's.
func activateLotIfItemHasNoneTx(ctx context.Context, tx *sql.Tx, productItemID, lotID int64, actorID int64) error {
	if lotID == 0 {
		return nil
	}
	var active int
	if err := tx.QueryRowContext(ctx, `
SELECT COUNT(*) FROM product_item_stock
WHERE product_item_id = $1 AND is_used = TRUE AND deleted_at IS NULL`, productItemID).Scan(&active); err != nil {
		return err
	}
	if active > 0 {
		return nil
	}
	_, err := tx.ExecContext(ctx, `
UPDATE product_item_stock SET is_used = TRUE, updated_at = CURRENT_TIMESTAMP, updated_by = $2
WHERE id = $1`, lotID, nullActorID(actorID))
	return err
}

// revertReceiveInboundTx removes the lots a previous receive created for this line. Soft-deleting the
// stock rows keeps the audit trail while freeing the bin occupancy that capacity checks read.
func revertReceiveInboundTx(ctx context.Context, tx *sql.Tx, itemID int64) error {
	var soldFrom int
	if err := tx.QueryRowContext(ctx, `
SELECT COUNT(*) FROM product_item_stock
WHERE purchase_order_item_id = $1 AND deleted_at IS NULL AND remain_quantity < quantity`, itemID).
		Scan(&soldFrom); err != nil {
		return err
	}
	if soldFrom > 0 {
		// Part of the lot already left the shelf; undoing it would invent negative stock.
		return fmt.Errorf("%w: received stock already consumed", ErrValidation)
	}
	_, err := tx.ExecContext(ctx, `
UPDATE product_item_stock SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
WHERE purchase_order_item_id = $1 AND deleted_at IS NULL`, itemID)
	return err
}

// findOrCreatePlacementTx resolves the product_item_warehouse row for one bin, honouring the bin-only
// and one-bin-one-item rules.
func findOrCreatePlacementTx(ctx context.Context, tx *sql.Tx, productItemID, binID int64, actorID int64) (int64, error) {
	var binType string
	if err := tx.QueryRowContext(ctx, `
SELECT type::text FROM warehouse_list
WHERE id = $1 AND deleted_at IS NULL AND is_active = TRUE`, binID).Scan(&binType); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return 0, fmt.Errorf("%w: bin not found", ErrValidation)
		}
		return 0, err
	}
	if binType != "bin" {
		return 0, fmt.Errorf("%w: placement target must be a bin", ErrValidation)
	}
	var id, ownerItemID int64
	err := tx.QueryRowContext(ctx, `
SELECT id, product_item_id FROM product_item_warehouse
WHERE bin_id = $1 AND deleted_at IS NULL FOR UPDATE`, binID).Scan(&id, &ownerItemID)
	switch {
	case errors.Is(err, sql.ErrNoRows):
		if err := tx.QueryRowContext(ctx, `
INSERT INTO product_item_warehouse (product_item_id, bin_id, created_by, updated_by)
VALUES ($1, $2, $3, $3) RETURNING id`,
			productItemID, binID, nullActorID(actorID)).Scan(&id); err != nil {
			return 0, err
		}
		return id, nil
	case err != nil:
		return 0, err
	case ownerItemID != productItemID:
		return 0, fmt.Errorf("%w: bin already holds another item", ErrValidation)
	default:
		return id, nil
	}
}

// assertBinCapacityTx refuses a placement that would overflow the bin. capacity 0 means "unmetered",
// which is how the warehouse seeds express bins nobody has measured yet.
func assertBinCapacityTx(ctx context.Context, tx *sql.Tx, binID int64, add float64) error {
	var capacity int
	var used float64
	if err := tx.QueryRowContext(ctx, `
SELECT b.capacity,
  COALESCE((SELECT SUM(s.remain_quantity) FROM product_item_warehouse pw
    LEFT JOIN product_item_stock s ON s.product_item_warehouse_id = pw.id AND s.deleted_at IS NULL
    WHERE pw.bin_id = b.id AND pw.deleted_at IS NULL), 0)::float8
FROM warehouse_list b WHERE b.id = $1`, binID).Scan(&capacity, &used); err != nil {
		return err
	}
	if capacity > 0 && used+add > float64(capacity) {
		return fmt.Errorf("%w: bin capacity exceeded", ErrValidation)
	}
	return nil
}

// refreshReceiveOrderStatusTx moves the order to receive_partial or receive_completed depending on
// whether any approved line is still waiting. v1 derived "partial" in the UI; the status is real here.
func refreshReceiveOrderStatusTx(ctx context.Context, tx *sql.Tx, orderID int64, curStatus string, actorID int64) (string, error) {
	var pending, received int
	if err := tx.QueryRowContext(ctx, `
SELECT
  COUNT(*) FILTER (WHERE status = 'approved'),
  COUNT(*) FILTER (WHERE status = 'receive_approved')
FROM purchase_order_item
WHERE purchase_order_id = $1 AND deleted_at IS NULL`, orderID).Scan(&pending, &received); err != nil {
		return "", err
	}
	next := curStatus
	switch {
	case received > 0 && pending == 0:
		next = "receive_completed"
	case received > 0:
		next = "receive_partial"
	}
	if next == curStatus {
		return curStatus, nil
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE purchase_order SET status = $2::purchase_order_status,
  updated_by = $3, updated_at = CURRENT_TIMESTAMP
WHERE id = $1`, orderID, next, nullActorID(actorID)); err != nil {
		return "", err
	}
	if err := insertPurchaseHistoryTx(ctx, tx, purchaseHistoryRef{OrderID: &orderID},
		&curStatus, &next, actorID); err != nil {
		return "", err
	}
	return next, nil
}

// CreateReject records what arrived wrong on a line and marks the line receive_rejected so the receive
// screen stops asking for it, mirroring v1's reject dialog.
func (r *ReceiveRepository) CreateReject(ctx context.Context, orderID, itemID int64, in ReceiveRejectInput, actorID int64) (int64, error) {
	if _, ok := receiveRejectTypes[in.Type]; !ok {
		return 0, ErrValidation
	}
	if in.Resolution == "" {
		in.Resolution = "claim"
	}
	if _, ok := receiveRejectResolutions[in.Resolution]; !ok {
		return 0, ErrValidation
	}
	if in.Type == "overage" {
		if in.OverageType == nil {
			return 0, ErrValidation
		}
		if _, ok := receiveRejectOverageTypes[*in.OverageType]; !ok {
			return 0, ErrValidation
		}
	} else if in.OverageType != nil {
		return 0, ErrValidation
	}
	if in.Qty < 0 {
		return 0, ErrValidation
	}
	if in.Unit == "" {
		in.Unit = "piece"
	}
	if _, ok := purchaseUnits[in.Unit]; !ok {
		return 0, ErrValidation
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback() //nolint:errcheck

	var itemStatus, orderStatus string
	var requestItemID sql.NullInt64
	err = tx.QueryRowContext(ctx, `
SELECT i.status::text, po.status::text, i.purchase_request_item_id
FROM purchase_order_item i
INNER JOIN purchase_order po ON po.id = i.purchase_order_id AND po.deleted_at IS NULL
WHERE i.id = $2 AND i.purchase_order_id = $1 AND i.deleted_at IS NULL
FOR UPDATE OF i`, orderID, itemID).Scan(&itemStatus, &orderStatus, &requestItemID)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, ErrNotFound
	}
	if err != nil {
		return 0, err
	}
	if itemStatus != "approved" && itemStatus != "receive_approved" {
		return 0, ErrValidation
	}

	sku, err := r.code.NextCode(ctx, tx, "purchase_order_item_reject", time.Now())
	if err != nil {
		return 0, err
	}
	var id int64
	if err := tx.QueryRowContext(ctx, `
INSERT INTO purchase_order_item_reject (
  purchase_order_id, purchase_order_item_id, purchase_request_item_id, sku,
  type, overage_type, resolution, status, qty, unit, price, vat_rate,
  note, note_resolution, created_by
) VALUES ($1, $2, $3, $4,
  $5::purchase_order_item_reject_type,
  $6::purchase_order_item_reject_overage_type,
  $7::purchase_order_item_reject_resolution,
  'pending', $8, $9::product_unit, $10, $11, $12, $13, $14)
RETURNING id`,
		orderID, itemID, nullInt64OrNil(requestItemID), sku,
		in.Type, in.OverageType, in.Resolution, in.Qty, in.Unit, in.Price, in.VatRate,
		in.Note, in.NoteResolution, nullActorID(actorID)).Scan(&id); err != nil {
		return 0, err
	}
	for i, fileID := range in.SystemFileIDs {
		if fileID <= 0 {
			continue
		}
		if _, err := tx.ExecContext(ctx, `
INSERT INTO purchase_order_item_reject_file (purchase_order_item_reject_id, system_file_id, sort_order)
VALUES ($1, $2, $3)`, id, fileID, i); err != nil {
			return 0, err
		}
	}
	// An overage taken into stock is still receivable; everything else takes the line out of receive.
	takesLineOut := !(in.Type == "overage" && in.OverageType != nil && *in.OverageType == "receive")
	if takesLineOut && itemStatus == "approved" {
		if _, err := tx.ExecContext(ctx, `
UPDATE purchase_order_item SET status = 'receive_rejected',
  updated_by = $2, updated_at = CURRENT_TIMESTAMP
WHERE id = $1`, itemID, nullActorID(actorID)); err != nil {
			return 0, err
		}
		next := "receive_rejected"
		if err := insertPurchaseHistoryTx(ctx, tx,
			purchaseHistoryRef{OrderID: &orderID, OrderItemID: &itemID, RejectID: &id},
			&itemStatus, &next, actorID); err != nil {
			return 0, err
		}
		if _, err := refreshReceiveOrderStatusTx(ctx, tx, orderID, orderStatus, actorID); err != nil {
			return 0, err
		}
	}
	return id, tx.Commit()
}

// Rejects lists the recorded rejects of one order, newest first.
func (r *ReceiveRepository) Rejects(ctx context.Context, orderID int64) (ReceiveRejectsResponse, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT rj.id, rj.purchase_order_item_id, rj.sku, rj.type::text, rj.overage_type::text,
  rj.resolution::text, rj.status::text, rj.qty, rj.unit::text,
  rj.price::float8, rj.vat_rate::float8, rj.note, rj.note_resolution, rj.note_process,
  rj.created_at, au.username, pil.name, pi.sku
FROM purchase_order_item_reject rj
INNER JOIN purchase_order_item i ON i.id = rj.purchase_order_item_id
LEFT JOIN product_item pi ON pi.id = i.product_item_id
LEFT JOIN product_item_language pil ON pil.product_item_id = pi.id AND pil.locale = 'th'
LEFT JOIN admin_user au ON au.id = rj.created_by
WHERE i.purchase_order_id = $1 AND i.deleted_at IS NULL
ORDER BY rj.id DESC`, orderID)
	if err != nil {
		return ReceiveRejectsResponse{}, err
	}
	defer rows.Close()
	out := ReceiveRejectsResponse{Items: []ReceiveRejectDetail{}}
	ids := []int64{}
	byID := map[int64]*ReceiveRejectDetail{}
	for rows.Next() {
		var d ReceiveRejectDetail
		var overageType, createdBy, productName, productSKU sql.NullString
		if err := rows.Scan(&d.ID, &d.PurchaseOrderItemID, &d.SKU, &d.Type, &overageType,
			&d.Resolution, &d.Status, &d.Qty, &d.Unit,
			&d.Price, &d.VatRate, &d.Note, &d.NoteResolution, &d.NoteProcess,
			&d.CreatedAt, &createdBy, &productName, &productSKU); err != nil {
			return out, err
		}
		if overageType.Valid {
			v := overageType.String
			d.OverageType = &v
		}
		assignNullStr(&d.CreatedByName, createdBy)
		assignNullStr(&d.ProductItemName, productName)
		assignNullStr(&d.ProductItemSKU, productSKU)
		d.Files = []PurchaseItemFile{}
		out.Items = append(out.Items, d)
		ids = append(ids, d.ID)
	}
	if err := rows.Err(); err != nil {
		return out, err
	}
	for i := range out.Items {
		byID[out.Items[i].ID] = &out.Items[i]
	}
	if len(ids) == 0 {
		return out, nil
	}
	fileRows, err := r.db.QueryContext(ctx, `
SELECT id, purchase_order_item_reject_id, system_file_id, sort_order
FROM purchase_order_item_reject_file
WHERE purchase_order_item_reject_id = ANY($1) AND deleted_at IS NULL
ORDER BY purchase_order_item_reject_id, sort_order, id`, int64Array(ids))
	if err != nil {
		return out, err
	}
	defer fileRows.Close()
	for fileRows.Next() {
		var f PurchaseItemFile
		var rejectID int64
		if err := fileRows.Scan(&f.ID, &rejectID, &f.SystemFileID, &f.SortOrder); err != nil {
			return out, err
		}
		if target := byID[rejectID]; target != nil {
			target.Files = append(target.Files, f)
		}
	}
	return out, fileRows.Err()
}

func nullInt64OrNil(v sql.NullInt64) any {
	if !v.Valid {
		return nil
	}
	return v.Int64
}
