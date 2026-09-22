package order

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

// SalesClaimRepository serves the purchasing side of the same documents the shop-floor claim desk
// files, so it borrows that repository's list, count and delete instead of repeating their SQL; only
// the single-document read and the two workflow moves are its own.
type SalesClaimRepository struct {
	*StoreClaimRepository
}

func NewSalesClaimRepository(db *sql.DB) *SalesClaimRepository {
	return &SalesClaimRepository{StoreClaimRepository: NewStoreClaimRepository(db)}
}

func (r *SalesClaimRepository) Detail(ctx context.Context, claimID int64, locale string) (SalesClaimDetail, error) {
	var d SalesClaimDetail
	var sku, paymentSKU, orderSKU, memberName, memberTel, createdBy, updatedBy sql.NullString
	var supplierID sql.NullInt64
	var supplierName, supplierAddress, supplierTel sql.NullString
	var orderCreatedAt, deliveryAt sql.NullTime
	err := r.db.QueryRowContext(ctx, `
SELECT c.id, c.sku, c.type::text, c.status::text, c.payment_type::text, c.other_reason, c.note_supplier,
       c.total_price::float8, c.order_payment_id, p.sku, p.payment_category::text, p.total_price::float8,
       p.order_list_id, d.sku, d.member_name, d.member_tel,
       c.supplier_user_id, si.name, si.address, si.tel,
       cu.username, uu.username, d.created_at, s.received_at, c.created_at, c.updated_at
FROM order_claim c
JOIN order_payment p ON p.id = c.order_payment_id AND p.deleted_at IS NULL
JOIN order_list d ON d.id = p.order_list_id AND d.deleted_at IS NULL
LEFT JOIN order_list_shipping s ON s.order_list_id = d.id
LEFT JOIN supplier_information si ON si.supplier_user_id = c.supplier_user_id AND si.type = 'contact'
LEFT JOIN admin_user cu ON cu.id = c.created_by
LEFT JOIN admin_user uu ON uu.id = c.updated_by
WHERE c.id = $1 AND c.deleted_at IS NULL`, claimID).Scan(
		&d.ID, &sku, &d.Type, &d.Status, &d.PaymentType, &d.OtherReason, &d.NoteSupplier,
		&d.TotalPrice, &d.OrderPaymentID, &paymentSKU, &d.PaymentCategory, &d.PaymentTotalPrice,
		&d.OrderListID, &orderSKU, &memberName, &memberTel,
		&supplierID, &supplierName, &supplierAddress, &supplierTel,
		&createdBy, &updatedBy, &orderCreatedAt, &deliveryAt, &d.CreatedAt, &d.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return d, ErrNotFound
	}
	if err != nil {
		return d, err
	}
	d.SKU = sku.String
	d.PaymentSKU = paymentSKU.String
	d.OrderSKU = orderSKU.String
	d.MemberName = nullableString(memberName)
	d.MemberTel = nullableString(memberTel)
	if supplierID.Valid {
		d.SupplierUserID = &supplierID.Int64
	}
	d.SupplierName = nullableString(supplierName)
	d.SupplierAddress = nullableString(supplierAddress)
	d.SupplierTel = nullableString(supplierTel)
	d.CreatedByName = nullableString(createdBy)
	d.UpdatedByName = nullableString(updatedBy)
	if orderCreatedAt.Valid {
		d.OrderCreatedAt = &orderCreatedAt.Time
	}
	if deliveryAt.Valid {
		d.DeliveryAt = &deliveryAt.Time
	}

	items, err := r.detailItems(ctx, claimID, locale)
	if err != nil {
		return d, err
	}
	d.Items = items
	return d, nil
}

// Patch assigns the supplier and/or the document message. v1 froze the claim once it left the desk, so
// only a pending or acknowledged claim may be edited here; the supplier must be an active row.
func (r *SalesClaimRepository) Patch(ctx context.Context, claimID int64, in SalesClaimPatchInput, actor int64) error {
	if in.SupplierUserID == nil && in.NoteSupplier == nil {
		return fmt.Errorf("%w: nothing to update", ErrValidation)
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck

	var current string
	err = tx.QueryRowContext(ctx, `
SELECT status::text FROM order_claim WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`, claimID).Scan(&current)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if current != "pending" && current != "acknowledged" {
		return fmt.Errorf("%w: claim can no longer be edited", ErrValidation)
	}

	sets := []string{"updated_at = NOW()", "updated_by = NULLIF($2, 0)"}
	args := []any{claimID, actor}
	if in.SupplierUserID != nil {
		if *in.SupplierUserID <= 0 {
			return fmt.Errorf("%w: invalid supplier", ErrValidation)
		}
		var ok bool
		if err := tx.QueryRowContext(ctx, `
SELECT EXISTS (SELECT 1 FROM supplier_user WHERE id = $1 AND is_active AND deleted_at IS NULL)`,
			*in.SupplierUserID).Scan(&ok); err != nil {
			return err
		}
		if !ok {
			return fmt.Errorf("%w: supplier not found", ErrValidation)
		}
		args = append(args, *in.SupplierUserID)
		sets = append(sets, fmt.Sprintf("supplier_user_id = $%d", len(args)))
	}
	if in.NoteSupplier != nil {
		args = append(args, strings.TrimSpace(*in.NoteSupplier))
		sets = append(sets, fmt.Sprintf("note_supplier = $%d", len(args)))
	}
	res, err := tx.ExecContext(ctx, fmt.Sprintf(`
UPDATE order_claim SET %s WHERE id = $1 AND deleted_at IS NULL`, strings.Join(sets, ", ")), args...)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return tx.Commit()
}

func (r *SalesClaimRepository) detailItems(ctx context.Context, claimID int64, locale string) ([]SalesClaimItemDetail, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT ci.id, ci.order_payment_item_id, pi.order_list_item_id, li.product_item_id, li.detail,
       ci.type::text, ci.setting_claim_reason_id, COALESCE(rl.name, rf.name, ''), ci.amount::float8,
       pi.price_per_unit::float8, pi.discount::float8, pi.amount::float8, pi.total_price::float8,
       ci.status::text, ci.note
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
	out := []SalesClaimItemDetail{}
	for rows.Next() {
		var it SalesClaimItemDetail
		var productID sql.NullInt64
		var detail sql.NullString
		if err := rows.Scan(&it.ID, &it.OrderPaymentItemID, &it.OrderListItemID, &productID, &detail,
			&it.Type, &it.SettingClaimReasonID, &it.ReasonName, &it.Amount,
			&it.PricePerUnit, &it.Discount, &it.PaidAmount, &it.PaidTotalPrice,
			&it.Status, &it.Note); err != nil {
			return nil, err
		}
		if productID.Valid {
			it.ProductItemID = &productID.Int64
		}
		it.Detail = nullableString(detail)
		out = append(out, it)
	}
	return out, rows.Err()
}

// UpdateStatus walks the document along `order_claim_status`. Closing it is gated the way v1 gated
// process → success: every line must be reviewed, and the refund becomes the sum of the lines that
// were confirmed (v1 summed the claimed quantities there, so a rejected line stops costing anything).
func (r *SalesClaimRepository) UpdateStatus(ctx context.Context, claimID int64, next string, actor int64) error {
	if !containsString(storeClaimStatuses, next) {
		return fmt.Errorf("%w: invalid status", ErrValidation)
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck

	var current string
	err = tx.QueryRowContext(ctx, `
SELECT status::text FROM order_claim WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`, claimID).Scan(&current)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if !containsString(salesClaimTransitions[current], next) {
		return fmt.Errorf("%w: cannot move claim from %s to %s", ErrValidation, current, next)
	}

	if next == "waiting_supplier" {
		var hasSupplier bool
		if err := tx.QueryRowContext(ctx, `
SELECT supplier_user_id IS NOT NULL FROM order_claim WHERE id = $1 AND deleted_at IS NULL`, claimID).
			Scan(&hasSupplier); err != nil {
			return err
		}
		if !hasSupplier {
			return fmt.Errorf("%w: supplier required before sending", ErrValidation)
		}
	}

	if next == "success" {
		var unreviewed int
		if err := tx.QueryRowContext(ctx, `
SELECT COUNT(*) FROM order_claim_item
WHERE order_claim_id = $1 AND deleted_at IS NULL
  AND status <> ALL($2::order_claim_status[])`, claimID, pgTextArray(salesClaimItemReviewStatuses)).
			Scan(&unreviewed); err != nil {
			return err
		}
		if unreviewed > 0 {
			return fmt.Errorf("%w: every line must be reviewed first", ErrValidation)
		}
		var confirmed float64
		if err := tx.QueryRowContext(ctx, `
SELECT COALESCE(SUM(amount), 0)::float8 FROM order_claim_item
WHERE order_claim_id = $1 AND deleted_at IS NULL AND status = 'success'::order_claim_status`, claimID).
			Scan(&confirmed); err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, `
UPDATE order_claim SET status = 'success', total_price = $2, updated_at = NOW(), updated_by = NULLIF($3, 0)
WHERE id = $1 AND deleted_at IS NULL`, claimID, confirmed, actor); err != nil {
			return err
		}
		return tx.Commit()
	}

	if _, err := tx.ExecContext(ctx, `
UPDATE order_claim SET status = $2::order_claim_status, updated_at = NOW(), updated_by = NULLIF($3, 0)
WHERE id = $1 AND deleted_at IS NULL`, claimID, next, actor); err != nil {
		return err
	}
	return tx.Commit()
}

// PatchItem records the reviewer's verdict on one line. v1 only allowed this while the document was in
// progress, so a filed-but-unseen or already-closed claim cannot be edited behind the desk's back.
func (r *SalesClaimRepository) PatchItem(
	ctx context.Context, claimID, itemID int64, in SalesClaimItemPatchInput, actor int64,
) error {
	if in.Status == nil && in.Note == nil {
		return fmt.Errorf("%w: nothing to update", ErrValidation)
	}
	if in.Status != nil && !containsString(salesClaimItemReviewStatuses, *in.Status) {
		return fmt.Errorf("%w: invalid item status", ErrValidation)
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck

	var claimStatus string
	err = tx.QueryRowContext(ctx, `
SELECT status::text FROM order_claim WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`, claimID).Scan(&claimStatus)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if !containsString(salesClaimReviewableStatuses, claimStatus) {
		return fmt.Errorf("%w: claim is not under review", ErrValidation)
	}

	sets := []string{"updated_at = NOW()", "updated_by = NULLIF($3, 0)"}
	args := []any{itemID, claimID, actor}
	if in.Status != nil {
		args = append(args, *in.Status)
		sets = append(sets, fmt.Sprintf("status = $%d::order_claim_status", len(args)))
	}
	if in.Note != nil {
		args = append(args, strings.TrimSpace(*in.Note))
		sets = append(sets, fmt.Sprintf("note = $%d", len(args)))
	}
	res, err := tx.ExecContext(ctx, fmt.Sprintf(`
UPDATE order_claim_item SET %s
WHERE id = $1 AND order_claim_id = $2 AND deleted_at IS NULL`, strings.Join(sets, ", ")), args...)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return tx.Commit()
}
