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

type StoreClaimRepository struct {
	db   *sql.DB
	code *system.CodePrefixRepository
}

func NewStoreClaimRepository(db *sql.DB) *StoreClaimRepository {
	return &StoreClaimRepository{db: db, code: system.NewCodePrefixRepository(db)}
}

// A claim can only be filed against goods the customer actually paid for, so the payment picker and the
// detail both read settled payments only (v1 listed every payment, but its form rejected unpaid ones on
// save; filtering here keeps the clerk from walking into that dead end).
const storeClaimPaymentFrom = `
FROM order_payment p
JOIN order_list d ON d.id = p.order_list_id AND d.deleted_at IS NULL
LEFT JOIN admin_user au ON au.id = p.created_by
`

func storeClaimPaymentWhere(q StoreClaimPaymentListQuery) (string, []any) {
	where := "p.deleted_at IS NULL AND p.is_paid = TRUE"
	args := []any{}
	if q.Search != "" {
		args = append(args, "%"+q.Search+"%")
		n := len(args)
		where += fmt.Sprintf(" AND (p.sku ILIKE $%d OR d.sku ILIKE $%d OR d.member_name ILIKE $%d)", n, n, n)
	}
	if q.PaymentCategory != "" {
		args = append(args, q.PaymentCategory)
		where += fmt.Sprintf(" AND p.payment_category = $%d::order_payment_category", len(args))
	}
	if q.DateFrom != "" {
		args = append(args, q.DateFrom)
		where += fmt.Sprintf(" AND p.created_at >= $%d::timestamptz", len(args))
	}
	if q.DateTo != "" {
		args = append(args, q.DateTo)
		where += fmt.Sprintf(" AND p.created_at < ($%d::date + INTERVAL '1 day')", len(args))
	}
	return where, args
}

func (r *StoreClaimRepository) ListPayments(ctx context.Context, q StoreClaimPaymentListQuery) (StoreClaimPaymentListResponse, error) {
	resp := StoreClaimPaymentListResponse{Items: []StoreClaimPaymentListItem{}, Page: q.Page, Limit: q.Limit}
	where, args := storeClaimPaymentWhere(q)

	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) `+storeClaimPaymentFrom+` WHERE `+where, args...).
		Scan(&resp.Total); err != nil {
		return resp, err
	}

	args = append(args, q.Limit, (q.Page-1)*q.Limit)
	rows, err := r.db.QueryContext(ctx, fmt.Sprintf(`
SELECT p.id, p.sku, p.order_list_id, d.sku, p.payment_category::text, d.member_name,
       p.total_price::float8, au.username, p.created_at
%s
WHERE %s
ORDER BY p.created_at DESC, p.id DESC
LIMIT $%d OFFSET $%d`, storeClaimPaymentFrom, where, len(args)-1, len(args)), args...)
	if err != nil {
		return resp, err
	}
	defer rows.Close()
	for rows.Next() {
		var it StoreClaimPaymentListItem
		var sku, orderSKU, memberName, createdByName sql.NullString
		if err := rows.Scan(&it.ID, &sku, &it.OrderListID, &orderSKU, &it.PaymentCategory,
			&memberName, &it.TotalPrice, &createdByName, &it.CreatedAt); err != nil {
			return resp, err
		}
		it.SKU = sku.String
		it.OrderSKU = orderSKU.String
		it.MemberName = nullableString(memberName)
		it.CreatedByName = nullableString(createdByName)
		resp.Items = append(resp.Items, it)
	}
	return resp, rows.Err()
}

func (r *StoreClaimRepository) Payment(ctx context.Context, paymentID int64) (StoreClaimPaymentDetail, error) {
	var d StoreClaimPaymentDetail
	var sku, orderSKU, memberName, memberTel, memberEmail, createdByName sql.NullString
	var memberUserID sql.NullInt64
	var orderCreatedAt, deliveryAt sql.NullTime
	err := r.db.QueryRowContext(ctx, `
SELECT p.id, p.sku, p.order_list_id, d.sku, p.payment_category::text, p.total_price::float8,
       p.amount_paid::float8, p.is_paid, d.member_user_id, d.member_name, d.member_tel, d.member_email,
       au.username, p.created_at, d.created_at, s.received_at
FROM order_payment p
JOIN order_list d ON d.id = p.order_list_id AND d.deleted_at IS NULL
LEFT JOIN order_list_shipping s ON s.order_list_id = d.id
LEFT JOIN admin_user au ON au.id = p.created_by
WHERE p.id = $1 AND p.deleted_at IS NULL`, paymentID).Scan(
		&d.ID, &sku, &d.OrderListID, &orderSKU, &d.PaymentCategory, &d.TotalPrice,
		&d.AmountPaid, &d.IsPaid, &memberUserID, &memberName, &memberTel, &memberEmail,
		&createdByName, &d.CreatedAt, &orderCreatedAt, &deliveryAt)
	if errors.Is(err, sql.ErrNoRows) {
		return d, ErrNotFound
	}
	if err != nil {
		return d, err
	}
	d.SKU = sku.String
	d.OrderSKU = orderSKU.String
	d.MemberName = nullableString(memberName)
	d.MemberTel = nullableString(memberTel)
	d.MemberEmail = nullableString(memberEmail)
	d.CreatedByName = nullableString(createdByName)
	if memberUserID.Valid {
		d.MemberUserID = &memberUserID.Int64
	}
	if orderCreatedAt.Valid {
		d.OrderCreatedAt = &orderCreatedAt.Time
	}
	if deliveryAt.Valid {
		d.DeliveryAt = &deliveryAt.Time
	}

	lines, err := r.paymentLines(ctx, paymentID)
	if err != nil {
		return d, err
	}
	methods, err := NewPickingRepository(r.db).loadPaymentMethods(ctx, paymentID)
	if err != nil {
		return d, err
	}
	d.Lines = lines
	d.Methods = methods
	return d, nil
}

func (r *StoreClaimRepository) paymentLines(ctx context.Context, paymentID int64) ([]StoreClaimPaymentLine, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT pi.id, pi.order_list_item_id, li.product_item_id, li.detail, pi.amount::float8,
       pi.price_per_unit::float8, pi.discount::float8, pi.total_price::float8,
       COALESCE((
         SELECT SUM(ci.amount)
         FROM order_claim_item ci
         JOIN order_claim c ON c.id = ci.order_claim_id AND c.deleted_at IS NULL
         WHERE ci.order_payment_item_id = pi.id AND ci.deleted_at IS NULL
           AND c.status = ANY($2::order_claim_status[])
           AND ci.status IS DISTINCT FROM 'rejected'::order_claim_status
       ), 0)::float8
FROM order_payment_item pi
JOIN order_list_item li ON li.id = pi.order_list_item_id
WHERE pi.order_payment_id = $1 AND pi.deleted_at IS NULL
ORDER BY pi.id`, paymentID, pgTextArray(storeClaimActiveStatuses))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []StoreClaimPaymentLine{}
	for rows.Next() {
		var l StoreClaimPaymentLine
		var productID sql.NullInt64
		var detail sql.NullString
		if err := rows.Scan(&l.ID, &l.OrderListItemID, &productID, &detail, &l.Amount,
			&l.PricePerUnit, &l.Discount, &l.TotalPrice, &l.ClaimedAmount); err != nil {
			return nil, err
		}
		if productID.Valid {
			l.ProductItemID = &productID.Int64
		}
		l.Detail = nullableString(detail)
		out = append(out, l)
	}
	return out, rows.Err()
}

// pgTextArray renders a Go slice as a Postgres array literal, so one bound parameter can carry the
// status set instead of a generated IN list.
func pgTextArray(values []string) string {
	return "{" + strings.Join(values, ",") + "}"
}

func (r *StoreClaimRepository) Claims(ctx context.Context, paymentID int64, locale string) (StoreClaimsResponse, error) {
	resp := StoreClaimsResponse{Items: []StoreClaimDetail{}}
	rows, err := r.db.QueryContext(ctx, `
SELECT id, sku, order_payment_id, type::text, payment_type::text, other_reason,
       total_price::float8, status::text, created_at
FROM order_claim
WHERE order_payment_id = $1 AND deleted_at IS NULL
ORDER BY id`, paymentID)
	if err != nil {
		return resp, err
	}
	defer rows.Close()
	for rows.Next() {
		var c StoreClaimDetail
		var sku sql.NullString
		if err := rows.Scan(&c.ID, &sku, &c.OrderPaymentID, &c.Type, &c.PaymentType, &c.OtherReason,
			&c.TotalPrice, &c.Status, &c.CreatedAt); err != nil {
			return resp, err
		}
		c.SKU = sku.String
		c.Items = []StoreClaimItemDetail{}
		resp.Items = append(resp.Items, c)
	}
	if err := rows.Err(); err != nil {
		return resp, err
	}
	for i := range resp.Items {
		items, err := r.claimItems(ctx, resp.Items[i].ID, locale)
		if err != nil {
			return resp, err
		}
		resp.Items[i].Items = items
	}
	return resp, nil
}

func (r *StoreClaimRepository) claimItems(ctx context.Context, claimID int64, locale string) ([]StoreClaimItemDetail, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT ci.id, ci.order_payment_item_id, pi.order_list_item_id, li.product_item_id, ci.type::text,
       ci.setting_claim_reason_id, COALESCE(rl.name, rf.name, ''), ci.amount::float8, ci.status::text, ci.note
FROM order_claim_item ci
JOIN order_payment_item pi ON pi.id = ci.order_payment_item_id
JOIN order_list_item li ON li.id = pi.order_list_item_id
LEFT JOIN setting_claim_reason_language rl
  ON rl.setting_claim_reason_id = ci.setting_claim_reason_id AND rl.locale = $2
LEFT JOIN setting_claim_reason_language rf
  ON rf.setting_claim_reason_id = ci.setting_claim_reason_id AND rf.locale = 'th'
WHERE ci.order_claim_id = $1 AND ci.deleted_at IS NULL
ORDER BY ci.id`, claimID, locale)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []StoreClaimItemDetail{}
	for rows.Next() {
		var it StoreClaimItemDetail
		var productID sql.NullInt64
		if err := rows.Scan(&it.ID, &it.OrderPaymentItemID, &it.OrderListItemID, &productID, &it.Type,
			&it.SettingClaimReasonID, &it.ReasonName, &it.Amount, &it.Status, &it.Note); err != nil {
			return nil, err
		}
		if productID.Valid {
			it.ProductItemID = &productID.Int64
		}
		out = append(out, it)
	}
	return out, rows.Err()
}

func (r *StoreClaimRepository) Create(ctx context.Context, paymentID int64, in StoreClaimCreateInput, actor int64) (int64, error) {
	if !containsString([]string{"claim", "return"}, in.Type) {
		return 0, fmt.Errorf("%w: invalid type", ErrValidation)
	}
	if !containsString(storeClaimPaymentTypes, in.PaymentType) {
		return 0, fmt.Errorf("%w: invalid payment_type", ErrValidation)
	}
	if in.PaymentType == "other" && strings.TrimSpace(in.OtherReason) == "" {
		return 0, fmt.Errorf("%w: other_reason is required when payment_type is other", ErrValidation)
	}
	if len(in.Items) == 0 {
		return 0, fmt.Errorf("%w: items required", ErrValidation)
	}
	if in.TotalPrice != nil && *in.TotalPrice < 0 {
		return 0, fmt.Errorf("%w: total_price must be >= 0", ErrValidation)
	}
	// v1's rule: a claim covers a single line, a return may cover many.
	if in.Type == "claim" && len(in.Items) > 1 {
		return 0, fmt.Errorf("%w: a claim covers one line", ErrValidation)
	}
	total := 0.0
	for _, it := range in.Items {
		if it.Type != in.Type {
			return 0, fmt.Errorf("%w: item type must match claim type", ErrValidation)
		}
		if it.Amount < 0 {
			return 0, fmt.Errorf("%w: amount must be >= 0", ErrValidation)
		}
		total += it.Amount
	}
	if in.TotalPrice != nil {
		total = *in.TotalPrice
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback() //nolint:errcheck

	var paid bool
	err = tx.QueryRowContext(ctx, `
SELECT is_paid FROM order_payment WHERE id = $1 AND deleted_at IS NULL`, paymentID).Scan(&paid)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, ErrNotFound
	}
	if err != nil {
		return 0, err
	}
	if !paid {
		return 0, fmt.Errorf("%w: payment is not settled", ErrValidation)
	}

	if err := validateStoreClaimItemsTx(ctx, tx, paymentID, 0, in.Type, in.Items); err != nil {
		return 0, err
	}

	sku, err := r.code.NextCode(ctx, tx, "order_claim", time.Now())
	if err != nil {
		return 0, err
	}

	var claimID int64
	if err := tx.QueryRowContext(ctx, `
INSERT INTO order_claim (sku, order_payment_id, type, payment_type, other_reason, total_price,
                         status, created_by, updated_by)
VALUES ($1, $2, $3::claim_type, $4::order_claim_payment_type, $5, $6, 'pending',
        NULLIF($7, 0), NULLIF($7, 0))
RETURNING id`, sku, paymentID, in.Type, in.PaymentType, strings.TrimSpace(in.OtherReason), total, actor).
		Scan(&claimID); err != nil {
		return 0, err
	}

	for _, it := range in.Items {
		if _, err := tx.ExecContext(ctx, `
INSERT INTO order_claim_item (order_claim_id, order_payment_item_id, setting_claim_reason_id, type,
                              amount, status, note, created_by, updated_by)
VALUES ($1, $2, $3, $4::claim_type, $5, 'pending', $6, NULLIF($7, 0), NULLIF($7, 0))`,
			claimID, it.OrderPaymentItemID, it.SettingClaimReasonID, it.Type, it.Amount,
			strings.TrimSpace(it.Note), actor); err != nil {
			return 0, err
		}
	}
	return claimID, tx.Commit()
}

// validateStoreClaimItemsTx is v1's validateClaimItemsTx: each line must belong to the payment, each
// reason must be active and of the right kind, and the claimed quantity may not exceed what was paid
// once the quantities other live claims already took are counted.
func validateStoreClaimItemsTx(
	ctx context.Context, tx *sql.Tx, paymentID, excludeClaimID int64,
	claimType string, items []StoreClaimItemInput,
) error {
	requested := map[int64]float64{}
	for _, it := range items {
		var lineAmount float64
		err := tx.QueryRowContext(ctx, `
SELECT amount::float8 FROM order_payment_item
WHERE id = $1 AND order_payment_id = $2 AND deleted_at IS NULL`, it.OrderPaymentItemID, paymentID).
			Scan(&lineAmount)
		if errors.Is(err, sql.ErrNoRows) {
			return fmt.Errorf("%w: payment item does not belong to payment", ErrValidation)
		}
		if err != nil {
			return err
		}

		var isClaim, isReturn bool
		err = tx.QueryRowContext(ctx, `
SELECT is_claim, is_return FROM setting_claim_reason
WHERE id = $1 AND deleted_at IS NULL AND is_active = TRUE`, it.SettingClaimReasonID).
			Scan(&isClaim, &isReturn)
		if errors.Is(err, sql.ErrNoRows) {
			return fmt.Errorf("%w: invalid claim reason for type", ErrValidation)
		}
		if err != nil {
			return err
		}
		if (claimType == "claim" && !isClaim) || (claimType == "return" && !isReturn) {
			return fmt.Errorf("%w: invalid claim reason for type", ErrValidation)
		}

		requested[it.OrderPaymentItemID] += it.Amount
	}

	for paymentItemID, wanted := range requested {
		var lineAmount, used float64
		if err := tx.QueryRowContext(ctx, `
SELECT amount::float8 FROM order_payment_item WHERE id = $1`, paymentItemID).Scan(&lineAmount); err != nil {
			return err
		}
		if err := tx.QueryRowContext(ctx, `
SELECT COALESCE(SUM(ci.amount), 0)::float8
FROM order_claim_item ci
JOIN order_claim c ON c.id = ci.order_claim_id AND c.deleted_at IS NULL
WHERE ci.order_payment_item_id = $1 AND ci.deleted_at IS NULL
  AND c.status = ANY($3::order_claim_status[])
  AND ci.status IS DISTINCT FROM 'rejected'::order_claim_status
  AND ($2 = 0 OR c.id <> $2)`, paymentItemID, excludeClaimID, pgTextArray(storeClaimActiveStatuses)).
			Scan(&used); err != nil {
			return err
		}
		if used+wanted > lineAmount+1e-9 {
			return fmt.Errorf("%w: claim amount exceeds payment item amount", ErrValidation)
		}
	}
	return nil
}

const storeClaimListFrom = `
FROM order_claim c
JOIN order_payment p ON p.id = c.order_payment_id AND p.deleted_at IS NULL
JOIN order_list d ON d.id = p.order_list_id AND d.deleted_at IS NULL
`

func storeClaimListWhere(q StoreClaimListQuery) (string, []any) {
	where := "c.deleted_at IS NULL"
	args := []any{}
	if q.Search != "" {
		args = append(args, "%"+q.Search+"%")
		n := len(args)
		where += fmt.Sprintf(" AND (c.sku ILIKE $%d OR p.sku ILIKE $%d OR d.member_name ILIKE $%d)", n, n, n)
	}
	if q.Type != "" {
		args = append(args, q.Type)
		where += fmt.Sprintf(" AND c.type = $%d::claim_type", len(args))
	}
	if q.Status != "" {
		args = append(args, q.Status)
		where += fmt.Sprintf(" AND c.status = $%d::order_claim_status", len(args))
	}
	if q.DateFrom != "" {
		args = append(args, q.DateFrom)
		where += fmt.Sprintf(" AND c.created_at >= $%d::timestamptz", len(args))
	}
	if q.DateTo != "" {
		args = append(args, q.DateTo)
		where += fmt.Sprintf(" AND c.created_at < ($%d::date + INTERVAL '1 day')", len(args))
	}
	return where, args
}

func (r *StoreClaimRepository) List(ctx context.Context, q StoreClaimListQuery) (StoreClaimListResponse, error) {
	resp := StoreClaimListResponse{Items: []StoreClaimListItem{}, Page: q.Page, Limit: q.Limit}
	where, args := storeClaimListWhere(q)

	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) `+storeClaimListFrom+` WHERE `+where, args...).
		Scan(&resp.Total); err != nil {
		return resp, err
	}

	args = append(args, q.Limit, (q.Page-1)*q.Limit)
	rows, err := r.db.QueryContext(ctx, fmt.Sprintf(`
SELECT c.id, c.sku, c.type::text, c.status::text, c.payment_type::text, c.total_price::float8,
       c.order_payment_id, p.sku, p.order_list_id, d.member_name, c.created_at
%s
WHERE %s
ORDER BY c.created_at DESC, c.id DESC
LIMIT $%d OFFSET $%d`, storeClaimListFrom, where, len(args)-1, len(args)), args...)
	if err != nil {
		return resp, err
	}
	defer rows.Close()
	for rows.Next() {
		var it StoreClaimListItem
		var sku, paymentSKU, memberName sql.NullString
		if err := rows.Scan(&it.ID, &sku, &it.Type, &it.Status, &it.PaymentType, &it.TotalPrice,
			&it.OrderPaymentID, &paymentSKU, &it.OrderListID, &memberName, &it.CreatedAt); err != nil {
			return resp, err
		}
		it.SKU = sku.String
		it.PaymentSKU = paymentSKU.String
		it.MemberName = nullableString(memberName)
		resp.Items = append(resp.Items, it)
	}
	return resp, rows.Err()
}

func (r *StoreClaimRepository) Count(ctx context.Context, q StoreClaimListQuery) (StoreClaimCountResponse, error) {
	resp := StoreClaimCountResponse{ByStatus: map[string]int64{}}
	// The tabs count every status of the current filter, so the status filter itself is dropped.
	q.Status = ""
	where, args := storeClaimListWhere(q)
	rows, err := r.db.QueryContext(ctx, `
SELECT c.status::text, COUNT(*) `+storeClaimListFrom+` WHERE `+where+` GROUP BY c.status`, args...)
	if err != nil {
		return resp, err
	}
	defer rows.Close()
	for rows.Next() {
		var status string
		var n int64
		if err := rows.Scan(&status, &n); err != nil {
			return resp, err
		}
		resp.ByStatus[status] = n
		resp.Count += n
	}
	return resp, rows.Err()
}

// Delete removes a claim the shop floor filed by mistake. Only an untouched document may go: once
// purchasing has acknowledged it, the record has to stay for them to close.
func (r *StoreClaimRepository) Delete(ctx context.Context, claimID int64, actor int64) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck

	var status string
	err = tx.QueryRowContext(ctx, `
SELECT status::text FROM order_claim WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`, claimID).Scan(&status)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if status != "pending" {
		return fmt.Errorf("%w: claim is already in progress", ErrValidation)
	}

	if _, err := tx.ExecContext(ctx, `
UPDATE order_claim SET deleted_at = NOW(), updated_at = NOW(), updated_by = NULLIF($2, 0)
WHERE id = $1 AND deleted_at IS NULL`, claimID, actor); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE order_claim_item SET deleted_at = NOW(), updated_at = NOW(), updated_by = NULLIF($2, 0)
WHERE order_claim_id = $1 AND deleted_at IS NULL`, claimID, actor); err != nil {
		return err
	}
	return tx.Commit()
}
