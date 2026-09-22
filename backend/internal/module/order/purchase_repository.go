package order

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/lMikadal/warehouse/backend/internal/module/system"
)

// PurchaseRepository backs คำสั่งซื้อ on purchase_order*.
type PurchaseRepository struct {
	db   *sql.DB
	code *system.CodePrefixRepository
}

func NewPurchaseRepository(db *sql.DB) *PurchaseRepository {
	return &PurchaseRepository{db: db, code: system.NewCodePrefixRepository(db)}
}

var purchaseStatuses = map[string]struct{}{
	"draft": {}, "pending": {}, "paying": {}, "completed": {},
	"receive_partial": {}, "receive_completed": {}, "rejected": {}, "cancelled": {},
}

var purchaseItemStatuses = map[string]struct{}{
	"pending": {}, "approved": {}, "rejected": {},
	"receive_approved": {}, "receive_rejected": {},
}

var purchaseVatTypes = map[string]struct{}{"include": {}, "exclude": {}, "none": {}}

// purchaseSortColumns whitelists the sortable columns the v1 list table offered.
var purchaseSortColumns = map[string]string{
	"created_at":  "po.created_at",
	"updated_at":  "po.updated_at",
	"sku":         "po.sku",
	"status":      "po.status",
	"total_price": "po.total_price",
}

// purchaseLocked freezes header/line edits once the order leaves the draft/pending stage.
func purchaseLocked(status string) bool {
	switch status {
	case "draft", "pending":
		return false
	default:
		return true
	}
}

func roundMoney(v float64) float64 {
	if math.IsNaN(v) || math.IsInf(v, 0) {
		return 0
	}
	return math.Round(v*100) / 100
}

// computePurchaseTotals mirrors v1 refreshPurchaseTotals: line discounts come off the
// VAT-inclusive subtotal, then the order discount, then VAT is applied to what remains.
func computePurchaseTotals(
	lineSubtotal, lineDiscount, orderDiscount, specialDiscount, vatRate float64,
) PurchaseTotals {
	subtotal := roundMoney(lineSubtotal)
	discounts := roundMoney(math.Max(0, lineDiscount) + math.Max(0, orderDiscount) + math.Max(0, specialDiscount))
	if discounts > subtotal {
		discounts = subtotal
	}
	afterDiscount := roundMoney(subtotal - discounts)
	rate := math.Min(100, math.Max(0, vatRate)) / 100
	vat := roundMoney(afterDiscount * rate)
	return PurchaseTotals{
		TotalPrice:         subtotal,
		TotalDiscount:      discounts,
		TotalPriceDiscount: afterDiscount,
		TotalVat:           vat,
		TotalPriceVat:      roundMoney(subtotal + roundMoney(subtotal*rate)),
		TotalGrandPrice:    roundMoney(afterDiscount + vat),
	}
}

const purchaseListFrom = `
FROM purchase_order po
LEFT JOIN supplier_user su ON su.id = po.supplier_user_id
LEFT JOIN supplier_information si ON si.supplier_user_id = su.id AND si.type = 'contact'
LEFT JOIN purchase_request pr ON pr.id = po.purchase_request_id
LEFT JOIN admin_user au ON au.id = po.created_by
LEFT JOIN admin_user rau ON rau.id = pr.created_by
`

// purchaseLineSubtotal reads the stored subtotal snapshot rather than re-summing the lines: v1
// refreshed the money columns on line edits but deliberately left them alone on unit conversion,
// where a split line takes qty off its parent at price 0. Re-summing would shrink the order total.
const purchaseLineSubtotal = `po.total_price::float8`

const purchaseLineDiscountNum = `COALESCE((SELECT SUM(i.discount) FROM purchase_order_item i
  WHERE i.purchase_order_id = po.id AND i.deleted_at IS NULL), 0)`

const purchaseLineDiscount = purchaseLineDiscountNum + `::float8`

// purchaseTotalQty is v1 total_piece: the number of live, non-rejected lines (not a qty sum).
const purchaseTotalQty = `(SELECT COUNT(*) FROM purchase_order_item i
  WHERE i.purchase_order_id = po.id AND i.deleted_at IS NULL AND i.status <> 'rejected')`

func purchaseItemStatusCount(status string) string {
	return `(SELECT COUNT(*) FROM purchase_order_item i
	  WHERE i.purchase_order_id = po.id AND i.deleted_at IS NULL AND i.status = '` + status + `')`
}

const purchaseItemRejectCount = `(SELECT COUNT(*) FROM purchase_order_item_reject rj
  INNER JOIN purchase_order_item i ON i.id = rj.purchase_order_item_id AND i.deleted_at IS NULL
  WHERE i.purchase_order_id = po.id)`

const purchaseClaimRejectCount = `(SELECT COUNT(*) FROM purchase_order_item_reject rj
  INNER JOIN purchase_order_item i ON i.id = rj.purchase_order_item_id AND i.deleted_at IS NULL
  WHERE i.purchase_order_id = po.id AND rj.resolution = 'claim')`

// purchaseGrandPriceExpr mirrors computePurchaseTotals in SQL so the amount-range filter and the
// KPI sums agree with what the list rows show. Keep the two in sync.
const purchaseGrandPriceExpr = `
ROUND((po.total_price - LEAST(po.total_price, ` + purchaseLineDiscountNum + ` + GREATEST(0, po.discount) + GREATEST(0, po.special_discount)))
  * (1 + LEAST(100, GREATEST(0, po.vat_rate)) / 100), 2)`

const purchaseAfterDiscountExpr = `
ROUND(po.total_price - LEAST(po.total_price, ` + purchaseLineDiscountNum + ` + GREATEST(0, po.discount) + GREATEST(0, po.special_discount)), 2)`

// purchaseOrderedStatuses is the v1 "สั่งซื้อแล้ว" chip: one filter value covering three statuses.
const PurchaseOrderedStatusFilter = "ordered"

var purchaseOrderedStatuses = []string{"completed", "receive_partial", "receive_completed"}

func purchaseListWhere(q PurchaseListQuery) (string, []any) {
	where := "po.deleted_at IS NULL"
	args := []any{}
	if q.Search != "" {
		args = append(args, "%"+q.Search+"%")
		n := len(args)
		where += fmt.Sprintf(" AND (po.sku ILIKE $%d OR po.sku_draft ILIKE $%d OR pr.sku ILIKE $%d)", n, n, n)
	}
	if q.Status == PurchaseOrderedStatusFilter {
		args = append(args, "{"+strings.Join(purchaseOrderedStatuses, ",")+"}")
		where += fmt.Sprintf(" AND po.status::text = ANY($%d::text[])", len(args))
	} else if q.Status != "" {
		args = append(args, q.Status)
		where += fmt.Sprintf(" AND po.status = $%d::purchase_order_status", len(args))
	} else if len(q.StatusIn) > 0 {
		args = append(args, "{"+strings.Join(q.StatusIn, ",")+"}")
		where += fmt.Sprintf(" AND po.status::text = ANY($%d::text[])", len(args))
	}
	if q.DateFrom != "" {
		args = append(args, q.DateFrom)
		where += fmt.Sprintf(" AND po.created_at >= ($%d || ' 00:00:00')::timestamp AT TIME ZONE 'Asia/Bangkok'", len(args))
	}
	if q.DateTo != "" {
		args = append(args, q.DateTo)
		where += fmt.Sprintf(" AND po.created_at < (($%d || ' 00:00:00')::timestamp AT TIME ZONE 'Asia/Bangkok') + INTERVAL '1 day'", len(args))
	}
	if q.CreatedBy != nil {
		args = append(args, *q.CreatedBy)
		where += fmt.Sprintf(" AND po.created_by = $%d", len(args))
	}
	if q.SupplierID != nil {
		args = append(args, *q.SupplierID)
		where += fmt.Sprintf(" AND po.supplier_user_id = $%d", len(args))
	}
	if q.RequestID != nil {
		args = append(args, *q.RequestID)
		where += fmt.Sprintf(" AND po.purchase_request_id = $%d", len(args))
	}
	if q.HasReceiveReject {
		where += ` AND EXISTS (
  SELECT 1 FROM purchase_order_item ri
  WHERE ri.purchase_order_id = po.id AND ri.deleted_at IS NULL AND ri.status = 'receive_rejected')`
	}
	if q.GrandTotalMin != nil {
		args = append(args, *q.GrandTotalMin)
		where += fmt.Sprintf(" AND %s >= $%d", purchaseGrandPriceExpr, len(args))
	}
	if q.GrandTotalMax != nil {
		args = append(args, *q.GrandTotalMax)
		where += fmt.Sprintf(" AND %s <= $%d", purchaseGrandPriceExpr, len(args))
	}
	return where, args
}

func purchaseOrderBy(q PurchaseListQuery) string {
	col, ok := purchaseSortColumns[strings.TrimSpace(q.SortBy)]
	if !ok {
		col = "po.created_at"
	}
	dir := "DESC"
	if strings.EqualFold(strings.TrimSpace(q.SortOrder), "asc") {
		dir = "ASC"
	}
	return fmt.Sprintf("ORDER BY %s %s, po.id %s", col, dir, dir)
}

func (r *PurchaseRepository) List(ctx context.Context, q PurchaseListQuery) (PurchaseListResponse, error) {
	where, args := purchaseListWhere(q)
	var total int
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) "+purchaseListFrom+" WHERE "+where, args...).Scan(&total); err != nil {
		return PurchaseListResponse{}, err
	}
	offset := (q.Page - 1) * q.Limit
	args = append(args, q.Limit, offset)
	query := fmt.Sprintf(`
SELECT po.id, po.sku, po.sku_draft, po.status::text, po.is_waiting,
  po.supplier_user_id, si.name, su.sku,
  po.purchase_request_id, pr.sku, rau.username,
  %s, %s, %s, %s,
  po.vat_type::text, po.vat_rate::float8, po.discount::float8, po.special_discount::float8,
  %s, %s,
  po.created_at, po.updated_at, au.username
%s WHERE %s
%s LIMIT $%d OFFSET $%d`,
		purchaseTotalQty, purchaseItemStatusCount("approved"),
		purchaseItemRejectCount, purchaseClaimRejectCount,
		purchaseLineDiscount, purchaseLineSubtotal,
		purchaseListFrom, where, purchaseOrderBy(q), len(args)-1, len(args))
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return PurchaseListResponse{}, err
	}
	defer rows.Close()
	items := []PurchaseListItem{}
	for rows.Next() {
		var it PurchaseListItem
		var sku, skuDraft, supplierName, supplierSKU, requestSKU, requestCreator, createdBy sql.NullString
		var supplierID, requestID sql.NullInt64
		var discount, specialDiscount, lineDiscount, lineSubtotal float64
		if err := rows.Scan(&it.ID, &sku, &skuDraft, &it.Status, &it.IsWaiting,
			&supplierID, &supplierName, &supplierSKU,
			&requestID, &requestSKU, &requestCreator,
			&it.TotalQty, &it.ApprovedItemCount, &it.ItemRejectCount, &it.ClaimRejectCount,
			&it.VatType, &it.VatRate, &discount, &specialDiscount,
			&lineDiscount, &lineSubtotal,
			&it.CreatedAt, &it.UpdatedAt, &createdBy); err != nil {
			return PurchaseListResponse{}, err
		}
		assignNullStr(&it.SKU, sku)
		assignNullStr(&it.SKUDraft, skuDraft)
		assignNullStr(&it.SupplierName, supplierName)
		assignNullStr(&it.SupplierSKU, supplierSKU)
		assignNullStr(&it.PurchaseRequestSKU, requestSKU)
		assignNullStr(&it.RequestCreatedByName, requestCreator)
		assignNullStr(&it.CreatedByName, createdBy)
		assignNullInt(&it.SupplierUserID, supplierID)
		assignNullInt(&it.PurchaseRequestID, requestID)
		it.PurchaseTotals = computePurchaseTotals(lineSubtotal, lineDiscount, discount, specialDiscount, it.VatRate)
		items = append(items, it)
	}
	return PurchaseListResponse{Items: items, Total: total, Page: q.Page, Limit: q.Limit}, rows.Err()
}

func (r *PurchaseRepository) Count(ctx context.Context, q PurchaseListQuery) (PurchaseCountResponse, error) {
	q.Status = ""
	where, args := purchaseListWhere(q)
	resp := PurchaseCountResponse{ByStatus: map[string]int64{}, ByItemStatus: map[string]int64{}}

	rows, err := r.db.QueryContext(ctx,
		"SELECT po.status::text, COUNT(*) "+purchaseListFrom+" WHERE "+where+" GROUP BY po.status", args...)
	if err != nil {
		return resp, err
	}
	for rows.Next() {
		var st string
		var n int64
		if err := rows.Scan(&st, &n); err != nil {
			rows.Close()
			return resp, err
		}
		resp.ByStatus[st] = n
		resp.Count += n
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return resp, err
	}

	// Cancelled/rejected orders are excluded from the money KPIs: they will never be paid.
	if err := r.db.QueryRowContext(ctx, fmt.Sprintf(`
SELECT COALESCE(SUM(%[1]s), 0)::float8,
  COALESCE(SUM(%[2]s - %[1]s), 0)::float8,
  COALESCE(SUM(GREATEST(0, %[2]s - COALESCE((
    SELECT SUM(p.total_price) FROM purchase_order_payment p
    WHERE p.purchase_order_id = po.id AND p.deleted_at IS NULL
  ), 0))), 0)::float8
%[3]s WHERE %[4]s AND po.status NOT IN ('cancelled', 'rejected')`,
		purchaseAfterDiscountExpr, purchaseGrandPriceExpr, purchaseListFrom, where), args...,
	).Scan(&resp.SumTotalExVat, &resp.SumTotalVat, &resp.SumOutstandingDebt); err != nil {
		return resp, err
	}

	itemRows, err := r.db.QueryContext(ctx, `
SELECT i.status::text, COUNT(*)
FROM purchase_order_item i
INNER JOIN purchase_order po ON po.id = i.purchase_order_id
LEFT JOIN purchase_request pr ON pr.id = po.purchase_request_id
WHERE i.deleted_at IS NULL AND `+where+`
GROUP BY i.status`, args...)
	if err != nil {
		return resp, err
	}
	defer itemRows.Close()
	for itemRows.Next() {
		var st string
		var n int64
		if err := itemRows.Scan(&st, &n); err != nil {
			return resp, err
		}
		resp.ByItemStatus[st] = n
	}
	return resp, itemRows.Err()
}

func (r *PurchaseRepository) GetByID(ctx context.Context, id int64) (*PurchaseDetail, error) {
	var d PurchaseDetail
	var sku, skuDraft, supplierName, requestSKU, requestCreator, createdBy sql.NullString
	var supplierID, requestID sql.NullInt64
	var lineSubtotal float64
	err := r.db.QueryRowContext(ctx, `
SELECT po.id, po.sku, po.sku_draft, po.status::text, po.is_waiting,
  po.supplier_user_id, si.name, po.purchase_request_id, pr.sku, rau.username,
  po.ordered_at, po.vat_type::text, po.vat_rate::float8,
  po.discount::float8, po.special_discount::float8, po.total_price::float8, po.note,
  po.created_at, po.updated_at, au.username
FROM purchase_order po
LEFT JOIN supplier_user su ON su.id = po.supplier_user_id
LEFT JOIN supplier_information si ON si.supplier_user_id = su.id AND si.type = 'contact'
LEFT JOIN purchase_request pr ON pr.id = po.purchase_request_id
LEFT JOIN admin_user au ON au.id = po.created_by
LEFT JOIN admin_user rau ON rau.id = pr.created_by
WHERE po.id = $1 AND po.deleted_at IS NULL`, id).Scan(
		&d.ID, &sku, &skuDraft, &d.Status, &d.IsWaiting,
		&supplierID, &supplierName, &requestID, &requestSKU, &requestCreator,
		&d.OrderedAt, &d.VatType, &d.VatRate, &d.Discount, &d.SpecialDiscount, &lineSubtotal, &d.Note,
		&d.CreatedAt, &d.UpdatedAt, &createdBy)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	assignNullStr(&d.SKU, sku)
	assignNullStr(&d.SKUDraft, skuDraft)
	assignNullStr(&d.SupplierName, supplierName)
	assignNullStr(&d.PurchaseRequestSKU, requestSKU)
	assignNullStr(&d.RequestCreatedByName, requestCreator)
	assignNullStr(&d.CreatedByName, createdBy)
	assignNullInt(&d.SupplierUserID, supplierID)
	assignNullInt(&d.PurchaseRequestID, requestID)

	items, err := r.listItems(ctx, id)
	if err != nil {
		return nil, err
	}
	d.Items = items
	var lineDiscount float64
	for _, it := range items {
		if it.Status != "rejected" {
			d.TotalQty++ // v1 total_piece counts live, non-rejected lines
		}
		lineDiscount += it.Discount
	}
	d.PurchaseTotals = computePurchaseTotals(lineSubtotal, lineDiscount, d.Discount, d.SpecialDiscount, d.VatRate)

	if d.Payments, err = r.ListPayments(ctx, id); err != nil {
		return nil, err
	}
	if d.Files, err = r.listOrderFiles(ctx, id); err != nil {
		return nil, err
	}
	return &d, nil
}

func (r *PurchaseRepository) listItems(ctx context.Context, orderID int64) ([]PurchaseItemDetail, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT i.id, i.purchase_order_id, i.purchase_request_item_id, i.parent_id,
  i.status::text, i.type::text, i.product_item_id, pi.sku, pil.name,
  pi.barcode, pi.qrcode, i.name,
  i.product_attribute_brand_id, bl.name,
  i.product_attribute_model_id, ml.name,
  i.product_attribute_engine_id, el.name,
  i.identification_number, i.qty, i.free_gift, i.unit::text, i.old_qty, i.old_unit::text,
  i.price_per_unit::float8, i.vat_rate::float8, i.discount::float8, i.note,
  COALESCE((SELECT SUM(s.quantity) FROM product_item_stock s
    WHERE s.purchase_order_item_id = i.id AND s.deleted_at IS NULL), 0)::float8,
  i.created_at, i.updated_at
FROM purchase_order_item i
LEFT JOIN product_item pi ON pi.id = i.product_item_id
LEFT JOIN product_item_language pil ON pil.product_item_id = pi.id AND pil.locale = 'th'
LEFT JOIN product_attribute_language bl ON bl.product_attribute_id = i.product_attribute_brand_id AND bl.locale = 'th'
LEFT JOIN product_attribute_language ml ON ml.product_attribute_id = i.product_attribute_model_id AND ml.locale = 'th'
LEFT JOIN product_attribute_language el ON el.product_attribute_id = i.product_attribute_engine_id AND el.locale = 'th'
WHERE i.purchase_order_id = $1 AND i.deleted_at IS NULL
ORDER BY i.id`, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []PurchaseItemDetail{}
	ids := []int64{}
	byID := map[int64]*PurchaseItemDetail{}
	for rows.Next() {
		var it PurchaseItemDetail
		var requestItemID, parentID, productItemID, brandID, modelID, engineID, oldQty sql.NullInt64
		var productSKU, productName, barcode, qrcode, name, brandName, modelName, engineName, oldUnit sql.NullString
		if err := rows.Scan(&it.ID, &it.PurchaseOrderID, &requestItemID, &parentID,
			&it.Status, &it.Type, &productItemID, &productSKU, &productName,
			&barcode, &qrcode, &name,
			&brandID, &brandName, &modelID, &modelName, &engineID, &engineName,
			&it.IdentificationNumber, &it.Qty, &it.FreeGift, &it.Unit, &oldQty, &oldUnit,
			&it.PricePerUnit, &it.VatRate, &it.Discount, &it.Note,
			&it.ReceivedQty, &it.CreatedAt, &it.UpdatedAt); err != nil {
			return nil, err
		}
		assignNullInt(&it.OldQty, oldQty)
		assignNullStr(&it.OldUnit, oldUnit)
		assignNullInt(&it.PurchaseRequestItemID, requestItemID)
		assignNullInt(&it.ParentID, parentID)
		assignNullInt(&it.ProductItemID, productItemID)
		assignNullInt(&it.ProductAttributeBrandID, brandID)
		assignNullInt(&it.ProductAttributeModelID, modelID)
		assignNullInt(&it.ProductAttributeEngineID, engineID)
		assignNullStr(&it.ProductItemSKU, productSKU)
		assignNullStr(&it.ProductItemName, productName)
		assignNullStr(&it.CodeBarcode, barcode)
		assignNullStr(&it.CodeQrcode, qrcode)
		assignNullStr(&it.Name, name)
		assignNullStr(&it.BrandName, brandName)
		assignNullStr(&it.ModelName, modelName)
		assignNullStr(&it.EngineName, engineName)
		it.TotalPrice = roundMoney(float64(it.Qty)*it.PricePerUnit - it.Discount)
		it.TotalPriceVat = roundMoney(it.TotalPrice * (1 + math.Min(100, math.Max(0, it.VatRate))/100))
		it.Files = []PurchaseItemFile{}
		items = append(items, it)
		ids = append(ids, it.ID)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	for i := range items {
		byID[items[i].ID] = &items[i]
	}
	if len(ids) > 0 {
		if err := attachPurchaseItemFiles(ctx, r.db, byID, ids); err != nil {
			return nil, err
		}
	}
	return items, nil
}

func attachPurchaseItemFiles(ctx context.Context, db *sql.DB, byID map[int64]*PurchaseItemDetail, ids []int64) error {
	rows, err := db.QueryContext(ctx, `
SELECT f.id, f.purchase_order_item_id, f.system_file_id, f.sort_order
FROM purchase_order_item_file f
WHERE f.purchase_order_item_id = ANY($1) AND f.deleted_at IS NULL
ORDER BY f.sort_order, f.id`, int64Array(ids))
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var f PurchaseItemFile
		var itemID int64
		if err := rows.Scan(&f.ID, &itemID, &f.SystemFileID, &f.SortOrder); err != nil {
			return err
		}
		if it := byID[itemID]; it != nil {
			it.Files = append(it.Files, f)
		}
	}
	return rows.Err()
}

func (r *PurchaseRepository) listOrderFiles(ctx context.Context, orderID int64) ([]PurchaseItemFile, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT id, system_file_id, sort_order
FROM purchase_order_file
WHERE purchase_order_id = $1 AND deleted_at IS NULL
ORDER BY sort_order, id`, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	files := []PurchaseItemFile{}
	for rows.Next() {
		var f PurchaseItemFile
		if err := rows.Scan(&f.ID, &f.SystemFileID, &f.SortOrder); err != nil {
			return nil, err
		}
		files = append(files, f)
	}
	return files, rows.Err()
}

func (r *PurchaseRepository) ListPayments(ctx context.Context, orderID int64) ([]PurchasePayment, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT p.id, p.purchase_order_id, p.setting_payment_method_id, pml.name,
  p.supplier_bank_id, sb.name, p.vat_rate::float8, p.discount::float8, p.total_price::float8,
  p.note, p.system_file_id, p.credit_term, p.paid_at, p.created_at, au.username
FROM purchase_order_payment p
LEFT JOIN setting_payment_method_language pml
  ON pml.setting_payment_method_id = p.setting_payment_method_id AND pml.locale = 'th'
LEFT JOIN supplier_bank sb ON sb.id = p.supplier_bank_id
LEFT JOIN admin_user au ON au.id = p.created_by
WHERE p.purchase_order_id = $1 AND p.deleted_at IS NULL
ORDER BY p.created_at, p.id`, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []PurchasePayment{}
	for rows.Next() {
		var p PurchasePayment
		var methodName, bankName, createdBy sql.NullString
		var bankID, fileID sql.NullInt64
		var creditTerm sql.NullInt64
		var paidAt sql.NullTime
		if err := rows.Scan(&p.ID, &p.PurchaseOrderID, &p.SettingPaymentMethodID, &methodName,
			&bankID, &bankName, &p.VatRate, &p.Discount, &p.TotalPrice,
			&p.Note, &fileID, &creditTerm, &paidAt, &p.CreatedAt, &createdBy); err != nil {
			return nil, err
		}
		assignNullStr(&p.PaymentMethodName, methodName)
		assignNullStr(&p.SupplierBankName, bankName)
		assignNullStr(&p.CreatedByName, createdBy)
		assignNullInt(&p.SupplierBankID, bankID)
		assignNullInt(&p.SystemFileID, fileID)
		if creditTerm.Valid {
			v := int(creditTerm.Int64)
			p.CreditTerm = &v
		}
		if paidAt.Valid {
			p.PaidAt = &paidAt.Time
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func validatePurchaseItem(in PurchaseItemInput) error {
	switch in.Type {
	case "catalog":
		if in.ProductItemID == nil || *in.ProductItemID <= 0 {
			return ErrValidation
		}
	case "custom":
		if in.Name == nil || strings.TrimSpace(*in.Name) == "" {
			return ErrValidation
		}
	default:
		return ErrValidation
	}
	if in.Qty < 1 || in.FreeGift < 0 || in.PricePerUnit < 0 || in.Discount < 0 {
		return ErrValidation
	}
	// v1 blocked a line discount larger than the line amount (order_purchase_items guard).
	if in.Discount > float64(in.Qty)*in.PricePerUnit {
		return ErrValidation
	}
	if in.Unit != "" {
		if _, ok := ticketItemUnits[in.Unit]; !ok {
			return ErrValidation
		}
	}
	return nil
}

func (r *PurchaseRepository) Create(ctx context.Context, in PurchaseSaveInput, actorID int64) (int64, error) {
	if in.Status == "" {
		in.Status = "draft"
	}
	if _, ok := purchaseStatuses[in.Status]; !ok {
		return 0, ErrValidation
	}
	if in.VatType == "" {
		in.VatType = "exclude"
	}
	if _, ok := purchaseVatTypes[in.VatType]; !ok {
		return 0, ErrValidation
	}
	for _, it := range in.Items {
		if err := validatePurchaseItem(it); err != nil {
			return 0, err
		}
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback() //nolint:errcheck

	// v1 numbered the draft PO(T)-… first and only issued the real PO-… on approval.
	draft, err := r.code.NextCode(ctx, tx, "purchase_order_draft", time.Now())
	if err != nil {
		return 0, err
	}
	var sku *string
	if in.Status != "draft" {
		final, err := r.code.NextCode(ctx, tx, "purchase_order", time.Now())
		if err != nil {
			return 0, err
		}
		sku = &final
	}
	orderedAt := time.Now()
	if in.OrderedAt != nil {
		orderedAt = *in.OrderedAt
	}
	isWaiting := in.IsWaiting != nil && *in.IsWaiting
	var id int64
	if err := tx.QueryRowContext(ctx, `
INSERT INTO purchase_order (
  sku, sku_draft, purchase_request_id, supplier_user_id, status, ordered_at,
  vat_type, vat_rate, discount, special_discount, is_waiting, note, created_by, updated_by
) VALUES ($1, $2, $3, $4, $5::purchase_order_status, $6, $7::setting_vat_type, $8, $9, $10, $11, $12, $13, $13)
RETURNING id`,
		sku, draft, in.PurchaseRequestID, in.SupplierUserID, in.Status, orderedAt,
		in.VatType, in.VatRate, in.Discount, in.SpecialDiscount, isWaiting, in.Note,
		nullActorID(actorID)).Scan(&id); err != nil {
		return 0, err
	}
	for _, it := range in.Items {
		if _, err := insertPurchaseItemTx(ctx, tx, id, it, actorID); err != nil {
			return 0, err
		}
	}
	if err := refreshPurchaseSubtotalTx(ctx, tx, id); err != nil {
		return 0, err
	}
	if err := insertPurchaseHistoryTx(ctx, tx, purchaseHistoryRef{OrderID: &id}, nil, &in.Status, actorID); err != nil {
		return 0, err
	}
	return id, tx.Commit()
}

func (r *PurchaseRepository) Update(ctx context.Context, id int64, in PurchaseSaveInput, actorID int64) error {
	for _, it := range in.Items {
		if err := validatePurchaseItem(it); err != nil {
			return err
		}
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck

	cur, err := lockPurchaseTx(ctx, tx, id)
	if err != nil {
		return err
	}
	if purchaseLocked(cur) {
		return ErrValidation
	}
	status := in.Status
	if status == "" {
		status = cur
	}
	if _, ok := purchaseStatuses[status]; !ok {
		return ErrValidation
	}
	vatType := in.VatType
	if vatType == "" {
		vatType = "exclude"
	}
	if _, ok := purchaseVatTypes[vatType]; !ok {
		return ErrValidation
	}
	if err := r.assignPurchaseSkuTx(ctx, tx, id, cur, status); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE purchase_order SET
  status = $2::purchase_order_status,
  supplier_user_id = $3,
  purchase_request_id = $4,
  ordered_at = COALESCE($5, ordered_at),
  vat_type = $6::setting_vat_type,
  vat_rate = $7,
  discount = $8,
  special_discount = $9,
  is_waiting = COALESCE($10, is_waiting),
  note = $11,
  updated_by = $12,
  updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL`,
		id, status, in.SupplierUserID, in.PurchaseRequestID, in.OrderedAt,
		vatType, in.VatRate, in.Discount, in.SpecialDiscount, in.IsWaiting, in.Note,
		nullActorID(actorID)); err != nil {
		return err
	}
	if err := syncPurchaseItemsTx(ctx, tx, id, in.Items, actorID); err != nil {
		return err
	}
	if err := refreshPurchaseSubtotalTx(ctx, tx, id); err != nil {
		return err
	}
	if status != cur {
		if err := insertPurchaseHistoryTx(ctx, tx, purchaseHistoryRef{OrderID: &id}, &cur, &status, actorID); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// refreshPurchaseSubtotalTx re-snapshots purchase_order.total_price from the live lines. Called on
// every line edit, and deliberately NOT on convert/revert unit so splits keep the order total.
func refreshPurchaseSubtotalTx(ctx context.Context, tx *sql.Tx, orderID int64) error {
	_, err := tx.ExecContext(ctx, `
UPDATE purchase_order SET total_price = COALESCE((
  SELECT SUM(i.qty * i.price_per_unit) FROM purchase_order_item i
  WHERE i.purchase_order_id = purchase_order.id AND i.deleted_at IS NULL
), 0)
WHERE id = $1 AND deleted_at IS NULL`, orderID)
	return err
}

func lockPurchaseTx(ctx context.Context, tx *sql.Tx, id int64) (string, error) {
	var status string
	err := tx.QueryRowContext(ctx,
		"SELECT status::text FROM purchase_order WHERE id = $1 AND deleted_at IS NULL FOR UPDATE", id).Scan(&status)
	if errors.Is(err, sql.ErrNoRows) {
		return "", ErrNotFound
	}
	return status, err
}

// assignPurchaseSkuTx issues the real PO number the first time the order leaves draft.
func (r *PurchaseRepository) assignPurchaseSkuTx(ctx context.Context, tx *sql.Tx, id int64, cur, next string) error {
	if cur != "draft" || next == "draft" {
		return nil
	}
	var existing sql.NullString
	if err := tx.QueryRowContext(ctx, "SELECT sku FROM purchase_order WHERE id = $1", id).Scan(&existing); err != nil {
		return err
	}
	if existing.Valid && strings.TrimSpace(existing.String) != "" {
		return nil
	}
	sku, err := r.code.NextCode(ctx, tx, "purchase_order", time.Now())
	if err != nil {
		return err
	}
	_, err = tx.ExecContext(ctx, "UPDATE purchase_order SET sku = $2 WHERE id = $1", id, sku)
	return err
}

func insertPurchaseItemTx(ctx context.Context, tx *sql.Tx, orderID int64, in PurchaseItemInput, actorID int64) (int64, error) {
	unit := in.Unit
	if unit == "" {
		unit = "piece"
	}
	var id int64
	if err := tx.QueryRowContext(ctx, `
INSERT INTO purchase_order_item (
  purchase_order_id, purchase_request_item_id, status, type, product_item_id, name,
  product_attribute_brand_id, product_attribute_model_id, product_attribute_engine_id,
  identification_number, qty, free_gift, unit, price_per_unit, vat_rate, discount,
  total_price, note, created_by, updated_by
) VALUES ($1, $2, 'pending', $3::purchase_request_item_type, $4, $5, $6, $7, $8, $9, $10, $11,
  $12::product_unit, $13, $14, $15, $16, $17, $18, $18)
RETURNING id`,
		orderID, in.PurchaseRequestItemID, in.Type, in.ProductItemID, in.Name,
		in.ProductAttributeBrandID, in.ProductAttributeModelID, in.ProductAttributeEngineID,
		in.IdentificationNumber, in.Qty, in.FreeGift, unit, in.PricePerUnit, in.VatRate, in.Discount,
		roundMoney(float64(in.Qty)*in.PricePerUnit-in.Discount), in.Note,
		nullActorID(actorID)).Scan(&id); err != nil {
		return 0, err
	}
	if err := replacePurchaseItemFilesTx(ctx, tx, id, in.SystemFileIDs, actorID); err != nil {
		return 0, err
	}
	return id, nil
}

func updatePurchaseItemTx(ctx context.Context, tx *sql.Tx, itemID int64, in PurchaseItemInput, actorID int64) error {
	unit := in.Unit
	if unit == "" {
		unit = "piece"
	}
	res, err := tx.ExecContext(ctx, `
UPDATE purchase_order_item SET
  purchase_request_item_id = $2,
  type = $3::purchase_request_item_type,
  product_item_id = $4,
  name = $5,
  product_attribute_brand_id = $6,
  product_attribute_model_id = $7,
  product_attribute_engine_id = $8,
  identification_number = $9,
  qty = $10,
  free_gift = $11,
  unit = $12::product_unit,
  price_per_unit = $13,
  vat_rate = $14,
  discount = $15,
  total_price = $16,
  note = $17,
  updated_by = $18,
  updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL`,
		itemID, in.PurchaseRequestItemID, in.Type, in.ProductItemID, in.Name,
		in.ProductAttributeBrandID, in.ProductAttributeModelID, in.ProductAttributeEngineID,
		in.IdentificationNumber, in.Qty, in.FreeGift, unit, in.PricePerUnit, in.VatRate, in.Discount,
		roundMoney(float64(in.Qty)*in.PricePerUnit-in.Discount), in.Note, nullActorID(actorID))
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return replacePurchaseItemFilesTx(ctx, tx, itemID, in.SystemFileIDs, actorID)
}

func replacePurchaseItemFilesTx(ctx context.Context, tx *sql.Tx, itemID int64, fileIDs []int64, actorID int64) error {
	if _, err := tx.ExecContext(ctx, `
UPDATE purchase_order_item_file SET deleted_at = NOW(), updated_by = $2
WHERE purchase_order_item_id = $1 AND deleted_at IS NULL
  AND ($3::bigint[] IS NULL OR system_file_id <> ALL($3))`,
		itemID, nullActorID(actorID), int64ArrayOrNil(fileIDs)); err != nil {
		return err
	}
	for i, fileID := range fileIDs {
		if _, err := tx.ExecContext(ctx, `
INSERT INTO purchase_order_item_file (purchase_order_item_id, system_file_id, sort_order, created_by, updated_by)
VALUES ($1, $2, $3, $4, $4)
ON CONFLICT (purchase_order_item_id, system_file_id) WHERE deleted_at IS NULL
DO UPDATE SET sort_order = EXCLUDED.sort_order, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
			itemID, fileID, i, nullActorID(actorID)); err != nil {
			return err
		}
	}
	return nil
}

// syncPurchaseItemsTx keeps ids sent back by the client and soft-deletes the rest.
func syncPurchaseItemsTx(ctx context.Context, tx *sql.Tx, orderID int64, items []PurchaseItemInput, actorID int64) error {
	keep := []int64{}
	for _, it := range items {
		if it.ID != nil && *it.ID > 0 {
			keep = append(keep, *it.ID)
		}
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE purchase_order_item SET deleted_at = NOW(), updated_by = $2
WHERE purchase_order_id = $1 AND deleted_at IS NULL
  AND ($3::bigint[] IS NULL OR id <> ALL($3))`,
		orderID, nullActorID(actorID), int64ArrayOrNil(keep)); err != nil {
		return err
	}
	for _, it := range items {
		if it.ID != nil && *it.ID > 0 {
			if err := updatePurchaseItemTx(ctx, tx, *it.ID, it, actorID); err != nil {
				return err
			}
			continue
		}
		if _, err := insertPurchaseItemTx(ctx, tx, orderID, it, actorID); err != nil {
			return err
		}
	}
	return nil
}

func (r *PurchaseRepository) PatchStatus(ctx context.Context, id int64, status string, actorID int64) error {
	if _, ok := purchaseStatuses[status]; !ok {
		return ErrValidation
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck

	cur, err := lockPurchaseTx(ctx, tx, id)
	if err != nil {
		return err
	}
	if cur == status {
		return tx.Commit()
	}
	if err := r.assignPurchaseSkuTx(ctx, tx, id, cur, status); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE purchase_order SET status = $2::purchase_order_status, updated_by = $3, updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL`, id, status, nullActorID(actorID)); err != nil {
		return err
	}
	// Approving the order approves every pending line, the way v1's approve screen did.
	if status == "pending" || status == "paying" || status == "completed" {
		if _, err := tx.ExecContext(ctx, `
UPDATE purchase_order_item SET status = 'approved', updated_by = $2, updated_at = NOW()
WHERE purchase_order_id = $1 AND deleted_at IS NULL AND status = 'pending'`,
			id, nullActorID(actorID)); err != nil {
			return err
		}
	}
	if status == "rejected" || status == "cancelled" {
		if _, err := tx.ExecContext(ctx, `
UPDATE purchase_order_item SET status = 'rejected', updated_by = $2, updated_at = NOW()
WHERE purchase_order_id = $1 AND deleted_at IS NULL AND status = 'pending'`,
			id, nullActorID(actorID)); err != nil {
			return err
		}
	}
	if err := insertPurchaseHistoryTx(ctx, tx, purchaseHistoryRef{OrderID: &id}, &cur, &status, actorID); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *PurchaseRepository) PatchWaiting(ctx context.Context, id int64, waiting bool, actorID int64) error {
	res, err := r.db.ExecContext(ctx, `
UPDATE purchase_order SET is_waiting = $2, updated_by = $3, updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL`, id, waiting, nullActorID(actorID))
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *PurchaseRepository) SoftDelete(ctx context.Context, id int64, actorID int64) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck

	cur, err := lockPurchaseTx(ctx, tx, id)
	if err != nil {
		return err
	}
	// Once stock has landed the PO is part of the stock ledger and must stay.
	if cur == "receive_partial" || cur == "receive_completed" {
		return ErrValidation
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE purchase_order SET deleted_at = NOW(), updated_by = $2 WHERE id = $1 AND deleted_at IS NULL`,
		id, nullActorID(actorID)); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE purchase_order_item SET deleted_at = NOW(), updated_by = $2
WHERE purchase_order_id = $1 AND deleted_at IS NULL`, id, nullActorID(actorID)); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *PurchaseRepository) CreateItem(ctx context.Context, orderID int64, in PurchaseItemInput, actorID int64) (int64, error) {
	if err := validatePurchaseItem(in); err != nil {
		return 0, err
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback() //nolint:errcheck
	cur, err := lockPurchaseTx(ctx, tx, orderID)
	if err != nil {
		return 0, err
	}
	if purchaseLocked(cur) {
		return 0, ErrValidation
	}
	id, err := insertPurchaseItemTx(ctx, tx, orderID, in, actorID)
	if err != nil {
		return 0, err
	}
	if err := refreshPurchaseSubtotalTx(ctx, tx, orderID); err != nil {
		return 0, err
	}
	return id, tx.Commit()
}

func (r *PurchaseRepository) UpdateItem(ctx context.Context, orderID, itemID int64, in PurchaseItemInput, actorID int64) error {
	if err := validatePurchaseItem(in); err != nil {
		return err
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck
	cur, err := lockPurchaseTx(ctx, tx, orderID)
	if err != nil {
		return err
	}
	if purchaseLocked(cur) {
		return ErrValidation
	}
	if err := assertPurchaseItemBelongsTx(ctx, tx, orderID, itemID); err != nil {
		return err
	}
	if err := updatePurchaseItemTx(ctx, tx, itemID, in, actorID); err != nil {
		return err
	}
	if err := refreshPurchaseSubtotalTx(ctx, tx, orderID); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *PurchaseRepository) DeleteItem(ctx context.Context, orderID, itemID int64, actorID int64) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck
	cur, err := lockPurchaseTx(ctx, tx, orderID)
	if err != nil {
		return err
	}
	if purchaseLocked(cur) {
		return ErrValidation
	}
	if err := assertPurchaseItemBelongsTx(ctx, tx, orderID, itemID); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE purchase_order_item SET deleted_at = NOW(), updated_by = $2
WHERE id = $1 AND deleted_at IS NULL`, itemID, nullActorID(actorID)); err != nil {
		return err
	}
	if err := refreshPurchaseSubtotalTx(ctx, tx, orderID); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *PurchaseRepository) PatchItemStatus(ctx context.Context, orderID, itemID int64, in PurchaseItemStatusInput, actorID int64) error {
	if _, ok := purchaseItemStatuses[in.Status]; !ok {
		return ErrValidation
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck
	if err := assertPurchaseItemBelongsTx(ctx, tx, orderID, itemID); err != nil {
		return err
	}
	var cur string
	if err := tx.QueryRowContext(ctx,
		"SELECT status::text FROM purchase_order_item WHERE id = $1 AND deleted_at IS NULL FOR UPDATE", itemID).Scan(&cur); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE purchase_order_item SET status = $2::purchase_order_item_status, note = CASE WHEN $3 = '' THEN note ELSE $3 END,
  updated_by = $4, updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL`, itemID, in.Status, in.Note, nullActorID(actorID)); err != nil {
		return err
	}
	if err := insertPurchaseHistoryTx(ctx, tx,
		purchaseHistoryRef{OrderID: &orderID, OrderItemID: &itemID}, &cur, &in.Status, actorID); err != nil {
		return err
	}
	return tx.Commit()
}

// ConvertItemUnit splits QtyToConvert off a line into a new line measured in TargetUnit. The split
// line carries price 0 (money stays on the source line) and records old_qty/old_unit for revert.
func (r *PurchaseRepository) ConvertItemUnit(ctx context.Context, orderID, itemID int64, in PurchaseConvertUnitInput, actorID int64) (PurchaseConvertUnitResult, error) {
	var out PurchaseConvertUnitResult
	if in.QtyToConvert < 1 || in.FromRatio < 1 || in.ToRatio < 1 {
		return out, ErrValidation
	}
	target := strings.ToLower(strings.TrimSpace(in.TargetUnit))
	if _, ok := ticketItemUnits[target]; !ok {
		return out, ErrValidation
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return out, err
	}
	defer tx.Rollback() //nolint:errcheck

	var srcQty int64
	var srcType, srcUnit, srcStatus string
	var productItemID, brandID, modelID, engineID, requestItemID sql.NullInt64
	var name sql.NullString
	var identification, note string
	var vatRate float64
	if err := tx.QueryRowContext(ctx, `
SELECT qty, type::text, unit::text, status::text, product_item_id, name,
  product_attribute_brand_id, product_attribute_model_id, product_attribute_engine_id,
  purchase_request_item_id, identification_number, note, vat_rate::float8
FROM purchase_order_item
WHERE id = $1 AND purchase_order_id = $2 AND deleted_at IS NULL
FOR UPDATE`, itemID, orderID).Scan(&srcQty, &srcType, &srcUnit, &srcStatus, &productItemID, &name,
		&brandID, &modelID, &engineID, &requestItemID, &identification, &note, &vatRate); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return out, ErrNotFound
		}
		return out, err
	}
	if srcUnit == target {
		return out, ErrValidation
	}
	// v1 forbids set → piece: a set carries no piece count to split back into.
	if srcUnit == "set" && target == "piece" {
		return out, ErrValidation
	}
	if in.QtyToConvert > srcQty {
		return out, ErrValidation
	}
	converted := int64(math.Round(float64(in.QtyToConvert) * float64(in.ToRatio) / float64(in.FromRatio)))
	if converted < 1 {
		return out, ErrValidation
	}

	if remaining := srcQty - in.QtyToConvert; remaining >= 1 {
		if _, err := tx.ExecContext(ctx, `
UPDATE purchase_order_item SET qty = $2::integer, total_price = $2::integer * price_per_unit - discount,
  updated_by = $3, updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL`, itemID, remaining, nullActorID(actorID)); err != nil {
			return out, err
		}
	} else {
		// Nothing left in the old unit, so the source line is retired rather than left at qty 0.
		if _, err := tx.ExecContext(ctx, `
UPDATE purchase_order_item SET deleted_at = NOW(), updated_by = $2, updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL`, itemID, nullActorID(actorID)); err != nil {
			return out, err
		}
		out.SourceDeleted = true
	}

	if err := tx.QueryRowContext(ctx, `
INSERT INTO purchase_order_item (
  purchase_order_id, purchase_request_item_id, parent_id, status, type, product_item_id, name,
  product_attribute_brand_id, product_attribute_model_id, product_attribute_engine_id,
  identification_number, qty, unit, old_qty, old_unit,
  price_per_unit, vat_rate, discount, total_price, note, created_by, updated_by
) VALUES ($1, $2, $3, $4::purchase_order_item_status, $5::purchase_request_item_type, $6, $7,
  $8, $9, $10, $11, $12, $13::product_unit, $14, $15::product_unit,
  0, $16, 0, 0, $17, $18, $18)
RETURNING id`,
		orderID, requestItemID, itemID, srcStatus, srcType, productItemID, name,
		brandID, modelID, engineID, identification, converted, target, in.QtyToConvert, srcUnit,
		vatRate, note, nullActorID(actorID)).Scan(&out.NewItemID); err != nil {
		return out, err
	}
	out.Qty = converted
	return out, tx.Commit()
}

// RevertItemUnit retires a split line and hands its old_qty back to the parent, undeleting the
// parent when the split had consumed it entirely.
func (r *PurchaseRepository) RevertItemUnit(ctx context.Context, orderID, itemID int64, actorID int64) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck

	var parentID, oldQty sql.NullInt64
	var status string
	if err := tx.QueryRowContext(ctx, `
SELECT parent_id, old_qty, status::text
FROM purchase_order_item
WHERE id = $1 AND purchase_order_id = $2 AND deleted_at IS NULL
FOR UPDATE`, itemID, orderID).Scan(&parentID, &oldQty, &status); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	if status != "approved" || !parentID.Valid || !oldQty.Valid || oldQty.Int64 < 1 {
		return ErrValidation
	}

	var parentDeleted sql.NullTime
	if err := tx.QueryRowContext(ctx, `
SELECT deleted_at FROM purchase_order_item
WHERE id = $1 AND purchase_order_id = $2
FOR UPDATE`, parentID.Int64, orderID).Scan(&parentDeleted); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	if parentDeleted.Valid {
		if _, err := tx.ExecContext(ctx, `
UPDATE purchase_order_item SET deleted_at = NULL, updated_by = $2, updated_at = NOW()
WHERE id = $1`, parentID.Int64, nullActorID(actorID)); err != nil {
			return err
		}
	} else if _, err := tx.ExecContext(ctx, `
UPDATE purchase_order_item SET qty = qty + $2::integer, total_price = (qty + $2::integer) * price_per_unit - discount,
  updated_by = $3, updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL`, parentID.Int64, oldQty.Int64, nullActorID(actorID)); err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, `
UPDATE purchase_order_item SET deleted_at = NOW(), updated_by = $2, updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL`, itemID, nullActorID(actorID)); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *PurchaseRepository) CreatePayment(ctx context.Context, orderID int64, in PurchasePaymentInput, actorID int64) (int64, error) {
	if in.SettingPaymentMethodID <= 0 || in.TotalPrice < 0 || in.Discount < 0 {
		return 0, ErrValidation
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback() //nolint:errcheck
	if _, err := lockPurchaseTx(ctx, tx, orderID); err != nil {
		return 0, err
	}
	var id int64
	if err := tx.QueryRowContext(ctx, `
INSERT INTO purchase_order_payment (
  purchase_order_id, setting_payment_method_id, supplier_bank_id, vat_rate, discount,
  total_price, note, system_file_id, credit_term, paid_at, created_by, updated_by
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10, NOW()), $11, $11)
RETURNING id`,
		orderID, in.SettingPaymentMethodID, in.SupplierBankID, in.VatRate, in.Discount,
		in.TotalPrice, in.Note, in.SystemFileID, in.CreditTerm, in.PaidAt,
		nullActorID(actorID)).Scan(&id); err != nil {
		return 0, err
	}
	return id, tx.Commit()
}

func (r *PurchaseRepository) DeletePayment(ctx context.Context, orderID, paymentID int64, actorID int64) error {
	res, err := r.db.ExecContext(ctx, `
UPDATE purchase_order_payment SET deleted_at = NOW(), updated_by = $3
WHERE id = $2 AND purchase_order_id = $1 AND deleted_at IS NULL`,
		orderID, paymentID, nullActorID(actorID))
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *PurchaseRepository) ReplaceFiles(ctx context.Context, orderID int64, fileIDs []int64, actorID int64) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck
	if _, err := lockPurchaseTx(ctx, tx, orderID); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE purchase_order_file SET deleted_at = NOW(), updated_by = $2
WHERE purchase_order_id = $1 AND deleted_at IS NULL
  AND ($3::bigint[] IS NULL OR system_file_id <> ALL($3))`,
		orderID, nullActorID(actorID), int64ArrayOrNil(fileIDs)); err != nil {
		return err
	}
	for i, fileID := range fileIDs {
		if _, err := tx.ExecContext(ctx, `
INSERT INTO purchase_order_file (purchase_order_id, system_file_id, sort_order, created_by, updated_by)
VALUES ($1, $2, $3, $4, $4)
ON CONFLICT (purchase_order_id, system_file_id) WHERE deleted_at IS NULL
DO UPDATE SET sort_order = EXCLUDED.sort_order, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
			orderID, fileID, i, nullActorID(actorID)); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// StockHistory answers the "supplier stock history" dialog: past receipts of one product item.
func (r *PurchaseRepository) StockHistory(ctx context.Context, productItemID int64, supplierID *int64, limit int) (PurchaseStockHistoryResponse, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	rows, err := r.db.QueryContext(ctx, `
SELECT s.id, s.product_item_id, pil.name, poi.purchase_order_id, po.sku,
  s.supplier_user_id, si.name,
  s.quantity::float8, s.remain_quantity::float8, s.cost_per_unit::float8,
  s.discount_per_unit::float8, s.sell_price::float8, s.received_at, s.created_at
FROM product_item_stock s
LEFT JOIN product_item_language pil ON pil.product_item_id = s.product_item_id AND pil.locale = 'th'
LEFT JOIN purchase_order_item poi ON poi.id = s.purchase_order_item_id
LEFT JOIN purchase_order po ON po.id = poi.purchase_order_id
LEFT JOIN supplier_user su ON su.id = s.supplier_user_id
LEFT JOIN supplier_information si ON si.supplier_user_id = su.id AND si.type = 'contact'
WHERE s.product_item_id = $1 AND s.deleted_at IS NULL
  AND ($2::bigint IS NULL OR s.supplier_user_id = $2)
ORDER BY COALESCE(s.received_at, s.created_at) DESC, s.id DESC
LIMIT $3`, productItemID, supplierID, limit)
	if err != nil {
		return PurchaseStockHistoryResponse{}, err
	}
	defer rows.Close()
	out := PurchaseStockHistoryResponse{Items: []PurchaseStockHistoryRow{}}
	for rows.Next() {
		var row PurchaseStockHistoryRow
		var productName, orderSKU, supplierName sql.NullString
		var orderID, supplierUserID sql.NullInt64
		var receivedAt sql.NullTime
		if err := rows.Scan(&row.ID, &row.ProductItemID, &productName, &orderID, &orderSKU,
			&supplierUserID, &supplierName,
			&row.Quantity, &row.RemainQuantity, &row.CostPerUnit,
			&row.DiscountPerUnit, &row.SellPrice, &receivedAt, &row.CreatedAt); err != nil {
			return out, err
		}
		assignNullStr(&row.ProductItemName, productName)
		assignNullStr(&row.PurchaseOrderSKU, orderSKU)
		assignNullStr(&row.SupplierName, supplierName)
		assignNullInt(&row.PurchaseOrderID, orderID)
		assignNullInt(&row.SupplierUserID, supplierUserID)
		if receivedAt.Valid {
			row.ReceivedAt = &receivedAt.Time
		}
		out.Items = append(out.Items, row)
	}
	return out, rows.Err()
}

func (r *PurchaseRepository) History(ctx context.Context, orderID int64, locale string) (TicketHistoryResponse, error) {
	return purchaseHistoryFor(ctx, r.db, "purchase_order_id", orderID, locale)
}

func assertPurchaseItemBelongsTx(ctx context.Context, tx *sql.Tx, orderID, itemID int64) error {
	var n int
	if err := tx.QueryRowContext(ctx, `
SELECT COUNT(*) FROM purchase_order_item
WHERE id = $1 AND purchase_order_id = $2 AND deleted_at IS NULL`, itemID, orderID).Scan(&n); err != nil {
		return err
	}
	if n == 0 {
		return ErrNotFound
	}
	return nil
}
