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
	"github.com/lMikadal/warehouse/backend/internal/module/product"
	"github.com/lMikadal/warehouse/backend/internal/module/system"
)

type QuotationRepository struct {
	db   *sql.DB
	code *system.CodePrefixRepository
}

func NewQuotationRepository(db *sql.DB) *QuotationRepository {
	return &QuotationRepository{db: db, code: system.NewCodePrefixRepository(db)}
}

func quotationLineTotal(amount, price, discount float64) float64 {
	return math.Max(0, amount*price-discount)
}

func parseDatePtr(s *string) (*time.Time, error) {
	if s == nil || strings.TrimSpace(*s) == "" {
		return nil, nil
	}
	t, err := time.Parse("2006-01-02", strings.TrimSpace(*s))
	if err != nil {
		return nil, ErrValidation
	}
	return &t, nil
}

func formatDatePtr(t *time.Time) *string {
	if t == nil {
		return nil
	}
	s := t.Format("2006-01-02")
	return &s
}

func quotationShouldAllocateSKU(status string) bool {
	switch status {
	case "pending", "approved", "success":
		return true
	default:
		return false
	}
}

func (r *QuotationRepository) IsActiveAdminUser(ctx context.Context, id int64) (bool, error) {
	var ok bool
	err := r.db.QueryRowContext(ctx, `
SELECT EXISTS (
  SELECT 1 FROM admin_user WHERE id = $1 AND deleted_at IS NULL AND status = 'active'
)`, id).Scan(&ok)
	return ok, err
}

func (r *QuotationRepository) receiptLocked(ctx context.Context, qid int64) (bool, error) {
	var ok bool
	err := r.db.QueryRowContext(ctx, `
SELECT EXISTS (
  SELECT 1 FROM order_payment
  WHERE order_quotation_id = $1 AND deleted_at IS NULL AND is_paid = TRUE
)`, qid).Scan(&ok)
	return ok, err
}

func (r *QuotationRepository) fulfilled(ctx context.Context, qid int64) (bool, error) {
	var ok bool
	err := r.db.QueryRowContext(ctx, `
SELECT EXISTS (
  SELECT 1 FROM order_list ol
  INNER JOIN order_list_shipping s ON s.order_list_id = ol.id
  WHERE ol.order_quotation_id = $1 AND ol.deleted_at IS NULL
)`, qid).Scan(&ok)
	return ok, err
}

func quotationIsOverdue(status string, validUntil *time.Time, now time.Time) bool {
	if validUntil == nil {
		return false
	}
	switch status {
	case "draft", "pending", "approved":
		d := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		v := time.Date(validUntil.Year(), validUntil.Month(), validUntil.Day(), 0, 0, 0, 0, validUntil.Location())
		return v.Before(d)
	default:
		return false
	}
}

func quotationListWhere(q QuotationListQuery) (string, []any) {
	parts := []string{"q.deleted_at IS NULL"}
	args := []any{}
	if s := strings.TrimSpace(q.Status); s != "" {
		args = append(args, s)
		parts = append(parts, fmt.Sprintf("q.status = $%d::order_quotation_status", len(args)))
	}
	if q.Overdue {
		parts = append(parts, `q.valid_until IS NOT NULL AND q.valid_until < CURRENT_DATE AND q.status IN ('draft','pending','approved')`)
	}
	if q.Search != "" {
		args = append(args, "%"+strings.ToLower(q.Search)+"%")
		n := len(args)
		parts = append(parts, fmt.Sprintf("(LOWER(COALESCE(q.sku, '')) LIKE $%d OR LOWER(COALESCE(q.member_name, '')) LIKE $%d)", n, n))
	}
	if q.DateFrom != "" {
		args = append(args, q.DateFrom)
		parts = append(parts, fmt.Sprintf("q.created_at >= $%d::timestamptz", len(args)))
	}
	if q.DateTo != "" {
		args = append(args, q.DateTo)
		parts = append(parts, fmt.Sprintf("q.created_at <= $%d::timestamptz", len(args)))
	}
	if q.CreatedBy != nil && *q.CreatedBy > 0 {
		args = append(args, *q.CreatedBy)
		parts = append(parts, fmt.Sprintf("q.created_by = $%d", len(args)))
	}
	return strings.Join(parts, " AND "), args
}

const quotationListSelect = `
SELECT q.id, COALESCE(q.sku, ''), q.status::text, q.member_name,
  q.grand_total::float8,
  (SELECT COALESCE(SUM(i.amount), 0) FROM order_quotation_item i WHERE i.order_quotation_id = q.id AND i.deleted_at IS NULL),
  q.valid_until, q.created_at,
  (SELECT u.username FROM admin_user u WHERE u.id = q.created_by),
  EXISTS (
    SELECT 1 FROM order_list ol
    INNER JOIN order_list_shipping s ON s.order_list_id = ol.id
    WHERE ol.order_quotation_id = q.id AND ol.deleted_at IS NULL
  ),
  EXISTS (SELECT 1 FROM order_payment op WHERE op.order_quotation_id = q.id AND op.deleted_at IS NULL AND op.is_paid = TRUE)
FROM order_quotation q`

func (r *QuotationRepository) List(ctx context.Context, q QuotationListQuery) (QuotationListResponse, error) {
	where, args := quotationListWhere(q)
	var total int
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM order_quotation q WHERE `+where, args...).Scan(&total); err != nil {
		return QuotationListResponse{}, err
	}
	if q.Page <= 0 {
		q.Page = 1
	}
	if q.Limit <= 0 {
		q.Limit = 10
	}
	offset := (q.Page - 1) * q.Limit
	args = append(args, q.Limit, offset)
	li, oi := len(args)-1, len(args)
	rows, err := r.db.QueryContext(ctx, quotationListSelect+`
WHERE `+where+`
ORDER BY q.created_at DESC, q.id DESC
LIMIT $`+fmt.Sprint(li)+` OFFSET $`+fmt.Sprint(oi), args...)
	if err != nil {
		return QuotationListResponse{}, err
	}
	defer rows.Close()
	now := time.Now()
	items := []QuotationListItem{}
	for rows.Next() {
		var row QuotationListItem
		var memberName, createdBy sql.NullString
		var validUntil sql.NullTime
		if err := rows.Scan(&row.ID, &row.SKU, &row.Status, &memberName, &row.GrandTotal, &row.ItemCount,
			&validUntil, &row.CreatedAt, &createdBy, &row.Fulfilled, &row.ReceiptLocked); err != nil {
			return QuotationListResponse{}, err
		}
		if memberName.Valid {
			row.MemberName = &memberName.String
		}
		if createdBy.Valid {
			row.CreatedByName = &createdBy.String
		}
		var vu *time.Time
		if validUntil.Valid {
			vu = &validUntil.Time
		}
		row.IsOverdue = quotationIsOverdue(row.Status, vu, now)
		items = append(items, row)
	}
	return QuotationListResponse{Items: items, Total: total, Page: q.Page, Limit: q.Limit}, rows.Err()
}

func (r *QuotationRepository) Count(ctx context.Context, q QuotationListQuery) (QuotationCountResponse, error) {
	q.Status = ""
	q.Overdue = false
	where, args := quotationListWhere(q)
	rows, err := r.db.QueryContext(ctx, `
SELECT q.status::text, COUNT(*)
FROM order_quotation q
WHERE `+where+`
GROUP BY q.status`, args...)
	if err != nil {
		return QuotationCountResponse{}, err
	}
	defer rows.Close()
	resp := QuotationCountResponse{ByStatus: map[string]int64{}}
	for rows.Next() {
		var st string
		var n int64
		if err := rows.Scan(&st, &n); err != nil {
			return QuotationCountResponse{}, err
		}
		resp.ByStatus[st] = n
		resp.Count += n
	}
	if err := rows.Err(); err != nil {
		return QuotationCountResponse{}, err
	}
	owhere, oargs := quotationListWhere(QuotationListQuery{Overdue: true, Search: q.Search, DateFrom: q.DateFrom, DateTo: q.DateTo, CreatedBy: q.CreatedBy})
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM order_quotation q WHERE `+owhere, oargs...).Scan(&resp.Overdue); err != nil {
		return QuotationCountResponse{}, err
	}
	return resp, nil
}

func (r *QuotationRepository) SellerFilters(ctx context.Context, page, limit int, search string, id int64) (QuotationFiltersResponse, error) {
	store := StoreSalesRepository{db: r.db}
	sr, err := store.SellerFilters(ctx, page, limit, search, id)
	if err != nil {
		return QuotationFiltersResponse{}, err
	}
	out := QuotationFiltersResponse{}
	out.Meta = sr.Meta
	for _, it := range sr.Items {
		out.Items = append(out.Items, QuotationFilterItem{ID: it.ID, Name: it.Name})
	}
	return out, nil
}

func (r *QuotationRepository) GetByID(ctx context.Context, id int64) (QuotationDetail, error) {
	var d QuotationDetail
	var sku sql.NullString
	var parentID, memberUserID, creditID sql.NullInt64
	var memberName, memberTel, memberEmail, notes sql.NullString
	var issueDate, validUntil, creditDate sql.NullTime
	var acceptMode sql.NullString
	var acceptedAt sql.NullTime
	var createdByName sql.NullString

	err := r.db.QueryRowContext(ctx, `
SELECT q.id, q.sku, q.status::text, q.parent_id,
  q.member_user_id, q.member_setting_credit_id, q.member_name, q.member_tel, q.member_email,
  q.issue_date, q.valid_until, q.reserve_stock, q.notes,
  q.accept_mode::text, q.accepted_at, q.credit_date,
  q.vat_type::text, q.vat_rate::float8,
  q.subtotal_ex_vat::float8, q.discount_total::float8, q.vat_amount::float8, q.grand_total::float8,
  q.created_at, q.updated_at,
  (SELECT u.username FROM admin_user u WHERE u.id = q.created_by)
FROM order_quotation q
WHERE q.id = $1 AND q.deleted_at IS NULL`, id).Scan(
		&d.ID, &sku, &d.Status, &parentID,
		&memberUserID, &creditID, &memberName, &memberTel, &memberEmail,
		&issueDate, &validUntil, &d.ReserveStock, &notes,
		&acceptMode, &acceptedAt, &creditDate,
		&d.VatType, &d.VatRate,
		&d.SubtotalExVat, &d.DiscountTotal, &d.VatAmount, &d.GrandTotal,
		&d.CreatedAt, &d.UpdatedAt, &createdByName,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return d, ErrNotFound
	}
	if err != nil {
		return d, err
	}
	if sku.Valid {
		d.SKU = sku.String
	}
	if parentID.Valid {
		d.ParentID = &parentID.Int64
	}
	if memberUserID.Valid {
		d.MemberUserID = &memberUserID.Int64
	}
	if creditID.Valid {
		d.MemberSettingCreditID = &creditID.Int64
	}
	if memberName.Valid {
		d.MemberName = &memberName.String
	}
	if memberTel.Valid {
		d.MemberTel = &memberTel.String
	}
	if memberEmail.Valid {
		d.MemberEmail = &memberEmail.String
	}
	if issueDate.Valid {
		d.IssueDate = formatDatePtr(&issueDate.Time)
	}
	if validUntil.Valid {
		d.ValidUntil = formatDatePtr(&validUntil.Time)
	}
	if notes.Valid {
		d.Notes = &notes.String
	}
	if acceptMode.Valid {
		s := acceptMode.String
		d.AcceptMode = &s
	}
	if acceptedAt.Valid {
		d.AcceptedAt = &acceptedAt.Time
	}
	if creditDate.Valid {
		d.CreditDate = formatDatePtr(&creditDate.Time)
	}
	if createdByName.Valid {
		d.CreatedByName = &createdByName.String
	}
	d.Fulfilled, _ = r.fulfilled(ctx, id)
	d.ReceiptLocked, _ = r.receiptLocked(ctx, id)
	var vu *time.Time
	if validUntil.Valid {
		vu = &validUntil.Time
	}
	d.IsOverdue = quotationIsOverdue(d.Status, vu, time.Now())

	d.Items, err = r.loadItems(ctx, id)
	if err != nil {
		return d, err
	}
	d.Files, err = r.loadFiles(ctx, id)
	if err != nil {
		return d, err
	}
	d.LatestReject, err = r.loadLatestReject(ctx, id)
	return d, err
}

func (r *QuotationRepository) loadLatestReject(ctx context.Context, qid int64) (*QuotationLatestReject, error) {
	var lr QuotationLatestReject
	var createdByName sql.NullString
	err := r.db.QueryRowContext(ctx, `
SELECT r.note, r.status::text, r.next_status::text, r.created_at,
  (SELECT u.username FROM admin_user u WHERE u.id = r.created_by)
FROM order_quotation_reject r
WHERE r.order_quotation_id = $1
ORDER BY r.id DESC
LIMIT 1`, qid).Scan(&lr.Note, &lr.Status, &lr.NextStatus, &lr.CreatedAt, &createdByName)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if createdByName.Valid {
		lr.CreatedByName = &createdByName.String
	}
	return &lr, nil
}

func (r *QuotationRepository) loadItems(ctx context.Context, qid int64) ([]QuotationItemDetail, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT id, product_item_id, amount::float8, price_per_unit::float8, discount::float8,
  vat_type::text, vat_rate::float8, total_price::float8, sort_order
FROM order_quotation_item
WHERE order_quotation_id = $1 AND deleted_at IS NULL
ORDER BY sort_order ASC, id ASC`, qid)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []QuotationItemDetail{}
	for rows.Next() {
		var it QuotationItemDetail
		var pid sql.NullInt64
		if err := rows.Scan(&it.ID, &pid, &it.Amount, &it.PricePerUnit, &it.Discount,
			&it.VatType, &it.VatRate, &it.TotalPrice, &it.SortOrder); err != nil {
			return nil, err
		}
		if pid.Valid {
			it.ProductItemID = &pid.Int64
		}
		out = append(out, it)
	}
	return out, rows.Err()
}

func (r *QuotationRepository) loadFiles(ctx context.Context, qid int64) ([]QuotationFileDetail, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT f.id, f.system_file_id, f.sort_order, COALESCE(sf.original_name, '')
FROM order_quotation_file f
LEFT JOIN system_file sf ON sf.id = f.system_file_id
WHERE f.order_quotation_id = $1 AND f.deleted_at IS NULL
ORDER BY f.sort_order ASC, f.id ASC`, qid)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []QuotationFileDetail{}
	for rows.Next() {
		var f QuotationFileDetail
		if err := rows.Scan(&f.ID, &f.SystemFileID, &f.SortOrder, &f.FileName); err != nil {
			return nil, err
		}
		out = append(out, f)
	}
	return out, rows.Err()
}

func (r *QuotationRepository) activeVat(ctx context.Context, tx *sql.Tx) (vatSnapshot, error) {
	return activeSettingVatTx(ctx, tx)
}

func (r *QuotationRepository) recalcHeader(ctx context.Context, tx *sql.Tx, qid int64) error {
	snap, err := r.activeVat(ctx, tx)
	if err != nil {
		return err
	}
	var subtotal, discountTotal float64
	err = tx.QueryRowContext(ctx, `
SELECT COALESCE(SUM(amount * price_per_unit), 0), COALESCE(SUM(discount), 0)
FROM order_quotation_item WHERE order_quotation_id = $1 AND deleted_at IS NULL`, qid).Scan(&subtotal, &discountTotal)
	if err != nil {
		return err
	}
	net := math.Max(0, subtotal-discountTotal)
	vatAmt := net * snap.VatRate / 100
	grand := net + vatAmt
	if snap.VatType == "include" {
		grand = net
		vatAmt = grand * snap.VatRate / (100 + snap.VatRate)
		net = grand - vatAmt
	}
	_, err = tx.ExecContext(ctx, `
UPDATE order_quotation SET
  vat_type = $2::setting_vat_type, vat_rate = $3,
  subtotal_ex_vat = $4, discount_total = $5, vat_amount = $6, grand_total = $7,
  updated_at = NOW()
WHERE id = $1`, qid, snap.VatType, snap.VatRate, net, discountTotal, vatAmt, grand)
	return err
}

func (r *QuotationRepository) replaceItems(ctx context.Context, tx *sql.Tx, qid int64, items []QuotationItemInput, actor int64) error {
	snap, err := r.activeVat(ctx, tx)
	if err != nil {
		return err
	}
	keepIDs := make([]int64, 0, len(items))
	for i, it := range items {
		if it.Amount <= 0 {
			continue
		}
		lineSnap := snap
		if it.ProductItemID != nil && *it.ProductItemID > 0 {
			lineSnap, err = lineVatTx(ctx, tx, it.ProductItemID, snap)
			if err != nil {
				return err
			}
		}
		total := quotationLineTotal(it.Amount, it.PricePerUnit, it.Discount)
		if it.ID != nil && *it.ID > 0 {
			res, err := tx.ExecContext(ctx, `
UPDATE order_quotation_item SET
  product_item_id = $2, sort_order = $3, amount = $4, price_per_unit = $5, discount = $6,
  vat_type = $7::setting_vat_type, vat_rate = $8, total_price = $9,
  updated_by = $10, updated_at = NOW()
WHERE id = $1 AND order_quotation_id = $11 AND deleted_at IS NULL`,
				*it.ID, it.ProductItemID, i, it.Amount, it.PricePerUnit, it.Discount,
				lineSnap.VatType, lineSnap.VatRate, total, actor, qid)
			if err != nil {
				return err
			}
			n, _ := res.RowsAffected()
			if n > 0 {
				keepIDs = append(keepIDs, *it.ID)
				continue
			}
		}
		var newID int64
		err = tx.QueryRowContext(ctx, `
INSERT INTO order_quotation_item (
  order_quotation_id, product_item_id, sort_order, amount, price_per_unit, discount,
  vat_type, vat_rate, total_price, created_by, updated_by
) VALUES ($1, $2, $3, $4, $5, $6, $7::setting_vat_type, $8, $9, $10, $10)
RETURNING id`,
			qid, it.ProductItemID, i, it.Amount, it.PricePerUnit, it.Discount,
			lineSnap.VatType, lineSnap.VatRate, total, actor).Scan(&newID)
		if err != nil {
			return err
		}
		keepIDs = append(keepIDs, newID)
	}
	keepSet := make(map[int64]struct{}, len(keepIDs))
	for _, id := range keepIDs {
		keepSet[id] = struct{}{}
	}
	rows, err := tx.QueryContext(ctx, `
SELECT id FROM order_quotation_item WHERE order_quotation_id = $1 AND deleted_at IS NULL`, qid)
	if err != nil {
		return err
	}
	var orphanIDs []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			rows.Close()
			return err
		}
		if _, ok := keepSet[id]; !ok {
			orphanIDs = append(orphanIDs, id)
		}
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return err
	}
	for _, oid := range orphanIDs {
		if _, err := tx.ExecContext(ctx, `
UPDATE order_quotation_item SET deleted_at = NOW(), updated_at = NOW()
WHERE id = $1 AND order_quotation_id = $2 AND deleted_at IS NULL`, oid, qid); err != nil {
			return err
		}
	}
	return r.recalcHeader(ctx, tx, qid)
}

func (r *QuotationRepository) replaceFiles(ctx context.Context, tx *sql.Tx, qid int64, fileIDs []int64, actor int64) error {
	if len(fileIDs) > 5 {
		return ErrValidation
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE order_quotation_file SET deleted_at = NOW(), updated_at = NOW()
WHERE order_quotation_id = $1 AND deleted_at IS NULL`, qid); err != nil {
		return err
	}
	for i, fid := range fileIDs {
		if fid <= 0 {
			continue
		}
		_, err := tx.ExecContext(ctx, `
INSERT INTO order_quotation_file (order_quotation_id, system_file_id, sort_order, created_by, updated_by)
VALUES ($1, $2, $3, $4, $4)`, qid, fid, i, actor)
		if err != nil {
			return err
		}
	}
	return nil
}

func (r *QuotationRepository) ensureSKU(ctx context.Context, tx *sql.Tx, id int64, status string) error {
	if !quotationShouldAllocateSKU(status) {
		return nil
	}
	var cur sql.NullString
	if err := tx.QueryRowContext(ctx, `SELECT sku FROM order_quotation WHERE id = $1 FOR UPDATE`, id).Scan(&cur); err != nil {
		return err
	}
	if cur.Valid && cur.String != "" {
		return nil
	}
	sku, err := r.code.NextCode(ctx, tx, "order_quotation", time.Now())
	if err != nil {
		return err
	}
	_, err = tx.ExecContext(ctx, `UPDATE order_quotation SET sku = $2 WHERE id = $1`, id, sku)
	return err
}

func (r *QuotationRepository) Create(ctx context.Context, in QuotationCreateInput, actor int64) (int64, error) {
	status := strings.TrimSpace(in.Status)
	if status == "" {
		status = "draft"
	}
	if status != "draft" && status != "pending" {
		return 0, ErrValidation
	}
	if len(in.Items) == 0 {
		return 0, ErrValidation
	}
	issue, err := parseDatePtr(in.IssueDate)
	if err != nil {
		return 0, err
	}
	valid, err := parseDatePtr(in.ValidUntil)
	if err != nil {
		return 0, err
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	snap, err := r.activeVat(ctx, tx)
	if err != nil {
		return 0, err
	}
	var id int64
	err = tx.QueryRowContext(ctx, `
INSERT INTO order_quotation (
  status, parent_id, member_user_id, member_setting_credit_id,
  member_name, member_tel, member_email, issue_date, valid_until,
  reserve_stock, notes, vat_type, vat_rate, created_by, updated_by
) VALUES (
  $1::order_quotation_status, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
  $12::setting_vat_type, $13, $14, $14
) RETURNING id`,
		status, in.ParentID, in.MemberUserID, in.MemberSettingCreditID,
		in.MemberName, in.MemberTel, in.MemberEmail, issue, valid,
		in.ReserveStock, in.Notes, snap.VatType, snap.VatRate, actor,
	).Scan(&id)
	if err != nil {
		return 0, err
	}
	if err := r.replaceItems(ctx, tx, id, in.Items, actor); err != nil {
		return 0, err
	}
	if err := r.replaceFiles(ctx, tx, id, in.FileIDs, actor); err != nil {
		return 0, err
	}
	if err := r.ensureSKU(ctx, tx, id, status); err != nil {
		return 0, err
	}
	if err := tx.Commit(); err != nil {
		return 0, err
	}
	return id, nil
}

func (r *QuotationRepository) canEdit(ctx context.Context, id int64, allowSuperadmin bool) (status string, locked bool, err error) {
	if err := r.db.QueryRowContext(ctx, `
SELECT status::text FROM order_quotation WHERE id = $1 AND deleted_at IS NULL`, id).Scan(&status); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", false, ErrNotFound
		}
		return "", false, err
	}
	locked, err = r.receiptLocked(ctx, id)
	if err != nil {
		return "", false, err
	}
	if locked && !allowSuperadmin {
		return status, true, ErrValidation
	}
	return status, locked, nil
}

func (r *QuotationRepository) Update(ctx context.Context, id int64, in QuotationUpdateInput, actor int64, allowSuperadmin bool) error {
	status, _, err := r.canEdit(ctx, id, allowSuperadmin)
	if err != nil {
		return err
	}
	switch status {
	case "draft":
	case "pending":
		if !allowSuperadmin {
			return ErrValidation
		}
	default:
		return ErrValidation
	}
	issue, err := parseDatePtr(in.IssueDate)
	if err != nil {
		return err
	}
	valid, err := parseDatePtr(in.ValidUntil)
	if err != nil {
		return err
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	reserve := in.ReserveStock
	var reserveVal bool
	if reserve != nil {
		reserveVal = *reserve
	} else {
		_ = tx.QueryRowContext(ctx, `SELECT reserve_stock FROM order_quotation WHERE id = $1`, id).Scan(&reserveVal)
	}
	_, err = tx.ExecContext(ctx, `
UPDATE order_quotation SET
  member_user_id = COALESCE($2, member_user_id),
  member_setting_credit_id = COALESCE($3, member_setting_credit_id),
  member_name = COALESCE($4, member_name),
  member_tel = COALESCE($5, member_tel),
  member_email = COALESCE($6, member_email),
  issue_date = COALESCE($7, issue_date),
  valid_until = COALESCE($8, valid_until),
  reserve_stock = $9,
  notes = COALESCE($10, notes),
  updated_by = $11, updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL`,
		id, in.MemberUserID, in.MemberSettingCreditID, in.MemberName, in.MemberTel, in.MemberEmail,
		issue, valid, reserveVal, in.Notes, actor)
	if err != nil {
		return err
	}
	if in.Items != nil {
		if err := r.replaceItems(ctx, tx, id, in.Items, actor); err != nil {
			return err
		}
	}
	if in.FileIDs != nil {
		if err := r.replaceFiles(ctx, tx, id, in.FileIDs, actor); err != nil {
			return err
		}
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	return nil
}

func (r *QuotationRepository) PatchStatus(ctx context.Context, id int64, status string, actor int64, allowSuperadmin bool) error {
	cur, _, err := r.canEdit(ctx, id, allowSuperadmin)
	if err != nil {
		return err
	}
	if status != "cancelled" {
		return ErrValidation
	}
	if cur != "draft" && cur != "pending" && cur != "approved" && cur != "success" {
		return ErrValidation
	}
	_, err = r.db.ExecContext(ctx, `
UPDATE order_quotation SET status = $2::order_quotation_status, updated_by = $3, updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL`, id, status, actor)
	return err
}

func (r *QuotationRepository) Submit(ctx context.Context, id int64, actor int64) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var cur string
	if err := tx.QueryRowContext(ctx, `
SELECT status::text FROM order_quotation WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`, id).Scan(&cur); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	if cur != "draft" {
		return ErrValidation
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE order_quotation SET status = 'pending', updated_by = $2, updated_at = NOW() WHERE id = $1`, id, actor); err != nil {
		return err
	}
	if err := r.ensureSKU(ctx, tx, id, "pending"); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *QuotationRepository) Approve(ctx context.Context, id int64, actor int64) error {
	return r.transition(ctx, id, "pending", "success", actor)
}

func (r *QuotationRepository) Reject(ctx context.Context, id int64, actor int64) error {
	return r.transition(ctx, id, "pending", "cancelled", actor)
}

func (r *QuotationRepository) ReturnForEdit(ctx context.Context, id int64, note string, actor int64) error {
	note = strings.TrimSpace(note)
	if note == "" {
		return ErrValidation
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var cur string
	if err := tx.QueryRowContext(ctx, `
SELECT status::text FROM order_quotation WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`, id).Scan(&cur); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	if cur != "pending" {
		return ErrValidation
	}
	const next = "draft"
	if _, err := tx.ExecContext(ctx, `
INSERT INTO order_quotation_reject (order_quotation_id, note, status, next_status, created_by)
VALUES ($1, $2, $3::order_quotation_status, $4::order_quotation_status, $5)`,
		id, note, cur, next, actor); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE order_quotation SET status = $2::order_quotation_status, updated_by = $3, updated_at = NOW() WHERE id = $1`,
		id, next, actor); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *QuotationRepository) transition(ctx context.Context, id int64, from, to string, actor int64) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var cur string
	if err := tx.QueryRowContext(ctx, `
SELECT status::text FROM order_quotation WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`, id).Scan(&cur); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	if cur != from {
		return ErrValidation
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE order_quotation SET status = $2::order_quotation_status, updated_by = $3, updated_at = NOW() WHERE id = $1`,
		id, to, actor); err != nil {
		return err
	}
	if to == "approved" || to == "pending" || to == "success" {
		if err := r.ensureSKU(ctx, tx, id, to); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (r *QuotationRepository) Accept(ctx context.Context, id int64, in QuotationAcceptInput, actor int64) error {
	mode := strings.TrimSpace(in.Mode)
	if mode != "payment" && mode != "credit" {
		return ErrValidation
	}
	var cur string
	if err := r.db.QueryRowContext(ctx, `
SELECT status::text FROM order_quotation WHERE id = $1 AND deleted_at IS NULL`, id).Scan(&cur); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	if cur != "pending" && cur != "approved" && cur != "success" {
		return ErrValidation
	}
	var creditDate *time.Time
	if mode == "credit" {
		if in.CreditDate == nil || strings.TrimSpace(*in.CreditDate) == "" {
			return ErrValidation
		}
		cd, err := parseDatePtr(in.CreditDate)
		if err != nil || cd == nil {
			return ErrValidation
		}
		creditDate = cd
	}
	_, err := r.db.ExecContext(ctx, `
UPDATE order_quotation SET
  accept_mode = $2::order_quotation_accept_mode,
  accepted_at = NOW(),
  credit_date = $3,
  updated_by = $4, updated_at = NOW()
WHERE id = $1`, id, mode, creditDate, actor)
	return err
}

func (r *QuotationRepository) Payment(ctx context.Context, id int64, in QuotationPaymentInput, actor int64) error {
	var cur string
	var grand float64
	if err := r.db.QueryRowContext(ctx, `
SELECT status::text, grand_total::float8 FROM order_quotation WHERE id = $1 AND deleted_at IS NULL`, id).Scan(&cur, &grand); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	if cur != "approved" && cur != "success" {
		return ErrValidation
	}
	if len(in.Methods) == 0 {
		return ErrValidation
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var orderListID int64
	err = tx.QueryRowContext(ctx, `
SELECT id FROM order_list WHERE order_quotation_id = $1 AND deleted_at IS NULL ORDER BY id ASC LIMIT 1`, id).Scan(&orderListID)
	if errors.Is(err, sql.ErrNoRows) {
		snap, _ := r.activeVat(ctx, tx)
		err = tx.QueryRowContext(ctx, `
INSERT INTO order_list (status, member_user_id, member_setting_credit_id, member_name, member_tel, member_email,
  vat_type, vat_rate, order_quotation_id, ordered_at, created_by, updated_by)
SELECT 'pending', member_user_id, member_setting_credit_id, member_name, member_tel, member_email,
  vat_type, vat_rate, id, NOW(), $2, $2
FROM order_quotation WHERE id = $1
RETURNING id`, id, actor).Scan(&orderListID)
		if err != nil {
			return err
		}
		rows, err := tx.QueryContext(ctx, `
SELECT product_item_id, amount, price_per_unit, discount, vat_type, vat_rate, total_price
FROM order_quotation_item WHERE order_quotation_id = $1 AND deleted_at IS NULL ORDER BY sort_order, id`, id)
		if err != nil {
			return err
		}
		type quoteLine struct {
			pid                            sql.NullInt64
			amt, price, disc, vrate, total float64
			vtype                          string
		}
		var lines []quoteLine
		for rows.Next() {
			var line quoteLine
			if err := rows.Scan(&line.pid, &line.amt, &line.price, &line.disc, &line.vtype, &line.vrate, &line.total); err != nil {
				rows.Close()
				return err
			}
			lines = append(lines, line)
		}
		rows.Close()
		if err := rows.Err(); err != nil {
			return err
		}
		for _, line := range lines {
			_, err = tx.ExecContext(ctx, `
INSERT INTO order_list_item (order_list_id, product_item_id, type, amount, price_per_unit, discount, vat_type, vat_rate, total_price, created_by, updated_by)
VALUES ($1, $2, 'item', $3, $4, $5, $6::setting_vat_type, $7, $8, $9, $9)`,
				orderListID, line.pid, line.amt, line.price, line.disc, line.vtype, line.vrate, line.total, actor)
			if err != nil {
				return err
			}
		}
		_ = snap
	} else if err != nil {
		return err
	}

	var payID int64
	err = tx.QueryRowContext(ctx, `
SELECT id FROM order_payment WHERE order_quotation_id = $1 AND deleted_at IS NULL ORDER BY id DESC LIMIT 1`, id).Scan(&payID)
	if errors.Is(err, sql.ErrNoRows) {
		err = tx.QueryRowContext(ctx, `
INSERT INTO order_payment (order_list_id, order_quotation_id, payment_category, total_price, amount_paid, is_paid, credit_approved_by, created_by, updated_by)
VALUES ($1, $2, 'payment', $3, 0, FALSE, $4, $5, $5) RETURNING id`,
			orderListID, id, grand, in.CreditApprovedBy, actor).Scan(&payID)
		if err != nil {
			return err
		}
	} else if err != nil {
		return err
	}

	if err := r.syncPaymentItems(ctx, tx, payID, orderListID, actor); err != nil {
		return err
	}

	if _, err = tx.ExecContext(ctx, `
UPDATE order_payment_method SET deleted_at = NOW() WHERE order_payment_id = $1 AND deleted_at IS NULL`, payID); err != nil {
		return err
	}
	var paid float64
	for _, m := range in.Methods {
		if m.Amount <= 0 {
			continue
		}
		_, err = tx.ExecContext(ctx, `
INSERT INTO order_payment_method (order_payment_id, setting_payment_method_id, amount, created_by, updated_by)
VALUES ($1, $2, $3, $4, $4)`, payID, m.SettingPaymentMethodID, m.Amount, actor)
		if err != nil {
			return err
		}
		paid += m.Amount
	}
	isPaid := paid >= grand-0.0001
	_, err = tx.ExecContext(ctx, `
UPDATE order_payment SET amount_paid = $2, is_paid = $3, credit_approved_by = COALESCE($4, credit_approved_by), updated_at = NOW()
WHERE id = $1`, payID, paid, isPaid, in.CreditApprovedBy)
	if err != nil {
		return err
	}
	newStatus := cur
	if isPaid {
		newStatus = "success"
	}
	_, err = tx.ExecContext(ctx, `
UPDATE order_quotation SET status = $2::order_quotation_status, updated_by = $3, updated_at = NOW() WHERE id = $1`,
		id, newStatus, actor)
	if err != nil {
		return err
	}
	return tx.Commit()
}

func (r *QuotationRepository) Picking(ctx context.Context, id int64, in QuotationPickingInput, actor int64) (QuotationPickingResponse, error) {
	var resp QuotationPickingResponse
	var cur string
	if err := r.db.QueryRowContext(ctx, `
SELECT status::text FROM order_quotation WHERE id = $1 AND deleted_at IS NULL`, id).Scan(&cur); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return resp, ErrNotFound
		}
		return resp, err
	}
	if cur != "success" && cur != "approved" {
		return resp, ErrValidation
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return resp, err
	}
	defer tx.Rollback()

	var orderListID int64
	err = tx.QueryRowContext(ctx, `
SELECT id FROM order_list WHERE order_quotation_id = $1 AND deleted_at IS NULL ORDER BY id ASC LIMIT 1`, id).Scan(&orderListID)
	if errors.Is(err, sql.ErrNoRows) {
		err = tx.QueryRowContext(ctx, `
INSERT INTO order_list (status, fulfill_status, member_user_id, member_setting_credit_id, member_name, member_tel, member_email,
  vat_type, vat_rate, order_quotation_id, ordered_at, created_by, updated_by)
SELECT 'pending', 'pending', member_user_id, member_setting_credit_id, member_name, member_tel, member_email,
  vat_type, vat_rate, id, NOW(), $2, $2
FROM order_quotation WHERE id = $1
RETURNING id`, id, actor).Scan(&orderListID)
		if err != nil {
			return resp, err
		}
		sku, err := r.code.NextCode(ctx, tx, "order_list", time.Now())
		if err != nil {
			return resp, err
		}
		_, _ = tx.ExecContext(ctx, `UPDATE order_list SET sku = $2 WHERE id = $1`, orderListID, sku)

		rows, err := tx.QueryContext(ctx, `
SELECT product_item_id, amount, price_per_unit, discount, vat_type, vat_rate, total_price
FROM order_quotation_item WHERE order_quotation_id = $1 AND deleted_at IS NULL ORDER BY sort_order, id`, id)
		if err != nil {
			return resp, err
		}
		type quoteLine struct {
			pid                            sql.NullInt64
			amt, price, disc, vrate, total float64
			vtype                          string
		}
		var lines []quoteLine
		for rows.Next() {
			var line quoteLine
			if err := rows.Scan(&line.pid, &line.amt, &line.price, &line.disc, &line.vtype, &line.vrate, &line.total); err != nil {
				rows.Close()
				return resp, err
			}
			lines = append(lines, line)
		}
		rows.Close()
		if err := rows.Err(); err != nil {
			return resp, err
		}
		for _, line := range lines {
			if in.OnlyInStock && line.pid.Valid {
				var stock float64
				_ = tx.QueryRowContext(ctx, `
SELECT COALESCE(SUM(s.remain_quantity), 0) FROM product_item_stock s
JOIN product_item_warehouse w ON w.id = s.product_item_warehouse_id AND w.deleted_at IS NULL
WHERE w.product_item_id = $1 AND s.deleted_at IS NULL`, line.pid.Int64).Scan(&stock)
				if stock < line.amt {
					resp.OutOfStockCount++
					resp.Partial = true
					continue
				}
			}
			_, err = tx.ExecContext(ctx, `
INSERT INTO order_list_item (order_list_id, product_item_id, type, amount, price_per_unit, discount, vat_type, vat_rate, total_price, created_by, updated_by)
VALUES ($1, $2, 'item', $3, $4, $5, $6::setting_vat_type, $7, $8, $9, $9)`,
				orderListID, line.pid, line.amt, line.price, line.disc, line.vtype, line.vrate, line.total, actor)
			if err != nil {
				return resp, err
			}
		}
	} else if err != nil {
		return resp, err
	}
	resp.OrderListID = orderListID
	if resp.Partial {
		resp.Warnings = append(resp.Warnings, "partial_stock")
	}
	if err := tx.Commit(); err != nil {
		return resp, err
	}
	return resp, nil
}

func (r *QuotationRepository) syncPaymentItems(ctx context.Context, tx *sql.Tx, payID, orderListID, actor int64) error {
	if _, err := tx.ExecContext(ctx, `
UPDATE order_payment_item SET deleted_at = NOW(), updated_at = NOW(), updated_by = $2
WHERE order_payment_id = $1 AND deleted_at IS NULL`, payID, actor); err != nil {
		return err
	}
	rows, err := tx.QueryContext(ctx, `
SELECT id, amount::float8, vat_rate::float8, price_per_unit::float8, discount::float8, total_price::float8
FROM order_list_item
WHERE order_list_id = $1 AND deleted_at IS NULL
ORDER BY id`, orderListID)
	if err != nil {
		return err
	}
	type payLine struct {
		id                             int64
		amt, vrate, price, disc, total float64
	}
	var lines []payLine
	for rows.Next() {
		var line payLine
		if err := rows.Scan(&line.id, &line.amt, &line.vrate, &line.price, &line.disc, &line.total); err != nil {
			rows.Close()
			return err
		}
		lines = append(lines, line)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return err
	}
	for _, line := range lines {
		_, err = tx.ExecContext(ctx, `
INSERT INTO order_payment_item (
  order_payment_id, order_list_item_id, amount, vat_rate, price_per_unit, discount, total_price, created_by, updated_by
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
ON CONFLICT (order_payment_id, order_list_item_id) DO UPDATE SET
  amount = EXCLUDED.amount,
  vat_rate = EXCLUDED.vat_rate,
  price_per_unit = EXCLUDED.price_per_unit,
  discount = EXCLUDED.discount,
  total_price = EXCLUDED.total_price,
  deleted_at = NULL,
  updated_at = NOW(),
  updated_by = EXCLUDED.updated_by`,
			payID, line.id, line.amt, line.vrate, line.price, line.disc, line.total, actor)
		if err != nil {
			return err
		}
	}
	return nil
}

func (r *QuotationRepository) lineStock(ctx context.Context, q Querier, productItemID int64) (float64, error) {
	var stock float64
	err := q.QueryRowContext(ctx, `
SELECT COALESCE(SUM(s.remain_quantity), 0) FROM product_item_stock s
JOIN product_item_warehouse w ON w.id = s.product_item_warehouse_id AND w.deleted_at IS NULL
WHERE w.product_item_id = $1 AND s.deleted_at IS NULL`, productItemID).Scan(&stock)
	return stock, err
}

func (r *QuotationRepository) memberCreditLimit(ctx context.Context, memberUserID int64) (*float64, error) {
	var lim sql.NullFloat64
	err := r.db.QueryRowContext(ctx, `
SELECT credit_limit::float8 FROM member_user_address
WHERE member_user_id = $1 AND type = 'financial' AND deleted_at IS NULL
ORDER BY id ASC LIMIT 1`, memberUserID).Scan(&lim)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if !lim.Valid {
		return nil, nil
	}
	v := lim.Float64
	return &v, nil
}

func (r *QuotationRepository) verifyCreditApprovalCode(ctx context.Context, code string) (int64, error) {
	code = strings.TrimSpace(code)
	if code == "" {
		return 0, ErrUnauthorized
	}
	rows, err := r.db.QueryContext(ctx, `
SELECT id, password_credit_hash FROM admin_user
WHERE deleted_at IS NULL AND status = 'active' AND type = 'superadmin'
  AND password_credit_hash IS NOT NULL AND password_credit_hash <> ''`)
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
	return 0, ErrUnauthorized
}

func (r *QuotationRepository) productSellPrice(ctx context.Context, q Querier, productItemID int64) (float64, error) {
	var price float64
	err := q.QueryRowContext(ctx, fmt.Sprintf(`
SELECT COALESCE(%s, 0)::float8
FROM product_item i
%s
%s
WHERE i.id = $1 AND i.deleted_at IS NULL`,
		product.DisplayPriceSellSQL, product.DisplayPriceVatJoin, product.DisplayPriceStockLotJoin),
		productItemID).Scan(&price)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, nil
	}
	return price, err
}

func (r *QuotationRepository) FulfillCheck(ctx context.Context, id int64) (QuotationFulfillCheckResponse, error) {
	var resp QuotationFulfillCheckResponse
	var cur string
	var acceptMode sql.NullString
	var memberUserID sql.NullInt64
	var grand float64
	if err := r.db.QueryRowContext(ctx, `
SELECT status::text, accept_mode::text, member_user_id, grand_total::float8
FROM order_quotation WHERE id = $1 AND deleted_at IS NULL`, id).Scan(&cur, &acceptMode, &memberUserID, &grand); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return resp, ErrNotFound
		}
		return resp, err
	}
	if cur != "success" && cur != "approved" {
		return resp, ErrValidation
	}
	if !acceptMode.Valid || (acceptMode.String != "payment" && acceptMode.String != "credit") {
		return resp, ErrValidation
	}
	resp.AcceptMode = acceptMode.String
	resp.GrandTotal = grand

	rows, err := r.db.QueryContext(ctx, fmt.Sprintf(`
SELECT qi.product_item_id, qi.amount::float8, qi.price_per_unit::float8, COALESCE(%s, 0)::float8
FROM order_quotation_item qi
LEFT JOIN product_item i ON i.id = qi.product_item_id AND i.deleted_at IS NULL
%s
%s
WHERE qi.order_quotation_id = $1 AND qi.deleted_at IS NULL`,
		product.DisplayPriceSellSQL, product.DisplayPriceVatJoin, product.DisplayPriceStockLotJoin), id)
	if err != nil {
		return resp, err
	}
	defer rows.Close()
	for rows.Next() {
		var pid sql.NullInt64
		var amt, quotePrice, curPrice float64
		if err := rows.Scan(&pid, &amt, &quotePrice, &curPrice); err != nil {
			return resp, err
		}
		resp.ItemCount++
		if pid.Valid {
			stock, err := r.lineStock(ctx, r.db, pid.Int64)
			if err != nil {
				return resp, err
			}
			if stock < amt {
				resp.OutOfStockCount++
			}
			if math.Abs(quotePrice-curPrice) > 0.0001 {
				resp.PriceChangedCount++
			}
		}
	}
	if err := rows.Err(); err != nil {
		return resp, err
	}

	resp.CreditOK = true
	if acceptMode.String == "credit" {
		resp.CreditOK = false
		if memberUserID.Valid {
			lim, err := r.memberCreditLimit(ctx, memberUserID.Int64)
			if err != nil {
				return resp, err
			}
			resp.CreditLimit = lim
			if lim != nil && *lim+0.0001 >= grand {
				resp.CreditOK = true
			}
		}
	}
	return resp, nil
}

type Querier interface {
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
	QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
}

func (r *QuotationRepository) Fulfill(ctx context.Context, id int64, in QuotationFulfillInput, actor int64) (QuotationFulfillResponse, error) {
	var resp QuotationFulfillResponse
	check, err := r.FulfillCheck(ctx, id)
	if err != nil {
		return resp, err
	}
	if in.OnlyInStock {
		if check.ItemCount == 0 || check.OutOfStockCount >= check.ItemCount {
			return resp, ErrValidation
		}
	} else if check.OutOfStockCount > 0 {
		return resp, ErrValidation
	}

	var creditApprovedBy *int64
	if check.AcceptMode == "credit" && !check.CreditOK {
		code := ""
		if in.CreditApprovalCode != nil {
			code = *in.CreditApprovalCode
		}
		uid, err := r.verifyCreditApprovalCode(ctx, code)
		if err != nil {
			return resp, err
		}
		creditApprovedBy = &uid
	}
	if check.AcceptMode == "payment" && len(in.Methods) == 0 {
		return resp, ErrValidation
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return resp, err
	}
	defer tx.Rollback()

	fulfillID := id
	if in.OnlyInStock {
		newID, err := r.createPartialInStockQuotation(ctx, tx, id, actor)
		if err != nil {
			return resp, err
		}
		fulfillID = newID
		resp.QuotationID = &newID
	}

	var grand float64
	if err := tx.QueryRowContext(ctx, `
SELECT grand_total::float8 FROM order_quotation WHERE id = $1`, fulfillID).Scan(&grand); err != nil {
		return resp, err
	}

	methods := in.Methods
	if in.OnlyInStock && check.AcceptMode == "payment" {
		methods = normalizeFulfillMethods(in.Methods, grand)
	}

	orderListID, err := r.writeFulfillDocs(ctx, tx, fulfillID, check.AcceptMode, grand, methods, creditApprovedBy, actor, !in.OnlyInStock)
	if err != nil {
		return resp, err
	}

	if !in.OnlyInStock {
		if _, err = tx.ExecContext(ctx, `
UPDATE order_quotation SET status = 'success'::order_quotation_status, updated_by = $2, updated_at = NOW() WHERE id = $1`,
			fulfillID, actor); err != nil {
			return resp, err
		}
	}

	if err := tx.Commit(); err != nil {
		return resp, err
	}
	resp.OrderListID = orderListID
	return resp, nil
}

func normalizeFulfillMethods(methods []QuotationPaymentMethodInput, grand float64) []QuotationPaymentMethodInput {
	if grand <= 0 || len(methods) == 0 {
		return methods
	}
	out := make([]QuotationPaymentMethodInput, 0, 1)
	for _, m := range methods {
		if m.Amount <= 0 || m.SettingPaymentMethodID <= 0 {
			continue
		}
		out = append(out, QuotationPaymentMethodInput{
			SettingPaymentMethodID: m.SettingPaymentMethodID,
			Amount:                 grand,
		})
		break
	}
	return out
}

type quoteFulfillLine struct {
	pid                            sql.NullInt64
	amt, price, disc, vrate, total float64
	vtype                          string
}

func (r *QuotationRepository) loadQuoteFulfillLines(ctx context.Context, q Querier, qid int64) ([]quoteFulfillLine, error) {
	rows, err := q.QueryContext(ctx, `
SELECT product_item_id, amount, price_per_unit, discount, vat_type, vat_rate, total_price
FROM order_quotation_item WHERE order_quotation_id = $1 AND deleted_at IS NULL ORDER BY sort_order, id`, qid)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var lines []quoteFulfillLine
	for rows.Next() {
		var line quoteFulfillLine
		if err := rows.Scan(&line.pid, &line.amt, &line.price, &line.disc, &line.vtype, &line.vrate, &line.total); err != nil {
			return nil, err
		}
		lines = append(lines, line)
	}
	return lines, rows.Err()
}

func (r *QuotationRepository) createPartialInStockQuotation(ctx context.Context, tx *sql.Tx, srcID int64, actor int64) (int64, error) {
	lines, err := r.loadQuoteFulfillLines(ctx, tx, srcID)
	if err != nil {
		return 0, err
	}
	var keep []quoteFulfillLine
	for _, line := range lines {
		if !line.pid.Valid {
			continue
		}
		stock, err := r.lineStock(ctx, tx, line.pid.Int64)
		if err != nil {
			return 0, err
		}
		if stock < line.amt {
			continue
		}
		keep = append(keep, line)
	}
	if len(keep) == 0 {
		return 0, ErrValidation
	}

	var newID int64
	err = tx.QueryRowContext(ctx, `
INSERT INTO order_quotation (
  status, parent_id, member_user_id, member_setting_credit_id,
  member_name, member_tel, member_email, issue_date, valid_until,
  reserve_stock, notes, vat_type, vat_rate,
  accept_mode, accepted_at, credit_date,
  created_by, updated_by
)
SELECT
  'success'::order_quotation_status, id, member_user_id, member_setting_credit_id,
  member_name, member_tel, member_email, issue_date, valid_until,
  reserve_stock, notes, vat_type, vat_rate,
  accept_mode, COALESCE(accepted_at, NOW()), credit_date,
  $2, $2
FROM order_quotation WHERE id = $1 AND deleted_at IS NULL
RETURNING id`, srcID, actor).Scan(&newID)
	if err != nil {
		return 0, err
	}
	if err := r.ensureSKU(ctx, tx, newID, "success"); err != nil {
		return 0, err
	}
	for i, line := range keep {
		_, err = tx.ExecContext(ctx, `
INSERT INTO order_quotation_item (
  order_quotation_id, product_item_id, amount, price_per_unit, discount,
  vat_type, vat_rate, total_price, sort_order, created_by, updated_by
) VALUES ($1, $2, $3, $4, $5, $6::setting_vat_type, $7, $8, $9, $10, $10)`,
			newID, line.pid, line.amt, line.price, line.disc, line.vtype, line.vrate, line.total, i, actor)
		if err != nil {
			return 0, err
		}
	}
	if err := r.recalcHeader(ctx, tx, newID); err != nil {
		return 0, err
	}
	return newID, nil
}

// writeFulfillDocs creates/reuses order_list + shipping + payment for a quotation.
// When allowReuse is false (new child QT), always inserts fresh docs.
func (r *QuotationRepository) writeFulfillDocs(
	ctx context.Context,
	tx *sql.Tx,
	qid int64,
	acceptMode string,
	grand float64,
	methods []QuotationPaymentMethodInput,
	creditApprovedBy *int64,
	actor int64,
	allowReuse bool,
) (int64, error) {
	var orderListID int64
	err := sql.ErrNoRows
	if allowReuse {
		err = tx.QueryRowContext(ctx, `
SELECT id FROM order_list WHERE order_quotation_id = $1 AND deleted_at IS NULL ORDER BY id ASC LIMIT 1`, qid).Scan(&orderListID)
	}
	if errors.Is(err, sql.ErrNoRows) {
		err = tx.QueryRowContext(ctx, `
INSERT INTO order_list (status, fulfill_status, member_user_id, member_setting_credit_id, member_name, member_tel, member_email,
  vat_type, vat_rate, order_quotation_id, ordered_at, created_by, updated_by)
SELECT 'pending', 'pending', member_user_id, member_setting_credit_id, member_name, member_tel, member_email,
  vat_type, vat_rate, id, NOW(), $2, $2
FROM order_quotation WHERE id = $1
RETURNING id`, qid, actor).Scan(&orderListID)
		if err != nil {
			return 0, err
		}
		sku, err := r.code.NextCode(ctx, tx, "order_list", time.Now())
		if err != nil {
			return 0, err
		}
		if _, err = tx.ExecContext(ctx, `UPDATE order_list SET sku = $2 WHERE id = $1`, orderListID, sku); err != nil {
			return 0, err
		}
		lines, err := r.loadQuoteFulfillLines(ctx, tx, qid)
		if err != nil {
			return 0, err
		}
		for _, line := range lines {
			_, err = tx.ExecContext(ctx, `
INSERT INTO order_list_item (order_list_id, product_item_id, type, amount, price_per_unit, discount, vat_type, vat_rate, total_price, created_by, updated_by)
VALUES ($1, $2, 'item', $3, $4, $5, $6::setting_vat_type, $7, $8, $9, $9)`,
				orderListID, line.pid, line.amt, line.price, line.disc, line.vtype, line.vrate, line.total, actor)
			if err != nil {
				return 0, err
			}
		}
	} else if err != nil {
		return 0, err
	}

	now := time.Now()
	if _, err = tx.ExecContext(ctx, `
INSERT INTO order_list_shipping (order_list_id, type, received_at)
VALUES ($1, 'store'::order_shipping_type, $2)
ON CONFLICT (order_list_id) DO UPDATE SET type = EXCLUDED.type, received_at = EXCLUDED.received_at`,
		orderListID, now); err != nil {
		return 0, err
	}

	payCat := "payment"
	if acceptMode == "credit" {
		payCat = "credit"
	}
	var payID int64
	err = sql.ErrNoRows
	if allowReuse {
		err = tx.QueryRowContext(ctx, `
SELECT id FROM order_payment WHERE order_quotation_id = $1 AND deleted_at IS NULL ORDER BY id DESC LIMIT 1`, qid).Scan(&payID)
	}
	if errors.Is(err, sql.ErrNoRows) {
		err = tx.QueryRowContext(ctx, `
INSERT INTO order_payment (order_list_id, order_quotation_id, payment_category, total_price, amount_paid, is_paid, credit_approved_by, created_by, updated_by)
VALUES ($1, $2, $3::order_payment_category, $4, 0, FALSE, $5, $6, $6) RETURNING id`,
			orderListID, qid, payCat, grand, creditApprovedBy, actor).Scan(&payID)
		if err != nil {
			return 0, err
		}
	} else if err != nil {
		return 0, err
	}

	if err := r.syncPaymentItems(ctx, tx, payID, orderListID, actor); err != nil {
		return 0, err
	}

	if _, err = tx.ExecContext(ctx, `
UPDATE order_payment_method SET deleted_at = NOW() WHERE order_payment_id = $1 AND deleted_at IS NULL`, payID); err != nil {
		return 0, err
	}
	var paid float64
	for _, m := range methods {
		if m.Amount <= 0 {
			continue
		}
		_, err = tx.ExecContext(ctx, `
INSERT INTO order_payment_method (order_payment_id, setting_payment_method_id, amount, created_by, updated_by)
VALUES ($1, $2, $3, $4, $4)`, payID, m.SettingPaymentMethodID, m.Amount, actor)
		if err != nil {
			return 0, err
		}
		paid += m.Amount
	}
	isPaid := paid >= grand-0.0001
	if acceptMode == "credit" {
		isPaid = false
		paid = 0
	}
	_, err = tx.ExecContext(ctx, `
UPDATE order_payment SET
  payment_category = $2::order_payment_category,
  total_price = $3,
  amount_paid = $4,
  is_paid = $5,
  credit_approved_by = COALESCE($6, credit_approved_by),
  updated_at = NOW()
WHERE id = $1`, payID, payCat, grand, paid, isPaid, creditApprovedBy)
	if err != nil {
		return 0, err
	}
	return orderListID, nil
}

func (r *QuotationRepository) Duplicate(ctx context.Context, id int64, in QuotationDuplicateInput, actor int64) (int64, error) {
	src, err := r.GetByID(ctx, id)
	if err != nil {
		return 0, err
	}
	items := []QuotationItemInput{}
	idSet := map[int64]struct{}{}
	for _, x := range in.ItemIDs {
		idSet[x] = struct{}{}
	}
	for _, it := range src.Items {
		if len(idSet) > 0 {
			if _, ok := idSet[it.ID]; !ok {
				continue
			}
		}
		price := it.PricePerUnit
		if in.UseCurrentPrices && it.ProductItemID != nil {
			cur, err := r.productSellPrice(ctx, r.db, *it.ProductItemID)
			if err != nil {
				return 0, err
			}
			price = cur
		}
		items = append(items, QuotationItemInput{
			ProductItemID: it.ProductItemID,
			Amount:        it.Amount,
			PricePerUnit:  price,
			Discount:      it.Discount,
		})
	}
	if len(items) == 0 {
		return 0, ErrValidation
	}
	pid := id
	return r.Create(ctx, QuotationCreateInput{
		Status:                "draft",
		ParentID:              &pid,
		MemberUserID:          src.MemberUserID,
		MemberSettingCreditID: src.MemberSettingCreditID,
		MemberName:            src.MemberName,
		MemberTel:             src.MemberTel,
		MemberEmail:           src.MemberEmail,
		IssueDate:             src.IssueDate,
		ValidUntil:            src.ValidUntil,
		ReserveStock:          src.ReserveStock,
		Notes:                 src.Notes,
		Items:                 items,
	}, actor)
}

func (r *QuotationRepository) Delete(ctx context.Context, id int64, actor int64) error {
	var cur string
	if err := r.db.QueryRowContext(ctx, `
SELECT status::text FROM order_quotation WHERE id = $1 AND deleted_at IS NULL`, id).Scan(&cur); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	if cur != "draft" {
		return ErrValidation
	}
	_, err := r.db.ExecContext(ctx, `
UPDATE order_quotation SET deleted_at = NOW(), updated_by = $2, updated_at = NOW() WHERE id = $1`, id, actor)
	return err
}
