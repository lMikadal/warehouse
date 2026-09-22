package order

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	pkgauth "github.com/lMikadal/warehouse/backend/internal/auth"
	"github.com/lMikadal/warehouse/backend/internal/module/system"
)

type PickingRepository struct {
	db   *sql.DB
	code *system.CodePrefixRepository
}

func NewPickingRepository(db *sql.DB) *PickingRepository {
	return &PickingRepository{db: db, code: system.NewCodePrefixRepository(db)}
}

// pickingFulfillStatuses is v1's order status set, renamed: wait → pending.
var pickingFulfillStatuses = []string{"pending", "in_progress", "success", "fail"}

// pickingItemStatuses is the subset of order_list_item_status the picking desk uses. cancelled and
// rejected belong to the sale document, not to goods-out.
var pickingItemStatuses = []string{"pending", "in_progress", "success"}

func containsString(list []string, v string) bool {
	for _, s := range list {
		if s == v {
			return true
		}
	}
	return false
}

// paymentCodeKey maps the payment category to its document series, the way v1 did: a loan is an
// invoice (INV), a settled payment is a receipt (REV).
func paymentCodeKey(category string) string {
	if category == "payment" {
		return "order_payment_receipt"
	}
	return "order_payment_invoice"
}

const pickingListFrom = `
FROM order_list d
LEFT JOIN admin_user au ON au.id = d.created_by
LEFT JOIN admin_user uu ON uu.id = d.updated_by
`

// pickingOwnLineScope counts only the slip's own lines. v1's list did the same: a split child shows its
// own goods, and the family is reached by expanding the row.
const pickingOwnLineScope = ` WHERE i.order_list_id = d.id AND i.deleted_at IS NULL`

func pickingListWhere(q PickingListQuery) (string, []any) {
	// The picking desk only sees settled sale documents: a slip reaches it once the sale is success.
	where := "d.deleted_at IS NULL AND d.status = 'success'"
	args := []any{}
	if q.RootOnly {
		where += " AND d.parent_id IS NULL"
	}
	if q.Search != "" {
		args = append(args, "%"+q.Search+"%")
		n := len(args)
		where += fmt.Sprintf(" AND (d.sku ILIKE $%d OR d.member_name ILIKE $%d)", n, n)
	}
	if q.Status != "" {
		args = append(args, q.Status)
		where += fmt.Sprintf(" AND d.fulfill_status = $%d::order_list_fulfill_status", len(args))
	}
	if q.DateFrom != "" {
		args = append(args, q.DateFrom)
		where += fmt.Sprintf(" AND d.created_at >= $%d::timestamptz", len(args))
	}
	if q.DateTo != "" {
		args = append(args, q.DateTo)
		where += fmt.Sprintf(" AND d.created_at <= $%d::timestamptz", len(args))
	}
	if q.CreatedBy != nil {
		args = append(args, *q.CreatedBy)
		where += fmt.Sprintf(" AND d.created_by = $%d", len(args))
	}
	return where, args
}

func (r *PickingRepository) List(ctx context.Context, q PickingListQuery) (PickingListResponse, error) {
	where, args := pickingListWhere(q)
	var total int
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) "+pickingListFrom+" WHERE "+where, args...).Scan(&total); err != nil {
		return PickingListResponse{}, err
	}
	offset := (q.Page - 1) * q.Limit
	args = append(args, q.Limit, offset)
	query := fmt.Sprintf(`
SELECT d.id, d.sku, d.fulfill_status::text, d.status::text, d.parent_id, d.member_name,
  (SELECT COUNT(*) FROM order_list_item i`+pickingOwnLineScope+`) AS item_count,
  (SELECT COALESCE(SUM(i.amount), 0) FROM order_list_item i`+pickingOwnLineScope+`) AS piece_count,
  (SELECT COALESCE(SUM(COALESCE(NULLIF(i.total_price, 0), `+orderListItemLineTotalExpr+`)), 0)
     FROM order_list_item i`+pickingOwnLineScope+`) AS total_price,
  (SELECT COUNT(*) FROM order_payment p WHERE p.order_list_id = d.id AND p.deleted_at IS NULL) AS payment_count,
  (SELECT p.sku FROM order_payment p
    WHERE p.order_list_id = d.id AND p.deleted_at IS NULL AND p.sku IS NOT NULL
    ORDER BY (p.payment_category = 'credit') DESC, p.id ASC LIMIT 1) AS payment_sku,
  d.ordered_at, d.created_at, au.username, d.updated_at, uu.username
%s WHERE %s ORDER BY d.created_at DESC, d.id DESC LIMIT $%d OFFSET $%d`,
		pickingListFrom, where, len(args)-1, len(args))
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return PickingListResponse{}, err
	}
	defer rows.Close()
	items := []PickingListItem{}
	for rows.Next() {
		var it PickingListItem
		var sku, paymentSKU, memberName, createdByName, updatedByName sql.NullString
		var parentID sql.NullInt64
		var orderedAt, updatedAt sql.NullTime
		if err := rows.Scan(&it.ID, &sku, &it.Status, &it.DocStatus, &parentID, &memberName,
			&it.ItemCount, &it.PieceCount, &it.TotalPrice, &it.PaymentCount, &paymentSKU,
			&orderedAt, &it.CreatedAt, &createdByName, &updatedAt, &updatedByName); err != nil {
			return PickingListResponse{}, err
		}
		it.SKU = sku.String
		if parentID.Valid {
			it.ParentID = &parentID.Int64
		}
		it.MemberName = nullableString(memberName)
		it.PaymentSKU = nullableString(paymentSKU)
		it.CreatedByName = nullableString(createdByName)
		it.UpdatedByName = nullableString(updatedByName)
		if orderedAt.Valid {
			it.OrderedAt = &orderedAt.Time
		}
		if updatedAt.Valid {
			it.UpdatedAt = &updatedAt.Time
		}
		items = append(items, it)
	}
	return PickingListResponse{Items: items, Total: total, Page: q.Page, Limit: q.Limit}, rows.Err()
}

func (r *PickingRepository) Count(ctx context.Context, q PickingListQuery) (PickingCountResponse, error) {
	q.Status = ""
	where, args := pickingListWhere(q)
	rows, err := r.db.QueryContext(ctx, `
SELECT d.fulfill_status::text, COUNT(*)`+pickingListFrom+`WHERE `+where+`
GROUP BY d.fulfill_status`, args...)
	if err != nil {
		return PickingCountResponse{}, err
	}
	defer rows.Close()
	resp := PickingCountResponse{ByStatus: map[string]int64{}}
	for rows.Next() {
		var st string
		var n int64
		if err := rows.Scan(&st, &n); err != nil {
			return PickingCountResponse{}, err
		}
		resp.ByStatus[st] = n
		resp.Count += n
	}
	return resp, rows.Err()
}

// Family returns the slip and its split children with their lines. The picking form opens on whichever
// id the list linked to, so the root is resolved from that row's parent.
func (r *PickingRepository) Family(ctx context.Context, id int64) (PickingFamilyResponse, error) {
	var resp PickingFamilyResponse
	var parentID sql.NullInt64
	err := r.db.QueryRowContext(ctx, `
SELECT parent_id FROM order_list WHERE id = $1 AND deleted_at IS NULL`, id).Scan(&parentID)
	if errors.Is(err, sql.ErrNoRows) {
		return resp, ErrNotFound
	}
	if err != nil {
		return resp, err
	}
	resp.RootID = id
	if parentID.Valid && parentID.Int64 > 0 {
		resp.RootID = parentID.Int64
	}
	rows, err := r.db.QueryContext(ctx, `
SELECT d.id, d.sku, d.fulfill_status::text, d.status::text, d.parent_id,
       d.member_user_id, d.member_setting_credit_id, d.member_name, d.member_tel, d.member_email,
       d.vat_type::text, d.vat_rate::float8, d.ordered_at, d.created_at, d.created_by, au.username,
       sh.type::text, sh.received_at
FROM order_list d
LEFT JOIN admin_user au ON au.id = d.created_by
LEFT JOIN order_list_shipping sh ON sh.order_list_id = d.id
WHERE d.deleted_at IS NULL AND (d.id = $1 OR d.parent_id = $1)
ORDER BY d.sku NULLS LAST, d.id`, resp.RootID)
	if err != nil {
		return resp, err
	}
	defer rows.Close()
	resp.Orders = []PickingOrderDetail{}
	for rows.Next() {
		var o PickingOrderDetail
		var sku, memberName, memberTel, memberEmail, createdByName, shipType sql.NullString
		var parent, memberUserID, creditID, createdBy sql.NullInt64
		var orderedAt, receivedAt sql.NullTime
		if err := rows.Scan(&o.ID, &sku, &o.Status, &o.DocStatus, &parent,
			&memberUserID, &creditID, &memberName, &memberTel, &memberEmail,
			&o.VatType, &o.VatRate, &orderedAt, &o.CreatedAt, &createdBy, &createdByName,
			&shipType, &receivedAt); err != nil {
			return resp, err
		}
		o.SKU = sku.String
		if parent.Valid {
			o.ParentID = &parent.Int64
		}
		if memberUserID.Valid {
			o.MemberUserID = &memberUserID.Int64
		}
		if creditID.Valid {
			o.MemberSettingCreditID = &creditID.Int64
		}
		if createdBy.Valid {
			o.CreatedBy = &createdBy.Int64
		}
		o.MemberName = nullableString(memberName)
		o.MemberTel = nullableString(memberTel)
		o.MemberEmail = nullableString(memberEmail)
		o.CreatedByName = nullableString(createdByName)
		if orderedAt.Valid {
			o.OrderedAt = &orderedAt.Time
		}
		if shipType.Valid {
			sh := StoreSalesShippingDetail{Type: shipType.String}
			if receivedAt.Valid {
				sh.ReceivedAt = &receivedAt.Time
			}
			o.Shipping = &sh
		}
		resp.Orders = append(resp.Orders, o)
	}
	if err := rows.Err(); err != nil {
		return resp, err
	}
	for i := range resp.Orders {
		items, err := r.loadPickingItems(ctx, resp.Orders[i].ID)
		if err != nil {
			return resp, err
		}
		resp.Orders[i].Items = items
	}
	return resp, nil
}

func (r *PickingRepository) loadPickingItems(ctx context.Context, orderID int64) ([]PickingItemDetail, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT i.id, i.product_item_id, i.type::text, i.amount::float8, i.amount_picked::float8,
       i.amount_checked::float8, i.status::text, i.price_per_unit::float8, i.discount::float8,
       i.vat_type::text, i.vat_rate::float8, i.total_price::float8, i.detail::text,
       (SELECT w.warehouse_list_id FROM order_list_item_warehouse w
         WHERE w.order_list_item_id = i.id AND w.deleted_at IS NULL ORDER BY w.id LIMIT 1)
FROM order_list_item i
WHERE i.order_list_id = $1 AND i.deleted_at IS NULL
ORDER BY i.type, i.id`, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []PickingItemDetail{}
	for rows.Next() {
		var it PickingItemDetail
		var productID, binID sql.NullInt64
		var detail sql.NullString
		if err := rows.Scan(&it.ID, &productID, &it.Type, &it.Amount, &it.AmountPicked,
			&it.AmountChecked, &it.Status, &it.PricePerUnit, &it.Discount,
			&it.VatType, &it.VatRate, &it.TotalPrice, &detail, &binID); err != nil {
			return nil, err
		}
		if productID.Valid {
			it.ProductItemID = &productID.Int64
		}
		if binID.Valid {
			it.WarehouseListID = &binID.Int64
		}
		if detail.Valid {
			if s := compareDetailFromJSON(detail.String); s != "" {
				it.Detail = &s
			}
		}
		out = append(out, it)
	}
	return out, rows.Err()
}

// PatchItem applies the verify step to one line. Quantities are validated here, not just in the UI: a
// checked amount can never be negative nor exceed what was ordered.
func (r *PickingRepository) PatchItem(ctx context.Context, orderID, itemID int64, in PickingItemPatchInput, actorID int64) (PickingItemDetail, error) {
	var zero PickingItemDetail
	if !in.hasPatch() {
		return zero, fmt.Errorf("%w: empty patch", ErrValidation)
	}
	if in.Status != nil && !containsString(pickingItemStatuses, *in.Status) {
		return zero, fmt.Errorf("%w: invalid item status", ErrValidation)
	}
	if in.ProductItemID != nil && *in.ProductItemID < 1 {
		return zero, fmt.Errorf("%w: invalid product_item_id", ErrValidation)
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return zero, err
	}
	defer tx.Rollback() //nolint:errcheck

	var amount float64
	var lineType string
	err = tx.QueryRowContext(ctx, `
SELECT i.amount::float8, i.type::text FROM order_list_item i
INNER JOIN order_list d ON d.id = i.order_list_id AND d.deleted_at IS NULL
WHERE i.id = $1 AND i.order_list_id = $2 AND i.deleted_at IS NULL FOR UPDATE OF i`, itemID, orderID).
		Scan(&amount, &lineType)
	if errors.Is(err, sql.ErrNoRows) {
		return zero, ErrNotFound
	}
	if err != nil {
		return zero, err
	}
	if in.AmountChecked != nil {
		if *in.AmountChecked < 0 {
			return zero, fmt.Errorf("%w: amount_checked must not be negative", ErrValidation)
		}
		if *in.AmountChecked > amount {
			return zero, fmt.Errorf("%w: amount_checked exceeds ordered amount", ErrValidation)
		}
	}
	if in.ProductItemID != nil {
		var exists bool
		if err := tx.QueryRowContext(ctx, `
SELECT EXISTS (SELECT 1 FROM product_item WHERE id = $1 AND deleted_at IS NULL)`, *in.ProductItemID).Scan(&exists); err != nil {
			return zero, err
		}
		if !exists {
			return zero, fmt.Errorf("%w: product item not found", ErrValidation)
		}
	}
	if in.PricePerUnit != nil && *in.PricePerUnit < 0 {
		return zero, fmt.Errorf("%w: price_per_unit must not be negative", ErrValidation)
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE order_list_item SET
  amount_checked = COALESCE($2, amount_checked),
  amount_picked = COALESCE($2, amount_picked),
  status = COALESCE($3::order_list_item_status, status),
  product_item_id = COALESCE($4, product_item_id),
  price_per_unit = COALESCE($5, price_per_unit),
  updated_by = $6, updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL`,
		itemID, in.AmountChecked, in.Status, in.ProductItemID, in.PricePerUnit, nullActorID(actorID)); err != nil {
		return zero, err
	}
	if in.WarehouseListID != nil {
		if err := setPickLocationTx(ctx, tx, itemID, *in.WarehouseListID, actorID); err != nil {
			return zero, err
		}
	}
	if err := tx.Commit(); err != nil {
		return zero, err
	}
	items, err := r.loadPickingItems(ctx, orderID)
	if err != nil {
		return zero, err
	}
	for _, it := range items {
		if it.ID == itemID {
			return it, nil
		}
	}
	return zero, ErrNotFound
}

// setPickLocationTx records which bin the goods left from. The bin-only rule applies here too: stock
// lives under bins, so a zone or a shelf is not a pick location.
func setPickLocationTx(ctx context.Context, tx *sql.Tx, itemID, binID int64, actorID int64) error {
	var binType string
	err := tx.QueryRowContext(ctx, `
SELECT type::text FROM warehouse_list WHERE id = $1 AND deleted_at IS NULL`, binID).Scan(&binType)
	if errors.Is(err, sql.ErrNoRows) {
		return fmt.Errorf("%w: bin not found", ErrValidation)
	}
	if err != nil {
		return err
	}
	if binType != "bin" {
		return fmt.Errorf("%w: pick location must be a bin", ErrValidation)
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE order_list_item_warehouse SET deleted_at = NOW(), updated_at = NOW()
WHERE order_list_item_id = $1 AND warehouse_list_id <> $2 AND deleted_at IS NULL`, itemID, binID); err != nil {
		return err
	}
	_, err = tx.ExecContext(ctx, `
INSERT INTO order_list_item_warehouse (order_list_item_id, warehouse_list_id, amount_checked, created_by, updated_by)
SELECT $1, $2, i.amount_checked, $3, $3 FROM order_list_item i WHERE i.id = $1
ON CONFLICT (order_list_item_id, warehouse_list_id) WHERE deleted_at IS NULL
DO UPDATE SET amount_checked = EXCLUDED.amount_checked, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
		itemID, binID, nullActorID(actorID))
	return err
}

// PatchStatus moves the goods-out lifecycle. Reaching success takes the goods out of stock, which is
// the one irreversible thing this desk does, so it happens in the same transaction as the status.
func (r *PickingRepository) PatchStatus(ctx context.Context, id int64, status string, actorID int64) error {
	if !containsString(pickingFulfillStatuses, status) {
		return fmt.Errorf("%w: invalid status", ErrValidation)
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck

	var cur string
	err = tx.QueryRowContext(ctx, `
SELECT fulfill_status::text FROM order_list WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`, id).Scan(&cur)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if status == "success" && cur != "success" {
		if err := deductPickedStockTx(ctx, tx, id); err != nil {
			return err
		}
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE order_list SET fulfill_status = $2::order_list_fulfill_status,
  updated_by = $3, updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL`, id, status, nullActorID(actorID)); err != nil {
		return err
	}
	return tx.Commit()
}

// deductPickedStockTx takes the verified quantities out of the bins they were picked from, oldest lot
// first. Lines without a recorded bin are left alone — there is nowhere to take them from.
func deductPickedStockTx(ctx context.Context, tx *sql.Tx, orderID int64) error {
	rows, err := tx.QueryContext(ctx, `
SELECT w.amount_checked::float8, w.warehouse_list_id, i.product_item_id
FROM order_list_item i
INNER JOIN order_list_item_warehouse w ON w.order_list_item_id = i.id AND w.deleted_at IS NULL
WHERE i.order_list_id = $1 AND i.deleted_at IS NULL
  AND w.amount_checked > 0 AND i.product_item_id IS NOT NULL`, orderID)
	if err != nil {
		return err
	}
	type pick struct {
		need                 float64
		binID, productItemID int64
	}
	var picks []pick
	for rows.Next() {
		var p pick
		if err := rows.Scan(&p.need, &p.binID, &p.productItemID); err != nil {
			rows.Close()
			return err
		}
		picks = append(picks, p)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return err
	}
	for _, p := range picks {
		if err := deductBinFIFOTx(ctx, tx, p.productItemID, p.binID, p.need); err != nil {
			return err
		}
	}
	return nil
}

func deductBinFIFOTx(ctx context.Context, tx *sql.Tx, productItemID, binID int64, need float64) error {
	if need <= 0 || math.IsNaN(need) || math.IsInf(need, 0) {
		return nil
	}
	rows, err := tx.QueryContext(ctx, `
SELECT s.id, s.remain_quantity::float8
FROM product_item_stock s
INNER JOIN product_item_warehouse pw ON pw.id = s.product_item_warehouse_id AND pw.deleted_at IS NULL
WHERE pw.product_item_id = $1 AND pw.bin_id = $2 AND s.deleted_at IS NULL AND s.remain_quantity > 0
ORDER BY s.received_at NULLS LAST, s.id
FOR UPDATE OF s`, productItemID, binID)
	if err != nil {
		return err
	}
	type lot struct {
		id     int64
		remain float64
	}
	var lots []lot
	for rows.Next() {
		var l lot
		if err := rows.Scan(&l.id, &l.remain); err != nil {
			rows.Close()
			return err
		}
		lots = append(lots, l)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return err
	}
	left := need
	for _, l := range lots {
		if left <= 0 {
			break
		}
		take := math.Min(l.remain, left)
		left -= take
		if _, err := tx.ExecContext(ctx, `
UPDATE product_item_stock SET remain_quantity = remain_quantity - $2, updated_at = NOW()
WHERE id = $1`, l.id, take); err != nil {
			return err
		}
	}
	return nil
}

func (r *PickingRepository) Payments(ctx context.Context, orderListID int64) (PickingPaymentsResponse, error) {
	resp := PickingPaymentsResponse{Items: []PickingPaymentDetail{}}
	rows, err := r.db.QueryContext(ctx, `
SELECT id, order_list_id, sku, payment_category::text, ordered_at, vat_rate::float8,
       discount::float8, special_discount::float8, total_price::float8, amount_paid::float8,
       is_full, is_paid, credit_approved_by, discount_approved_by,
       member_user_id, member_setting_credit_id, member_name, member_tel, member_email,
       created_at
FROM order_payment
WHERE order_list_id = $1 AND deleted_at IS NULL
ORDER BY id`, orderListID)
	if err != nil {
		return resp, err
	}
	defer rows.Close()
	for rows.Next() {
		var p PickingPaymentDetail
		var sku sql.NullString
		var creditBy, discountBy, memberUserID, memberCreditID sql.NullInt64
		var memberName, memberTel, memberEmail sql.NullString
		if err := rows.Scan(&p.ID, &p.OrderListID, &sku, &p.PaymentCategory, &p.OrderedAt, &p.VatRate,
			&p.Discount, &p.SpecialDiscount, &p.TotalPrice, &p.AmountPaid,
			&p.IsFull, &p.IsPaid, &creditBy, &discountBy,
			&memberUserID, &memberCreditID, &memberName, &memberTel, &memberEmail,
			&p.CreatedAt); err != nil {
			return resp, err
		}
		p.SKU = sku.String
		if creditBy.Valid {
			p.CreditApprovedBy = &creditBy.Int64
		}
		if discountBy.Valid {
			p.DiscountApprovedBy = &discountBy.Int64
		}
		if memberUserID.Valid {
			p.MemberUserID = &memberUserID.Int64
		}
		if memberCreditID.Valid {
			p.MemberSettingCreditID = &memberCreditID.Int64
		}
		p.MemberName = nullableString(memberName)
		p.MemberTel = nullableString(memberTel)
		p.MemberEmail = nullableString(memberEmail)
		p.Methods = []PickingPaymentMethodDetail{}
		p.Items = []PickingPaymentItemDetail{}
		resp.Items = append(resp.Items, p)
	}
	if err := rows.Err(); err != nil {
		return resp, err
	}
	for i := range resp.Items {
		methods, err := r.loadPaymentMethods(ctx, resp.Items[i].ID)
		if err != nil {
			return resp, err
		}
		items, err := r.loadPaymentItems(ctx, resp.Items[i].ID)
		if err != nil {
			return resp, err
		}
		resp.Items[i].Methods = methods
		resp.Items[i].Items = items
	}
	return resp, nil
}

func (r *PickingRepository) loadPaymentMethods(ctx context.Context, payID int64) ([]PickingPaymentMethodDetail, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT m.id, m.setting_payment_method_id, ml.name, m.amount::float8
FROM order_payment_method m
LEFT JOIN setting_payment_method_language ml
  ON ml.setting_payment_method_id = m.setting_payment_method_id AND ml.locale = 'th'
WHERE m.order_payment_id = $1 AND m.deleted_at IS NULL
ORDER BY m.id`, payID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []PickingPaymentMethodDetail{}
	for rows.Next() {
		var m PickingPaymentMethodDetail
		var name sql.NullString
		if err := rows.Scan(&m.ID, &m.SettingPaymentMethodID, &name, &m.Amount); err != nil {
			return nil, err
		}
		m.Name = nullableString(name)
		out = append(out, m)
	}
	return out, rows.Err()
}

func (r *PickingRepository) loadPaymentItems(ctx context.Context, payID int64) ([]PickingPaymentItemDetail, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT id, order_list_item_id, amount::float8, vat_rate::float8, price_per_unit::float8,
       discount::float8, total_price::float8
FROM order_payment_item
WHERE order_payment_id = $1 AND deleted_at IS NULL
ORDER BY id`, payID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []PickingPaymentItemDetail{}
	for rows.Next() {
		var it PickingPaymentItemDetail
		if err := rows.Scan(&it.ID, &it.OrderListItemID, &it.Amount, &it.VatRate,
			&it.PricePerUnit, &it.Discount, &it.TotalPrice); err != nil {
			return nil, err
		}
		out = append(out, it)
	}
	return out, rows.Err()
}

type paymentMemberCols struct {
	userID   sql.NullInt64
	creditID sql.NullInt64
	name     sql.NullString
	tel      sql.NullString
	email    sql.NullString
}

func paymentMemberEmpty(in PickingPaymentSaveInput) bool {
	if in.MemberUserID != nil && *in.MemberUserID > 0 {
		return false
	}
	if in.MemberSettingCreditID != nil && *in.MemberSettingCreditID > 0 {
		return false
	}
	for _, s := range []*string{in.MemberName, in.MemberTel, in.MemberEmail} {
		if s != nil && strings.TrimSpace(*s) != "" {
			return false
		}
	}
	return true
}

func paymentMemberFromInput(in PickingPaymentSaveInput) paymentMemberCols {
	var out paymentMemberCols
	if in.MemberUserID != nil && *in.MemberUserID > 0 {
		out.userID = sql.NullInt64{Int64: *in.MemberUserID, Valid: true}
	}
	if in.MemberSettingCreditID != nil && *in.MemberSettingCreditID > 0 {
		out.creditID = sql.NullInt64{Int64: *in.MemberSettingCreditID, Valid: true}
	}
	if in.MemberName != nil {
		out.name = sql.NullString{String: strings.TrimSpace(*in.MemberName), Valid: strings.TrimSpace(*in.MemberName) != ""}
	}
	if in.MemberTel != nil {
		out.tel = sql.NullString{String: strings.TrimSpace(*in.MemberTel), Valid: strings.TrimSpace(*in.MemberTel) != ""}
	}
	if in.MemberEmail != nil {
		out.email = sql.NullString{String: strings.TrimSpace(*in.MemberEmail), Valid: strings.TrimSpace(*in.MemberEmail) != ""}
	}
	return out
}

func loadOrderListMemberTx(ctx context.Context, tx *sql.Tx, orderListID int64) (paymentMemberCols, error) {
	var out paymentMemberCols
	var name, tel, email sql.NullString
	err := tx.QueryRowContext(ctx, `
SELECT member_user_id, member_setting_credit_id, member_name, member_tel, member_email
FROM order_list WHERE id = $1 AND deleted_at IS NULL`, orderListID).Scan(
		&out.userID, &out.creditID, &name, &tel, &email,
	)
	if err != nil {
		return out, err
	}
	out.name = name
	out.tel = tel
	out.email = email
	return out, nil
}

func resolvePaymentMemberTx(ctx context.Context, tx *sql.Tx, orderListID, paymentID int64, in PickingPaymentSaveInput) (paymentMemberCols, error) {
	if !paymentMemberEmpty(in) {
		return paymentMemberFromInput(in), nil
	}
	if paymentID > 0 {
		var out paymentMemberCols
		err := tx.QueryRowContext(ctx, `
SELECT member_user_id, member_setting_credit_id, member_name, member_tel, member_email
FROM order_payment WHERE id = $1 AND order_list_id = $2 AND deleted_at IS NULL`,
			paymentID, orderListID).Scan(&out.userID, &out.creditID, &out.name, &out.tel, &out.email)
		return out, err
	}
	return loadOrderListMemberTx(ctx, tx, orderListID)
}

func validatePickingPaymentInput(in PickingPaymentSaveInput) error {
	if in.PaymentCategory != "credit" && in.PaymentCategory != "payment" {
		return fmt.Errorf("%w: invalid payment_category", ErrValidation)
	}
	for _, v := range []float64{in.VatRate, in.Discount, in.SpecialDiscount, in.TotalPrice} {
		if v < 0 {
			return fmt.Errorf("%w: money must not be negative", ErrValidation)
		}
	}
	for _, m := range in.Methods {
		if m.SettingPaymentMethodID < 1 {
			return fmt.Errorf("%w: invalid setting_payment_method_id", ErrValidation)
		}
		if m.Amount < 0 {
			return fmt.Errorf("%w: method amount must not be negative", ErrValidation)
		}
	}
	// v1 only snapshotted priced lines onto a loan or a settled payment; an unpaid payment draft has no
	// agreed goods yet.
	if in.Items != nil && in.PaymentCategory == "payment" && !in.IsPaid && len(*in.Items) > 0 {
		return fmt.Errorf("%w: items require a credit note or a settled payment", ErrValidation)
	}
	if in.Items != nil {
		for _, it := range *in.Items {
			if it.OrderListItemID < 1 {
				return fmt.Errorf("%w: invalid order_list_item_id", ErrValidation)
			}
			if it.Amount < 0 || it.PricePerUnit < 0 || it.Discount < 0 || it.TotalPrice < 0 {
				return fmt.Errorf("%w: item money must not be negative", ErrValidation)
			}
		}
	}
	return nil
}

// SavePayment creates or updates the payment document of one slip. paymentID 0 creates; v1's extra-pay
// round always creates, which is why the caller decides instead of this method guessing by category.
func (r *PickingRepository) SavePayment(ctx context.Context, orderListID, paymentID int64, in PickingPaymentSaveInput, actorID int64) (PickingPaymentDetail, error) {
	var zero PickingPaymentDetail
	if err := validatePickingPaymentInput(in); err != nil {
		return zero, err
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return zero, err
	}
	defer tx.Rollback() //nolint:errcheck

	var exists bool
	if err := tx.QueryRowContext(ctx, `
SELECT EXISTS (SELECT 1 FROM order_list WHERE id = $1 AND deleted_at IS NULL)`, orderListID).Scan(&exists); err != nil {
		return zero, err
	}
	if !exists {
		return zero, ErrNotFound
	}
	if err := assertSalePaymentMethodsTx(ctx, tx, in.Methods); err != nil {
		return zero, err
	}
	orderedAt := time.Now()
	if in.OrderedAt != nil {
		orderedAt = *in.OrderedAt
	}
	var paid float64
	for _, m := range in.Methods {
		if m.Amount > 0 {
			paid += m.Amount
		}
	}
	member, err := resolvePaymentMemberTx(ctx, tx, orderListID, paymentID, in)
	if err != nil {
		return zero, err
	}
	if paymentID > 0 {
		var curCategory string
		err := tx.QueryRowContext(ctx, `
SELECT payment_category::text FROM order_payment
WHERE id = $1 AND order_list_id = $2 AND deleted_at IS NULL FOR UPDATE`, paymentID, orderListID).Scan(&curCategory)
		if errors.Is(err, sql.ErrNoRows) {
			return zero, ErrNotFound
		}
		if err != nil {
			return zero, err
		}
		if _, err := tx.ExecContext(ctx, `
UPDATE order_payment SET
  payment_category = $2::order_payment_category, ordered_at = $3, vat_rate = $4, discount = $5,
  special_discount = $6, total_price = $7, amount_paid = $8, is_paid = $9,
  credit_approved_by = COALESCE($10, credit_approved_by),
  discount_approved_by = COALESCE($11, discount_approved_by),
  member_user_id = $12, member_setting_credit_id = $13, member_name = $14, member_tel = $15, member_email = $16,
  updated_by = $17, updated_at = NOW()
WHERE id = $1`, paymentID, in.PaymentCategory, orderedAt, in.VatRate, in.Discount,
			in.SpecialDiscount, in.TotalPrice, paid, in.IsPaid,
			in.CreditApprovedBy, in.DiscountApprovedBy,
			member.userID, member.creditID, member.name, member.tel, member.email,
			nullActorID(actorID)); err != nil {
			return zero, err
		}
		// The document series follows the category, so a loan turned receipt gets a fresh number.
		if curCategory != in.PaymentCategory {
			sku, err := r.code.NextCode(ctx, tx, paymentCodeKey(in.PaymentCategory), time.Now())
			if err != nil {
				return zero, err
			}
			if _, err := tx.ExecContext(ctx, `UPDATE order_payment SET sku = $2 WHERE id = $1`, paymentID, sku); err != nil {
				return zero, err
			}
		}
	} else {
		sku, err := r.code.NextCode(ctx, tx, paymentCodeKey(in.PaymentCategory), time.Now())
		if err != nil {
			return zero, err
		}
		if err := tx.QueryRowContext(ctx, `
INSERT INTO order_payment (
  order_list_id, sku, payment_category, ordered_at, vat_rate, discount, special_discount,
  total_price, amount_paid, is_paid, credit_approved_by, discount_approved_by,
  member_user_id, member_setting_credit_id, member_name, member_tel, member_email,
  created_by, updated_by
) VALUES ($1, $2, $3::order_payment_category, $4, $5, $6, $7, $8, $9, $10, $11, $12,
  $13, $14, $15, $16, $17, $18, $18)
RETURNING id`, orderListID, sku, in.PaymentCategory, orderedAt, in.VatRate, in.Discount,
			in.SpecialDiscount, in.TotalPrice, paid, in.IsPaid,
			in.CreditApprovedBy, in.DiscountApprovedBy,
			member.userID, member.creditID, member.name, member.tel, member.email,
			nullActorID(actorID)).Scan(&paymentID); err != nil {
			return zero, err
		}
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE order_payment_method SET deleted_at = NOW(), updated_at = NOW()
WHERE order_payment_id = $1 AND deleted_at IS NULL`, paymentID); err != nil {
		return zero, err
	}
	for _, m := range in.Methods {
		if m.Amount <= 0 {
			continue
		}
		if _, err := tx.ExecContext(ctx, `
INSERT INTO order_payment_method (order_payment_id, setting_payment_method_id, amount, created_by, updated_by)
VALUES ($1, $2, $3, $4, $4)`, paymentID, m.SettingPaymentMethodID, m.Amount, nullActorID(actorID)); err != nil {
			return zero, err
		}
	}
	if in.Items != nil {
		if err := replacePaymentItemsTx(ctx, tx, paymentID, orderListID, *in.Items, actorID); err != nil {
			return zero, err
		}
	}
	if err := tx.Commit(); err != nil {
		return zero, err
	}
	payments, err := r.Payments(ctx, orderListID)
	if err != nil {
		return zero, err
	}
	for _, p := range payments.Items {
		if p.ID == paymentID {
			return p, nil
		}
	}
	return zero, ErrNotFound
}

// assertSalePaymentMethodsTx keeps a caller from settling through a purchase-only or retired method.
func assertSalePaymentMethodsTx(ctx context.Context, tx *sql.Tx, methods []PickingPaymentMethodInput) error {
	for _, m := range methods {
		if m.Amount <= 0 {
			continue
		}
		var ok bool
		if err := tx.QueryRowContext(ctx, `
SELECT EXISTS (
  SELECT 1 FROM setting_payment_method
  WHERE id = $1 AND deleted_at IS NULL AND is_active = TRUE AND is_sale = TRUE
)`, m.SettingPaymentMethodID).Scan(&ok); err != nil {
			return err
		}
		if !ok {
			return fmt.Errorf("%w: payment method not available for sales", ErrValidation)
		}
	}
	return nil
}

// replacePaymentItemsTx rewrites the priced snapshot of the document. Lines must belong to the slip's
// own family, so one order cannot bill another's goods.
func replacePaymentItemsTx(ctx context.Context, tx *sql.Tx, payID, orderListID int64, items []PickingPaymentItemInput, actorID int64) error {
	if _, err := tx.ExecContext(ctx, `
UPDATE order_payment_item SET deleted_at = NOW(), updated_at = NOW(), updated_by = $2
WHERE order_payment_id = $1 AND deleted_at IS NULL`, payID, nullActorID(actorID)); err != nil {
		return err
	}
	for _, it := range items {
		var vatRate float64
		err := tx.QueryRowContext(ctx, `
SELECT i.vat_rate::float8 FROM order_list_item i
INNER JOIN order_list d ON d.id = i.order_list_id AND d.deleted_at IS NULL
WHERE i.id = $1 AND i.deleted_at IS NULL
  AND (i.order_list_id = $2 OR d.parent_id = $2
       OR d.id = (SELECT parent_id FROM order_list WHERE id = $2)
       OR d.parent_id = (SELECT parent_id FROM order_list WHERE id = $2))`, it.OrderListItemID, orderListID).Scan(&vatRate)
		if errors.Is(err, sql.ErrNoRows) {
			return fmt.Errorf("%w: order line not in this order family", ErrValidation)
		}
		if err != nil {
			return err
		}
		total := it.TotalPrice
		if total == 0 {
			total = lineTotal(it.Amount, it.PricePerUnit, it.Discount)
		}
		if _, err := tx.ExecContext(ctx, `
INSERT INTO order_payment_item (
  order_payment_id, order_list_item_id, amount, vat_rate, price_per_unit, discount, total_price, created_by, updated_by
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
ON CONFLICT (order_payment_id, order_list_item_id) DO UPDATE SET
  amount = EXCLUDED.amount, vat_rate = EXCLUDED.vat_rate, price_per_unit = EXCLUDED.price_per_unit,
  discount = EXCLUDED.discount, total_price = EXCLUDED.total_price,
  deleted_at = NULL, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
			payID, it.OrderListItemID, it.Amount, vatRate, it.PricePerUnit, it.Discount, total, nullActorID(actorID)); err != nil {
			return err
		}
	}
	return nil
}

// VerifyApprovalCode checks an approver PIN. kind "credit" gates orders past the member's credit limit
// (superadmin only, as in v1's verify-superadmin); kind "discount" gates the one-off special discount.
func (r *PickingRepository) VerifyApprovalCode(ctx context.Context, kind, code string) (int64, error) {
	code = strings.TrimSpace(code)
	if code == "" {
		return 0, ErrUnauthorized
	}
	query := `
SELECT id, password_discount_hash FROM admin_user
WHERE deleted_at IS NULL AND status = 'active'
  AND password_discount_hash IS NOT NULL AND password_discount_hash <> ''`
	if kind == "credit" {
		query = `
SELECT id, password_credit_hash FROM admin_user
WHERE deleted_at IS NULL AND status = 'active' AND type = 'superadmin'
  AND password_credit_hash IS NOT NULL AND password_credit_hash <> ''`
	}
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return 0, err
	}
	defer rows.Close()
	for rows.Next() {
		var id int64
		var hash string
		if err := rows.Scan(&id, &hash); err != nil {
			return 0, err
		}
		if pkgauth.CheckPassword(hash, code) {
			return id, nil
		}
	}
	if err := rows.Err(); err != nil {
		return 0, err
	}
	return 0, ErrUnauthorized
}
