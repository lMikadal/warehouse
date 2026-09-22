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

// TicketRepository backs คำร้อง on purchase_request*.
type TicketRepository struct {
	db   *sql.DB
	code *system.CodePrefixRepository
}

func NewTicketRepository(db *sql.DB) *TicketRepository {
	return &TicketRepository{db: db, code: system.NewCodePrefixRepository(db)}
}

var ticketStatuses = map[string]struct{}{
	"draft": {}, "pending": {}, "approved": {},
	"received": {}, "completed": {}, "cancelled": {}, "rejected": {},
}

// ticketItemStatuses excludes draft: v1 line items never sit in draft (repository.insertItemTx).
var ticketItemStatuses = map[string]struct{}{
	"pending": {}, "approved": {}, "rejected": {},
	"cancelled": {}, "received": {}, "completed": {},
}

var ticketItemRejectTypes = map[string]struct{}{
	"change": {}, "wait": {}, "stop": {}, "reject": {},
}

var ticketItemRejectStatuses = map[string]struct{}{
	"pending": {}, "approved": {}, "cancelled": {},
}

var ticketItemUnits = map[string]struct{}{
	"piece": {}, "box": {}, "set": {}, "roll": {}, "pair": {},
	"bag": {}, "sheet": {}, "meter": {}, "liter": {}, "kg": {},
}

// ticketLinesLocked mirrors v1 parentTicketLocksLineItems: approved and later freeze line edits.
func ticketLinesLocked(status string) bool {
	return status == "approved" || status == "received" || status == "completed"
}

const ticketListFrom = `
FROM purchase_request t
LEFT JOIN purchase_request_customer cu ON cu.purchase_request_id = t.id
LEFT JOIN admin_user au ON au.id = t.created_by
`

func ticketListWhere(q TicketListQuery) (string, []any) {
	where := "t.deleted_at IS NULL"
	args := []any{}
	if q.Search != "" {
		args = append(args, "%"+q.Search+"%")
		where += fmt.Sprintf(" AND t.sku ILIKE $%d", len(args))
	}
	if q.Status != "" {
		args = append(args, q.Status)
		where += fmt.Sprintf(" AND t.status = $%d::purchase_request_status", len(args))
	}
	if q.ExcludeDraft {
		where += " AND t.status <> 'draft'"
	}
	if q.DateFrom != "" {
		args = append(args, q.DateFrom)
		where += fmt.Sprintf(" AND t.created_at >= ($%d || ' 00:00:00')::timestamp AT TIME ZONE 'Asia/Bangkok'", len(args))
	}
	if q.DateTo != "" {
		args = append(args, q.DateTo)
		where += fmt.Sprintf(" AND t.created_at < (($%d || ' 00:00:00')::timestamp AT TIME ZONE 'Asia/Bangkok') + INTERVAL '1 day'", len(args))
	}
	if q.CreatedBy != nil {
		args = append(args, *q.CreatedBy)
		where += fmt.Sprintf(" AND t.created_by = $%d", len(args))
	}
	return where, args
}

// itemStatusCount counts non-deleted lines of one status; used for the list badges.
func itemStatusCount(status string) string {
	return `(SELECT COUNT(*) FROM purchase_request_item i
	  WHERE i.purchase_request_id = t.id AND i.deleted_at IS NULL AND i.status = '` + status + `')`
}

const ticketPendingRejectCount = `(SELECT COUNT(*) FROM purchase_request_item_reject rj
  INNER JOIN purchase_request_item ri ON ri.id = rj.purchase_request_item_id AND ri.deleted_at IS NULL
  WHERE ri.purchase_request_id = t.id AND rj.deleted_at IS NULL AND rj.status = 'pending')`

const ticketPOCount = `(SELECT COUNT(*) FROM purchase_order po
  WHERE po.purchase_request_id = t.id AND po.deleted_at IS NULL)`

// ticketAllItemsHavePO is true only when every active line is already on a PO line.
const ticketAllItemsHavePO = `(
  SELECT COUNT(*) = 0 FROM purchase_request_item i
  WHERE i.purchase_request_id = t.id AND i.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM purchase_order_item poi
      INNER JOIN purchase_order po ON po.id = poi.purchase_order_id AND po.deleted_at IS NULL
      WHERE poi.purchase_request_item_id = i.id AND poi.deleted_at IS NULL
    )
)`

func (r *TicketRepository) List(ctx context.Context, q TicketListQuery) (TicketListResponse, error) {
	where, args := ticketListWhere(q)
	var total int
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) "+ticketListFrom+" WHERE "+where, args...).Scan(&total); err != nil {
		return TicketListResponse{}, err
	}
	offset := (q.Page - 1) * q.Limit
	args = append(args, q.Limit, offset)
	query := fmt.Sprintf(`
SELECT t.id, t.sku, t.status::text, t.total_qty, t.total_deposit::float8,
  COALESCE(cu.name, ''), t.created_at, au.username,
  %s, %s, %s, %s, %s, %s, %s, %s
%s WHERE %s
ORDER BY t.created_at DESC, t.id DESC LIMIT $%d OFFSET $%d`,
		itemStatusCount("rejected"), itemStatusCount("cancelled"), itemStatusCount("approved"),
		itemStatusCount("received"), itemStatusCount("completed"),
		ticketPendingRejectCount, ticketPOCount, ticketAllItemsHavePO,
		ticketListFrom, where, len(args)-1, len(args))
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return TicketListResponse{}, err
	}
	defer rows.Close()
	items := []TicketListItem{}
	for rows.Next() {
		var it TicketListItem
		var createdByName sql.NullString
		if err := rows.Scan(&it.ID, &it.SKU, &it.Status, &it.TotalQty, &it.TotalDeposit,
			&it.CustomerName, &it.CreatedAt, &createdByName,
			&it.RejectedItemCount, &it.CancelledItemCount, &it.ApprovedItemCount,
			&it.ReceivedItemCount, &it.CompletedItemCount,
			&it.PendingItemRejectCount, &it.PurchaseOrderCount, &it.AllItemsHavePO); err != nil {
			return TicketListResponse{}, err
		}
		if createdByName.Valid {
			s := createdByName.String
			it.CreatedByName = &s
		}
		items = append(items, it)
	}
	return TicketListResponse{Items: items, Total: total, Page: q.Page, Limit: q.Limit}, rows.Err()
}

// Count powers the five stat cards: header counts plus line-level rejected/cancelled counts.
func (r *TicketRepository) Count(ctx context.Context, q TicketListQuery) (TicketCountResponse, error) {
	q.Status = ""
	where, args := ticketListWhere(q)
	resp := TicketCountResponse{ByStatus: map[string]int64{}, ByItemStatus: map[string]int64{}}

	rows, err := r.db.QueryContext(ctx,
		"SELECT t.status::text, COUNT(*) "+ticketListFrom+" WHERE "+where+" GROUP BY t.status", args...)
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

	itemRows, err := r.db.QueryContext(ctx, `
SELECT i.status::text, COUNT(*)
FROM purchase_request_item i
WHERE i.deleted_at IS NULL AND i.purchase_request_id IN (
  SELECT t.id `+ticketListFrom+` WHERE `+where+`
)
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

func (r *TicketRepository) GetByID(ctx context.Context, id int64) (TicketDetail, error) {
	var d TicketDetail
	var channelID, paymentID sql.NullInt64
	var createdByName sql.NullString
	err := r.db.QueryRowContext(ctx, `
SELECT t.id, t.sku, t.status::text, t.setting_sale_channel_id, t.setting_payment_method_id,
  t.total_qty, t.total_deposit_old::float8, t.total_deposit_new::float8, t.total_deposit::float8,
  t.note, t.created_at, t.updated_at, au.username
FROM purchase_request t
LEFT JOIN admin_user au ON au.id = t.created_by
WHERE t.id = $1 AND t.deleted_at IS NULL`, id).Scan(
		&d.ID, &d.SKU, &d.Status, &channelID, &paymentID,
		&d.TotalQty, &d.TotalDepositOld, &d.TotalDepositNew, &d.TotalDeposit,
		&d.Note, &d.CreatedAt, &d.UpdatedAt, &createdByName,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return d, ErrNotFound
	}
	if err != nil {
		return d, err
	}
	if channelID.Valid {
		d.SettingSaleChannelID = &channelID.Int64
	}
	if paymentID.Valid {
		d.SettingPaymentMethodID = &paymentID.Int64
	}
	if createdByName.Valid {
		s := createdByName.String
		d.CreatedByName = &s
	}
	if d.Customer, err = r.loadCustomer(ctx, id); err != nil {
		return d, err
	}
	if d.Items, err = r.loadItems(ctx, id); err != nil {
		return d, err
	}
	return d, nil
}

func (r *TicketRepository) loadCustomer(ctx context.Context, id int64) (*TicketCustomerDetail, error) {
	var c TicketCustomerDetail
	var memberID sql.NullInt64
	var dateReceive sql.NullTime
	err := r.db.QueryRowContext(ctx, `
SELECT member_user_id, sku, name, tel, email, date_receive
FROM purchase_request_customer WHERE purchase_request_id = $1`, id).Scan(
		&memberID, &c.SKU, &c.Name, &c.Tel, &c.Email, &dateReceive)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if memberID.Valid {
		c.MemberUserID = &memberID.Int64
	}
	if dateReceive.Valid {
		c.DateReceive = &dateReceive.Time
	}
	return &c, nil
}

// productItemStockExpr sums on-hand stock so the form can suggest qty_reorder like v1 did.
const productItemStockExpr = `(
  SELECT COALESCE(SUM(s.remain_quantity), 0)::float8 FROM product_item_stock s
  WHERE s.product_item_id = i.product_item_id AND s.deleted_at IS NULL
)`

func (r *TicketRepository) loadItems(ctx context.Context, id int64) ([]TicketItemDetail, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT i.id, i.status::text, i.type::text, i.product_item_id, pi.sku,
  COALESCE(NULLIF(TRIM(pil.name), ''), NULLIF(TRIM(pll.name), '')),
  `+productItemStockExpr+`,
  i.name, i.product_attribute_brand_id, bl.name, i.product_attribute_model_id, ml.name,
  i.product_attribute_engine_id, el.name,
  i.identification_number, i.qty_sell, i.qty_reorder, i.deposit::float8, i.unit::text, i.note,
  (SELECT COUNT(*) FROM purchase_order_item poi
    INNER JOIN purchase_order po ON po.id = poi.purchase_order_id AND po.deleted_at IS NULL
    WHERE poi.purchase_request_item_id = i.id AND poi.deleted_at IS NULL)
FROM purchase_request_item i
LEFT JOIN product_item pi ON pi.id = i.product_item_id
LEFT JOIN product_list pl ON pl.id = pi.product_list_id
LEFT JOIN product_item_language pil ON pil.product_item_id = pi.id AND pil.locale = 'th'
LEFT JOIN product_list_language pll ON pll.product_list_id = pl.id AND pll.locale = 'th'
LEFT JOIN product_attribute_language bl ON bl.product_attribute_id = i.product_attribute_brand_id AND bl.locale = 'th'
LEFT JOIN product_attribute_language ml ON ml.product_attribute_id = i.product_attribute_model_id AND ml.locale = 'th'
LEFT JOIN product_attribute_language el ON el.product_attribute_id = i.product_attribute_engine_id AND el.locale = 'th'
WHERE i.purchase_request_id = $1 AND i.deleted_at IS NULL
ORDER BY i.id ASC`, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []TicketItemDetail{}
	ids := []int64{}
	for rows.Next() {
		var it TicketItemDetail
		var productItemID, brandID, modelID, engineID sql.NullInt64
		var productSKU, productName, name, brandName, modelName, engineName sql.NullString
		if err := rows.Scan(&it.ID, &it.Status, &it.Type, &productItemID, &productSKU, &productName,
			&it.StockQty, &name, &brandID, &brandName, &modelID, &modelName, &engineID, &engineName,
			&it.IdentificationNumber, &it.QtySell, &it.QtyReorder, &it.Deposit, &it.Unit, &it.Note,
			&it.PurchaseOrderCount); err != nil {
			return nil, err
		}
		assignNullInt(&it.ProductItemID, productItemID)
		assignNullStr(&it.ProductItemSKU, productSKU)
		assignNullStr(&it.ProductItemName, productName)
		assignNullStr(&it.Name, name)
		assignNullInt(&it.ProductAttributeBrandID, brandID)
		assignNullStr(&it.BrandName, brandName)
		assignNullInt(&it.ProductAttributeModelID, modelID)
		assignNullStr(&it.ModelName, modelName)
		assignNullInt(&it.ProductAttributeEngineID, engineID)
		assignNullStr(&it.EngineName, engineName)
		it.Files = []TicketItemFile{}
		it.Rejects = []TicketItemReject{}
		items = append(items, it)
		ids = append(ids, it.ID)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(ids) == 0 {
		return items, nil
	}
	byID := map[int64]*TicketItemDetail{}
	for i := range items {
		byID[items[i].ID] = &items[i]
	}
	if err := r.attachItemFiles(ctx, ids, byID); err != nil {
		return nil, err
	}
	if err := r.attachItemRejects(ctx, ids, byID); err != nil {
		return nil, err
	}
	return items, nil
}

func assignNullInt(dst **int64, v sql.NullInt64) {
	if v.Valid {
		n := v.Int64
		*dst = &n
	}
}

func assignNullStr(dst **string, v sql.NullString) {
	if v.Valid {
		s := v.String
		*dst = &s
	}
}

func (r *TicketRepository) attachItemFiles(ctx context.Context, ids []int64, byID map[int64]*TicketItemDetail) error {
	rows, err := r.db.QueryContext(ctx, `
SELECT f.purchase_request_item_id, f.id, f.system_file_id, f.sort_order, COALESCE(sf.original_name, '')
FROM purchase_request_item_file f
LEFT JOIN system_file sf ON sf.id = f.system_file_id
WHERE f.purchase_request_item_id = ANY($1) AND f.deleted_at IS NULL
ORDER BY f.sort_order ASC, f.id ASC`, int64Array(ids))
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var itemID int64
		var f TicketItemFile
		if err := rows.Scan(&itemID, &f.ID, &f.SystemFileID, &f.SortOrder, &f.FileName); err != nil {
			return err
		}
		if it := byID[itemID]; it != nil {
			it.Files = append(it.Files, f)
		}
	}
	return rows.Err()
}

func (r *TicketRepository) attachItemRejects(ctx context.Context, ids []int64, byID map[int64]*TicketItemDetail) error {
	rows, err := r.db.QueryContext(ctx, `
SELECT rj.id, rj.purchase_request_item_id, rj.status::text, rj.type::text, rj.note, rj.date,
  rj.product_item_id,
  COALESCE(NULLIF(TRIM(pil.name), ''), NULLIF(TRIM(pll.name), '')),
  rj.created_at, au.username
FROM purchase_request_item_reject rj
LEFT JOIN product_item pi ON pi.id = rj.product_item_id
LEFT JOIN product_list pl ON pl.id = pi.product_list_id
LEFT JOIN product_item_language pil ON pil.product_item_id = pi.id AND pil.locale = 'th'
LEFT JOIN product_list_language pll ON pll.product_list_id = pl.id AND pll.locale = 'th'
LEFT JOIN admin_user au ON au.id = rj.created_by
WHERE rj.purchase_request_item_id = ANY($1) AND rj.deleted_at IS NULL
ORDER BY rj.created_at DESC, rj.id DESC`, int64Array(ids))
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var rj TicketItemReject
		var date sql.NullTime
		var productItemID sql.NullInt64
		var productName, createdByName sql.NullString
		if err := rows.Scan(&rj.ID, &rj.PurchaseRequestItemID, &rj.Status, &rj.Type, &rj.Note, &date,
			&productItemID, &productName, &rj.CreatedAt, &createdByName); err != nil {
			return err
		}
		if date.Valid {
			rj.Date = &date.Time
		}
		assignNullInt(&rj.ProductItemID, productItemID)
		assignNullStr(&rj.ProductItemName, productName)
		assignNullStr(&rj.CreatedByName, createdByName)
		if it := byID[rj.PurchaseRequestItemID]; it != nil {
			it.Rejects = append(it.Rejects, rj)
		}
	}
	return rows.Err()
}

// int64Array renders ids for `= ANY($1)` without pulling in a driver-specific array type.
func int64Array(ids []int64) string {
	parts := make([]string, len(ids))
	for i, id := range ids {
		parts[i] = fmt.Sprintf("%d", id)
	}
	return "{" + strings.Join(parts, ",") + "}"
}

func validateTicketItem(in TicketItemInput) error {
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
	if in.QtySell < 1 || in.QtyReorder < 0 || in.Deposit < 0 {
		return ErrValidation
	}
	if in.Unit != "" {
		if _, ok := ticketItemUnits[in.Unit]; !ok {
			return ErrValidation
		}
	}
	// v1 capped line images at 3 (ticket/service.go).
	if len(in.SystemFileIDs) > 3 {
		return ErrValidation
	}
	return nil
}

func (r *TicketRepository) Create(ctx context.Context, in TicketCreateInput, actorID int64) (int64, error) {
	if in.Status == "" {
		in.Status = "draft"
	}
	if _, ok := ticketStatuses[in.Status]; !ok {
		return 0, ErrValidation
	}
	for _, it := range in.Items {
		if err := validateTicketItem(it); err != nil {
			return 0, err
		}
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback() //nolint:errcheck

	sku, err := r.code.NextCode(ctx, tx, "purchase_request", time.Now())
	if err != nil {
		return 0, err
	}
	var id int64
	err = tx.QueryRowContext(ctx, `
INSERT INTO purchase_request (
  sku, status, setting_sale_channel_id, setting_payment_method_id,
  total_deposit_old, total_deposit_new, total_deposit, note, created_by, updated_by
) VALUES ($1, $2::purchase_request_status, $3, $4, $5, $6, $7, $8, $9, $9)
RETURNING id`,
		sku, in.Status, in.SettingSaleChannelID, in.SettingPaymentMethodID,
		in.TotalDepositOld, in.TotalDepositNew, in.TotalDeposit, in.Note, nullActorID(actorID),
	).Scan(&id)
	if err != nil {
		return 0, err
	}
	if err := upsertTicketCustomerTx(ctx, tx, id, in.Customer); err != nil {
		return 0, err
	}
	for _, it := range in.Items {
		if _, err := insertTicketItemTx(ctx, tx, id, it, actorID); err != nil {
			return 0, err
		}
	}
	if err := refreshTicketTotalsTx(ctx, tx, id); err != nil {
		return 0, err
	}
	if err := insertTicketHistoryTx(ctx, tx, id, nil, &in.Status, actorID); err != nil {
		return 0, err
	}
	return id, tx.Commit()
}

func (r *TicketRepository) Update(ctx context.Context, id int64, in TicketUpdateInput, actorID int64) error {
	for _, it := range in.Items {
		if err := validateTicketItem(it); err != nil {
			return err
		}
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck

	var curStatus string
	if err := tx.QueryRowContext(ctx, `
SELECT status::text FROM purchase_request WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`, id).Scan(&curStatus); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	if ticketLinesLocked(curStatus) {
		return ErrValidation
	}
	status := in.Status
	if status == "" {
		status = curStatus
	}
	if _, ok := ticketStatuses[status]; !ok {
		return ErrValidation
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE purchase_request SET
  status = $2::purchase_request_status,
  setting_sale_channel_id = $3,
  setting_payment_method_id = $4,
  total_deposit_old = $5,
  total_deposit_new = $6,
  total_deposit = $7,
  note = $8,
  updated_by = $9,
  updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL`,
		id, status, in.SettingSaleChannelID, in.SettingPaymentMethodID,
		in.TotalDepositOld, in.TotalDepositNew, in.TotalDeposit, in.Note, nullActorID(actorID)); err != nil {
		return err
	}
	if err := upsertTicketCustomerTx(ctx, tx, id, in.Customer); err != nil {
		return err
	}
	if err := syncTicketItemsTx(ctx, tx, id, in.Items, actorID); err != nil {
		return err
	}
	if err := refreshTicketTotalsTx(ctx, tx, id); err != nil {
		return err
	}
	if status != curStatus {
		if err := insertTicketHistoryTx(ctx, tx, id, &curStatus, &status, actorID); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func upsertTicketCustomerTx(ctx context.Context, tx *sql.Tx, id int64, in *TicketCustomerInput) error {
	if in == nil {
		return nil
	}
	_, err := tx.ExecContext(ctx, `
INSERT INTO purchase_request_customer (purchase_request_id, member_user_id, sku, name, tel, email, date_receive)
VALUES ($1, $2, $3, $4, $5, $6, $7)
ON CONFLICT (purchase_request_id) DO UPDATE SET
  member_user_id = EXCLUDED.member_user_id,
  sku = EXCLUDED.sku,
  name = EXCLUDED.name,
  tel = EXCLUDED.tel,
  email = EXCLUDED.email,
  date_receive = EXCLUDED.date_receive`,
		id, in.MemberUserID, in.SKU, in.Name, in.Tel, in.Email, in.DateReceive)
	return err
}

func insertTicketItemTx(ctx context.Context, tx *sql.Tx, ticketID int64, in TicketItemInput, actorID int64) (int64, error) {
	unit := in.Unit
	if unit == "" {
		unit = "piece"
	}
	var id int64
	if err := tx.QueryRowContext(ctx, `
INSERT INTO purchase_request_item (
  purchase_request_id, status, type, product_item_id, name,
  product_attribute_brand_id, product_attribute_model_id, product_attribute_engine_id,
  identification_number, qty_sell, qty_reorder, deposit, unit, note, created_by, updated_by
) VALUES ($1, 'pending', $2::purchase_request_item_type, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::product_unit, $13, $14, $14)
RETURNING id`,
		ticketID, in.Type, in.ProductItemID, in.Name,
		in.ProductAttributeBrandID, in.ProductAttributeModelID, in.ProductAttributeEngineID,
		in.IdentificationNumber, in.QtySell, in.QtyReorder, in.Deposit, unit, in.Note,
		nullActorID(actorID)).Scan(&id); err != nil {
		return 0, err
	}
	if err := replaceTicketItemFilesTx(ctx, tx, id, in.SystemFileIDs, actorID); err != nil {
		return 0, err
	}
	return id, nil
}

func updateTicketItemTx(ctx context.Context, tx *sql.Tx, itemID int64, in TicketItemInput, actorID int64) error {
	unit := in.Unit
	if unit == "" {
		unit = "piece"
	}
	res, err := tx.ExecContext(ctx, `
UPDATE purchase_request_item SET
  type = $2::purchase_request_item_type,
  product_item_id = $3,
  name = $4,
  product_attribute_brand_id = $5,
  product_attribute_model_id = $6,
  product_attribute_engine_id = $7,
  identification_number = $8,
  qty_sell = $9,
  qty_reorder = $10,
  deposit = $11,
  unit = $12::product_unit,
  note = $13,
  updated_by = $14,
  updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL`,
		itemID, in.Type, in.ProductItemID, in.Name,
		in.ProductAttributeBrandID, in.ProductAttributeModelID, in.ProductAttributeEngineID,
		in.IdentificationNumber, in.QtySell, in.QtyReorder, in.Deposit, unit, in.Note,
		nullActorID(actorID))
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return replaceTicketItemFilesTx(ctx, tx, itemID, in.SystemFileIDs, actorID)
}

func replaceTicketItemFilesTx(ctx context.Context, tx *sql.Tx, itemID int64, fileIDs []int64, actorID int64) error {
	if _, err := tx.ExecContext(ctx, `
UPDATE purchase_request_item_file SET deleted_at = NOW(), updated_by = $2, updated_at = NOW()
WHERE purchase_request_item_id = $1 AND deleted_at IS NULL
  AND ($3::bigint[] IS NULL OR NOT (system_file_id = ANY($3)))`,
		itemID, nullActorID(actorID), int64ArrayOrNil(fileIDs)); err != nil {
		return err
	}
	for i, fid := range fileIDs {
		if _, err := tx.ExecContext(ctx, `
INSERT INTO purchase_request_item_file (purchase_request_item_id, system_file_id, sort_order, created_by, updated_by)
SELECT $1, $2, $3, $4, $4
WHERE NOT EXISTS (
  SELECT 1 FROM purchase_request_item_file
  WHERE purchase_request_item_id = $1 AND system_file_id = $2 AND deleted_at IS NULL
)`, itemID, fid, i, nullActorID(actorID)); err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, `
UPDATE purchase_request_item_file SET sort_order = $3, updated_at = NOW()
WHERE purchase_request_item_id = $1 AND system_file_id = $2 AND deleted_at IS NULL`,
			itemID, fid, i); err != nil {
			return err
		}
	}
	return nil
}

func int64ArrayOrNil(ids []int64) any {
	if len(ids) == 0 {
		return nil
	}
	return int64Array(ids)
}

// syncTicketItemsTx mirrors v1 sync-ticket-items: delete removed, insert new, update kept.
func syncTicketItemsTx(ctx context.Context, tx *sql.Tx, ticketID int64, items []TicketItemInput, actorID int64) error {
	keep := []int64{}
	for _, it := range items {
		if it.ID != nil && *it.ID > 0 {
			keep = append(keep, *it.ID)
		}
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE purchase_request_item SET deleted_at = NOW(), updated_by = $2, updated_at = NOW()
WHERE purchase_request_id = $1 AND deleted_at IS NULL
  AND ($3::bigint[] IS NULL OR NOT (id = ANY($3)))`,
		ticketID, nullActorID(actorID), int64ArrayOrNil(keep)); err != nil {
		return err
	}
	for _, it := range items {
		if it.ID != nil && *it.ID > 0 {
			if err := updateTicketItemTx(ctx, tx, *it.ID, it, actorID); err != nil {
				return err
			}
			continue
		}
		if _, err := insertTicketItemTx(ctx, tx, ticketID, it, actorID); err != nil {
			return err
		}
	}
	return nil
}

// refreshTicketTotalsTx keeps total_qty as the v1 definition: the count of active line rows.
func refreshTicketTotalsTx(ctx context.Context, tx *sql.Tx, id int64) error {
	_, err := tx.ExecContext(ctx, `
UPDATE purchase_request SET total_qty = (
  SELECT COUNT(*) FROM purchase_request_item
  WHERE purchase_request_id = $1 AND deleted_at IS NULL
), updated_at = NOW()
WHERE id = $1`, id)
	return err
}

func (r *TicketRepository) PatchStatus(ctx context.Context, id int64, status string, actorID int64) error {
	if _, ok := ticketStatuses[status]; !ok {
		return ErrValidation
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck

	var curStatus string
	if err := tx.QueryRowContext(ctx, `
SELECT status::text FROM purchase_request WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`, id).Scan(&curStatus); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	if curStatus == status {
		return tx.Commit()
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE purchase_request SET status = $2::purchase_request_status, updated_by = $3, updated_at = NOW()
WHERE id = $1`, id, status, nullActorID(actorID)); err != nil {
		return err
	}
	// v1 cascades a terminal header status onto its still-open lines.
	if status == "cancelled" || status == "rejected" {
		if _, err := tx.ExecContext(ctx, `
UPDATE purchase_request_item SET status = $2::purchase_request_status, updated_by = $3, updated_at = NOW()
WHERE purchase_request_id = $1 AND deleted_at IS NULL AND status IN ('draft', 'pending')`,
			id, status, nullActorID(actorID)); err != nil {
			return err
		}
	}
	if err := insertTicketHistoryTx(ctx, tx, id, &curStatus, &status, actorID); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *TicketRepository) PatchCustomer(ctx context.Context, id int64, in TicketCustomerInput, actorID int64) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck

	var exists bool
	if err := tx.QueryRowContext(ctx, `
SELECT TRUE FROM purchase_request WHERE id = $1 AND deleted_at IS NULL`, id).Scan(&exists); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	if err := upsertTicketCustomerTx(ctx, tx, id, &in); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE purchase_request SET updated_by = $2, updated_at = NOW() WHERE id = $1`, id, nullActorID(actorID)); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *TicketRepository) PatchNote(ctx context.Context, id int64, note string, actorID int64) error {
	res, err := r.db.ExecContext(ctx, `
UPDATE purchase_request SET note = $2, updated_by = $3, updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL`, id, note, nullActorID(actorID))
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *TicketRepository) SoftDelete(ctx context.Context, id, actorID int64) error {
	res, err := r.db.ExecContext(ctx, `
UPDATE purchase_request SET deleted_at = NOW(), updated_by = $2, updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL`, id, nullActorID(actorID))
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *TicketRepository) CreateItem(ctx context.Context, ticketID int64, in TicketItemInput, actorID int64) (int64, error) {
	if err := validateTicketItem(in); err != nil {
		return 0, err
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback() //nolint:errcheck

	status, err := lockTicketStatusTx(ctx, tx, ticketID)
	if err != nil {
		return 0, err
	}
	if ticketLinesLocked(status) {
		return 0, ErrValidation
	}
	id, err := insertTicketItemTx(ctx, tx, ticketID, in, actorID)
	if err != nil {
		return 0, err
	}
	if err := refreshTicketTotalsTx(ctx, tx, ticketID); err != nil {
		return 0, err
	}
	return id, tx.Commit()
}

func (r *TicketRepository) UpdateItem(ctx context.Context, ticketID, itemID int64, in TicketItemInput, actorID int64) error {
	if err := validateTicketItem(in); err != nil {
		return err
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck

	status, err := lockTicketStatusTx(ctx, tx, ticketID)
	if err != nil {
		return err
	}
	if ticketLinesLocked(status) {
		return ErrValidation
	}
	if err := assertTicketItemBelongsTx(ctx, tx, ticketID, itemID); err != nil {
		return err
	}
	if err := updateTicketItemTx(ctx, tx, itemID, in, actorID); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *TicketRepository) DeleteItem(ctx context.Context, ticketID, itemID, actorID int64) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck

	status, err := lockTicketStatusTx(ctx, tx, ticketID)
	if err != nil {
		return err
	}
	if ticketLinesLocked(status) {
		return ErrValidation
	}
	res, err := tx.ExecContext(ctx, `
UPDATE purchase_request_item SET deleted_at = NOW(), updated_by = $3, updated_at = NOW()
WHERE id = $2 AND purchase_request_id = $1 AND deleted_at IS NULL`, ticketID, itemID, nullActorID(actorID))
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	if err := refreshTicketTotalsTx(ctx, tx, ticketID); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *TicketRepository) PatchItemStatus(ctx context.Context, ticketID, itemID int64, in TicketItemStatusInput, actorID int64) error {
	if _, ok := ticketItemStatuses[in.Status]; !ok {
		return ErrValidation
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck

	parentStatus, err := lockTicketStatusTx(ctx, tx, ticketID)
	if err != nil {
		return err
	}
	if ticketLinesLocked(parentStatus) {
		return ErrValidation
	}
	var curStatus string
	if err := tx.QueryRowContext(ctx, `
SELECT status::text FROM purchase_request_item
WHERE id = $2 AND purchase_request_id = $1 AND deleted_at IS NULL FOR UPDATE`, ticketID, itemID).Scan(&curStatus); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE purchase_request_item SET status = $2::purchase_request_status, updated_by = $3, updated_at = NOW()
WHERE id = $1`, itemID, in.Status, nullActorID(actorID)); err != nil {
		return err
	}
	if in.Status == "rejected" {
		// v1: approve any open reject rows, or record one so the rejection has a reason trail.
		res, err := tx.ExecContext(ctx, `
UPDATE purchase_request_item_reject SET status = 'approved', updated_by = $2, updated_at = NOW()
WHERE purchase_request_item_id = $1 AND deleted_at IS NULL AND status = 'pending'`,
			itemID, nullActorID(actorID))
		if err != nil {
			return err
		}
		if n, _ := res.RowsAffected(); n == 0 {
			if _, err := tx.ExecContext(ctx, `
INSERT INTO purchase_request_item_reject (purchase_request_item_id, status, type, note, created_by, updated_by)
VALUES ($1, 'cancelled', 'reject', $2, $3, $3)`, itemID, in.Reason, nullActorID(actorID)); err != nil {
				return err
			}
		}
	}
	if err := insertTicketItemHistoryTx(ctx, tx, ticketID, itemID, &curStatus, &in.Status, actorID); err != nil {
		return err
	}
	if err := rejectTicketIfAllItemsRejectedTx(ctx, tx, ticketID, actorID); err != nil {
		return err
	}
	return tx.Commit()
}

// rejectTicketIfAllItemsRejectedTx mirrors v1 service.rejectIfAllItemsRejected.
func rejectTicketIfAllItemsRejectedTx(ctx context.Context, tx *sql.Tx, ticketID, actorID int64) error {
	var total, rejected int64
	if err := tx.QueryRowContext(ctx, `
SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'rejected')
FROM purchase_request_item WHERE purchase_request_id = $1 AND deleted_at IS NULL`,
		ticketID).Scan(&total, &rejected); err != nil {
		return err
	}
	if total == 0 || total != rejected {
		return nil
	}
	var curStatus string
	if err := tx.QueryRowContext(ctx, `
SELECT status::text FROM purchase_request WHERE id = $1`, ticketID).Scan(&curStatus); err != nil {
		return err
	}
	if curStatus == "rejected" {
		return nil
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE purchase_request SET status = 'rejected', updated_by = $2, updated_at = NOW()
WHERE id = $1`, ticketID, nullActorID(actorID)); err != nil {
		return err
	}
	rejectedStatus := "rejected"
	return insertTicketHistoryTx(ctx, tx, ticketID, &curStatus, &rejectedStatus, actorID)
}

func lockTicketStatusTx(ctx context.Context, tx *sql.Tx, ticketID int64) (string, error) {
	var status string
	err := tx.QueryRowContext(ctx, `
SELECT status::text FROM purchase_request WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`, ticketID).Scan(&status)
	if errors.Is(err, sql.ErrNoRows) {
		return "", ErrNotFound
	}
	return status, err
}

func assertTicketItemBelongsTx(ctx context.Context, tx *sql.Tx, ticketID, itemID int64) error {
	var ok bool
	err := tx.QueryRowContext(ctx, `
SELECT TRUE FROM purchase_request_item
WHERE id = $2 AND purchase_request_id = $1 AND deleted_at IS NULL`, ticketID, itemID).Scan(&ok)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}
	return err
}

// parseOptionalRejectDate accepts YYYY-MM-DD (preferred) or RFC3339.
func parseOptionalRejectDate(s *string) (*time.Time, error) {
	if s == nil {
		return nil, nil
	}
	trimmed := strings.TrimSpace(*s)
	if trimmed == "" {
		return nil, nil
	}
	if t, err := time.Parse("2006-01-02", trimmed); err == nil {
		return &t, nil
	}
	if t, err := time.Parse(time.RFC3339, trimmed); err == nil {
		return &t, nil
	}
	return nil, ErrValidation
}

func (r *TicketRepository) CreateItemReject(ctx context.Context, ticketID, itemID int64, in TicketItemRejectInput, actorID int64) (int64, error) {
	if _, ok := ticketItemRejectTypes[in.Type]; !ok {
		return 0, ErrValidation
	}
	status := in.Status
	if status == "" {
		status = "pending"
	}
	if _, ok := ticketItemRejectStatuses[status]; !ok {
		return 0, ErrValidation
	}
	if in.Type == "change" && (in.ProductItemID == nil || *in.ProductItemID <= 0) {
		return 0, ErrValidation
	}
	date, err := parseOptionalRejectDate(in.Date)
	if err != nil {
		return 0, ErrValidation
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback() //nolint:errcheck

	if err := assertTicketItemBelongsTx(ctx, tx, ticketID, itemID); err != nil {
		return 0, err
	}
	var id int64
	if err := tx.QueryRowContext(ctx, `
INSERT INTO purchase_request_item_reject (
  purchase_request_item_id, status, type, note, date, product_item_id, created_by, updated_by
) VALUES ($1, $2::purchase_request_item_reject_status, $3::purchase_request_item_reject_type, $4, $5, $6, $7, $7)
RETURNING id`,
		itemID, status, in.Type, in.Note, date, in.ProductItemID, nullActorID(actorID)).Scan(&id); err != nil {
		return 0, err
	}
	return id, tx.Commit()
}

// PatchItemRejectStatus approves or cancels a reject and applies the v1 line-status consequence.
func (r *TicketRepository) PatchItemRejectStatus(ctx context.Context, ticketID, rejectID int64, status string, actorID int64) error {
	if _, ok := ticketItemRejectStatuses[status]; !ok {
		return ErrValidation
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck

	var itemID int64
	var rejectType string
	var productItemID sql.NullInt64
	err = tx.QueryRowContext(ctx, `
SELECT rj.purchase_request_item_id, rj.type::text, rj.product_item_id
FROM purchase_request_item_reject rj
INNER JOIN purchase_request_item ri ON ri.id = rj.purchase_request_item_id AND ri.deleted_at IS NULL
WHERE rj.id = $2 AND ri.purchase_request_id = $1 AND rj.deleted_at IS NULL
FOR UPDATE OF rj`, ticketID, rejectID).Scan(&itemID, &rejectType, &productItemID)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE purchase_request_item_reject
SET status = $2::purchase_request_item_reject_status, updated_by = $3, updated_at = NOW()
WHERE id = $1`, rejectID, status, nullActorID(actorID)); err != nil {
		return err
	}
	if status == "approved" {
		// change swaps the requested product; wait keeps the line open; stop/reject close it.
		if rejectType == "change" && productItemID.Valid {
			if _, err := tx.ExecContext(ctx, `
UPDATE purchase_request_item SET product_item_id = $2, updated_by = $3, updated_at = NOW()
WHERE id = $1`, itemID, productItemID.Int64, nullActorID(actorID)); err != nil {
				return err
			}
		}
		lineStatus := "approved"
		switch rejectType {
		case "change", "wait":
			lineStatus = "pending"
		case "stop", "reject":
			lineStatus = "rejected"
		}
		if _, err := tx.ExecContext(ctx, `
UPDATE purchase_request_item SET status = $2::purchase_request_status, updated_by = $3, updated_at = NOW()
WHERE id = $1`, itemID, lineStatus, nullActorID(actorID)); err != nil {
			return err
		}
		if err := insertTicketItemHistoryTx(ctx, tx, ticketID, itemID, nil, &lineStatus, actorID); err != nil {
			return err
		}
		if err := rejectTicketIfAllItemsRejectedTx(ctx, tx, ticketID, actorID); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// AutoApproveIfAllPurchasesComplete mirrors v1 autostatus_from_purchases.go.
func (r *TicketRepository) AutoApproveIfAllPurchasesComplete(ctx context.Context, ticketID, actorID int64) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck

	var curStatus string
	if err := tx.QueryRowContext(ctx, `
SELECT status::text FROM purchase_request WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`, ticketID).Scan(&curStatus); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	if curStatus != "pending" {
		return tx.Commit()
	}
	var poTotal, poOpen int64
	if err := tx.QueryRowContext(ctx, `
SELECT COUNT(*), COUNT(*) FILTER (WHERE status NOT IN ('completed', 'receive_completed', 'cancelled'))
FROM purchase_order WHERE purchase_request_id = $1 AND deleted_at IS NULL`,
		ticketID).Scan(&poTotal, &poOpen); err != nil {
		return err
	}
	if poTotal == 0 || poOpen > 0 {
		return tx.Commit()
	}
	var lineTotal, lineApproved int64
	if err := tx.QueryRowContext(ctx, `
SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'approved')
FROM purchase_request_item
WHERE purchase_request_id = $1 AND deleted_at IS NULL AND status NOT IN ('cancelled', 'rejected')`,
		ticketID).Scan(&lineTotal, &lineApproved); err != nil {
		return err
	}
	if lineTotal == 0 || lineTotal != lineApproved {
		return tx.Commit()
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE purchase_request SET status = 'approved', updated_by = $2, updated_at = NOW()
WHERE id = $1`, ticketID, nullActorID(actorID)); err != nil {
		return err
	}
	approved := "approved"
	if err := insertTicketHistoryTx(ctx, tx, ticketID, &curStatus, &approved, actorID); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *TicketRepository) History(ctx context.Context, ticketID int64, locale string) (TicketHistoryResponse, error) {
	return purchaseHistoryFor(ctx, r.db, "purchase_request_id", ticketID, locale)
}

func insertTicketHistoryTx(ctx context.Context, tx *sql.Tx, ticketID int64, oldStatus, newStatus *string, actorID int64) error {
	return insertPurchaseHistoryTx(ctx, tx, purchaseHistoryRef{RequestID: &ticketID}, oldStatus, newStatus, actorID)
}

func insertTicketItemHistoryTx(ctx context.Context, tx *sql.Tx, ticketID, itemID int64, oldStatus, newStatus *string, actorID int64) error {
	return insertPurchaseHistoryTx(ctx, tx,
		purchaseHistoryRef{RequestID: &ticketID, RequestItemID: &itemID}, oldStatus, newStatus, actorID)
}

func nullActorID(id int64) any {
	if id <= 0 {
		return nil
	}
	return id
}
