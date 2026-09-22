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

// ClaimRepository drives the purchase-side claim desk. A row of `purchase_order_item_reject` is the
// unit of work, exactly as in v1; confirming one folds it into a `purchase_claim` document so the
// claim or return has a number the supplier can be chased with.
type ClaimRepository struct {
	db   *sql.DB
	code *system.CodePrefixRepository
}

func NewClaimRepository(db *sql.DB) *ClaimRepository {
	return &ClaimRepository{db: db, code: system.NewCodePrefixRepository(db)}
}

// v1 `type_reject`: claim / return / reject. `reject` is this schema's accept_loss — the discrepancy
// is written off rather than pushed back at the supplier.
const ClaimResolutionWriteOff = "accept_loss"

var claimStatuses = map[string]struct{}{
	"pending": {}, "in_progress": {}, "completed": {}, "cancelled": {},
}

var claimSortColumns = map[string]string{
	"created_at": "rj.created_at",
	"sku":        "rj.sku",
	"status":     "rj.status",
	"qty":        "rj.qty",
}

const claimSelect = `
SELECT rj.id, rj.purchase_order_id, rj.purchase_order_item_id, rj.sku, po.sku,
  rj.type::text, rj.overage_type::text, rj.resolution::text, rj.status::text,
  rj.qty, rj.unit::text, rj.price::float8, rj.vat_rate::float8,
  rj.note, rj.note_resolution, rj.note_process,
  sup.name, au.username, pil.name, pi.sku,
  pc.id, pc.sku, pc.status::text, rj.created_at
FROM purchase_order_item_reject rj
INNER JOIN purchase_order_item i ON i.id = rj.purchase_order_item_id
LEFT JOIN purchase_order po ON po.id = COALESCE(rj.purchase_order_id, i.purchase_order_id)
LEFT JOIN supplier_information sup ON sup.supplier_user_id = po.supplier_user_id AND sup.type = 'contact'
LEFT JOIN product_item pi ON pi.id = i.product_item_id
LEFT JOIN product_item_language pil ON pil.product_item_id = pi.id AND pil.locale = 'th'
LEFT JOIN admin_user au ON au.id = rj.created_by
LEFT JOIN purchase_claim_item pci ON pci.purchase_order_item_reject_id = rj.id AND pci.deleted_at IS NULL
LEFT JOIN purchase_claim pc ON pc.id = pci.purchase_claim_id AND pc.deleted_at IS NULL`

func scanClaimRow(scan func(dest ...any) error) (ClaimListItem, error) {
	var c ClaimListItem
	var orderID, claimID sql.NullInt64
	var orderSKU, overageType, supplier, createdBy, productName, productSKU sql.NullString
	var claimSKU, claimStatus sql.NullString
	if err := scan(&c.ID, &orderID, &c.PurchaseOrderItemID, &c.SKU, &orderSKU,
		&c.Type, &overageType, &c.Resolution, &c.Status,
		&c.Qty, &c.Unit, &c.Price, &c.VatRate,
		&c.Note, &c.NoteResolution, &c.NoteProcess,
		&supplier, &createdBy, &productName, &productSKU,
		&claimID, &claimSKU, &claimStatus, &c.CreatedAt); err != nil {
		return c, err
	}
	if orderID.Valid {
		v := orderID.Int64
		c.PurchaseOrderID = &v
	}
	if claimID.Valid {
		v := claimID.Int64
		c.PurchaseClaimID = &v
	}
	if overageType.Valid {
		v := overageType.String
		c.OverageType = &v
	}
	assignNullStr(&c.PurchaseOrderSKU, orderSKU)
	assignNullStr(&c.SupplierName, supplier)
	assignNullStr(&c.CreatedByName, createdBy)
	assignNullStr(&c.ProductItemName, productName)
	assignNullStr(&c.ProductItemSKU, productSKU)
	assignNullStr(&c.PurchaseClaimSKU, claimSKU)
	assignNullStr(&c.PurchaseClaimStatus, claimStatus)
	return c, nil
}

// claimListWhere builds the filter shared by List and Count so a chip count can never disagree with
// the page it filters.
func claimListWhere(q ClaimListQuery) (string, []any) {
	where := " WHERE i.deleted_at IS NULL"
	args := []any{}
	add := func(clause string, value any) {
		args = append(args, value)
		where += fmt.Sprintf(clause, len(args))
	}
	if s := strings.TrimSpace(q.Search); s != "" {
		args = append(args, "%"+strings.ToLower(s)+"%")
		n := len(args)
		where += fmt.Sprintf(` AND (LOWER(rj.sku) LIKE $%d OR LOWER(COALESCE(po.sku, '')) LIKE $%d
      OR LOWER(COALESCE(sup.name, '')) LIKE $%d OR LOWER(COALESCE(pi.sku, '')) LIKE $%d)`, n, n, n, n)
	}
	if q.Status != "" {
		add(" AND rj.status = $%d::purchase_order_item_reject_status", q.Status)
	}
	if q.Resolution != "" {
		add(" AND rj.resolution = $%d::purchase_order_item_reject_resolution", q.Resolution)
	}
	if q.DateFrom != "" {
		add(" AND rj.created_at >= $%d::date", q.DateFrom)
	}
	if q.DateTo != "" {
		add(" AND rj.created_at < ($%d::date + INTERVAL '1 day')", q.DateTo)
	}
	return where, args
}

func (r *ClaimRepository) List(ctx context.Context, q ClaimListQuery) (ClaimListResponse, error) {
	if q.Page <= 0 {
		q.Page = 1
	}
	if q.Limit <= 0 || q.Limit > 200 {
		q.Limit = 10
	}
	where, args := claimListWhere(q)
	order := claimSortColumns[q.SortBy]
	if order == "" {
		order = "rj.created_at"
	}
	dir := "DESC"
	if strings.EqualFold(q.SortOrder, "asc") {
		dir = "ASC"
	}
	out := ClaimListResponse{Items: []ClaimListItem{}, Page: q.Page, Limit: q.Limit}
	if err := r.db.QueryRowContext(ctx, `
SELECT COUNT(DISTINCT rj.id)
FROM purchase_order_item_reject rj
INNER JOIN purchase_order_item i ON i.id = rj.purchase_order_item_id
LEFT JOIN purchase_order po ON po.id = COALESCE(rj.purchase_order_id, i.purchase_order_id)
LEFT JOIN supplier_information sup ON sup.supplier_user_id = po.supplier_user_id AND sup.type = 'contact'
LEFT JOIN product_item pi ON pi.id = i.product_item_id`+where, args...).Scan(&out.Total); err != nil {
		return out, err
	}
	args = append(args, q.Limit, (q.Page-1)*q.Limit)
	rows, err := r.db.QueryContext(ctx, claimSelect+where+
		fmt.Sprintf(" ORDER BY %s %s, rj.id %s LIMIT $%d OFFSET $%d", order, dir, dir, len(args)-1, len(args)),
		args...)
	if err != nil {
		return out, err
	}
	defer rows.Close()
	for rows.Next() {
		item, err := scanClaimRow(rows.Scan)
		if err != nil {
			return out, err
		}
		out.Items = append(out.Items, item)
	}
	return out, rows.Err()
}

func (r *ClaimRepository) Count(ctx context.Context, q ClaimListQuery) (ClaimCountResponse, error) {
	q.Status = ""
	where, args := claimListWhere(q)
	rows, err := r.db.QueryContext(ctx, `
SELECT rj.status::text, COUNT(DISTINCT rj.id)
FROM purchase_order_item_reject rj
INNER JOIN purchase_order_item i ON i.id = rj.purchase_order_item_id
LEFT JOIN purchase_order po ON po.id = COALESCE(rj.purchase_order_id, i.purchase_order_id)
LEFT JOIN supplier_information sup ON sup.supplier_user_id = po.supplier_user_id AND sup.type = 'contact'
LEFT JOIN product_item pi ON pi.id = i.product_item_id`+where+" GROUP BY rj.status", args...)
	if err != nil {
		return ClaimCountResponse{}, err
	}
	defer rows.Close()
	out := ClaimCountResponse{ByStatus: map[string]int64{}}
	for rows.Next() {
		var status string
		var n int64
		if err := rows.Scan(&status, &n); err != nil {
			return out, err
		}
		out.ByStatus[status] = n
		out.Count += n
	}
	return out, rows.Err()
}

var errClaimNotFound = errors.New("claim not found")

// History is the audit feed of one reject row, which v1's history modal read by reject id.
func (r *ClaimRepository) History(ctx context.Context, id int64, locale string) (TicketHistoryResponse, error) {
	return purchaseHistoryFor(ctx, r.db, "purchase_order_item_reject_id", id, locale)
}

func (r *ClaimRepository) GetByID(ctx context.Context, purchase *PurchaseRepository, id int64) (ClaimDetail, error) {
	row, err := scanClaimRow(r.db.QueryRowContext(ctx, claimSelect+" WHERE rj.id = $1", id).Scan)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ClaimDetail{}, errClaimNotFound
		}
		return ClaimDetail{}, err
	}
	out := ClaimDetail{ClaimListItem: row, Files: []PurchaseItemFile{}, Siblings: []ClaimListItem{}}
	fileRows, err := r.db.QueryContext(ctx, `
SELECT id, purchase_order_item_reject_id, system_file_id, sort_order
FROM purchase_order_item_reject_file
WHERE purchase_order_item_reject_id = $1 AND deleted_at IS NULL
ORDER BY sort_order, id`, id)
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
		out.Files = append(out.Files, f)
	}
	if err := fileRows.Err(); err != nil {
		return out, err
	}
	if row.PurchaseOrderID == nil {
		return out, nil
	}
	// The process screen shows the whole order around the line, and every sibling discrepancy on it.
	detail, err := purchase.GetByID(ctx, *row.PurchaseOrderID)
	if err == nil && detail != nil {
		out.Order = detail
		for i := range detail.Items {
			if detail.Items[i].ID == row.PurchaseOrderItemID {
				out.Item = &detail.Items[i]
				break
			}
		}
	}
	sibRows, err := r.db.QueryContext(ctx,
		claimSelect+" WHERE COALESCE(rj.purchase_order_id, i.purchase_order_id) = $1 AND rj.id <> $2 ORDER BY rj.id DESC",
		*row.PurchaseOrderID, id)
	if err != nil {
		return out, err
	}
	defer sibRows.Close()
	for sibRows.Next() {
		sib, err := scanClaimRow(sibRows.Scan)
		if err != nil {
			return out, err
		}
		out.Siblings = append(out.Siblings, sib)
	}
	return out, sibRows.Err()
}

// claimNextStatus keeps v1's workflow: a line waits (pending), is pushed to the supplier
// (in_progress), then either settles (completed) or dies (cancelled). Terminal rows only reopen by
// being rerouted to another resolution, which the caller signals by also sending a resolution.
func claimNextStatus(current, want string, resolutionChanged bool) (string, error) {
	if _, ok := claimStatuses[want]; !ok {
		return "", fmt.Errorf("unknown claim status %q", want)
	}
	if current == want {
		return want, nil
	}
	switch current {
	case "pending":
		if want == "in_progress" || want == "cancelled" || want == "completed" {
			return want, nil
		}
	case "in_progress":
		if want == "completed" || want == "cancelled" {
			return want, nil
		}
	case "completed", "cancelled":
		// v1 let a written-off line be rerouted back into a claim or a return.
		if want == "pending" && resolutionChanged {
			return want, nil
		}
	}
	return "", fmt.Errorf("cannot move claim from %s to %s", current, want)
}

// Update is v1's single PUT on a reject row. Beyond the fields, it keeps three side effects v1 had:
// confirming opens (or reuses) the claim document, settling closes it, and writing the discrepancy
// off gives the quantity back to the purchase line so the order total stops counting it as lost.
func (r *ClaimRepository) Update(ctx context.Context, id int64, in ClaimUpdateInput, actorID int64) (ClaimUpdateResult, error) {
	if in.Resolution != nil {
		if _, ok := receiveRejectResolutions[*in.Resolution]; !ok {
			return ClaimUpdateResult{}, fmt.Errorf("unknown resolution %q", *in.Resolution)
		}
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return ClaimUpdateResult{}, err
	}
	defer func() { _ = tx.Rollback() }()

	var orderID sql.NullInt64
	var itemID int64
	var status, resolution, noteResolution, noteProcess string
	var qty int64
	if err := tx.QueryRowContext(ctx, `
SELECT COALESCE(rj.purchase_order_id, i.purchase_order_id), rj.purchase_order_item_id,
  rj.status::text, rj.resolution::text, rj.note_resolution, rj.note_process, rj.qty
FROM purchase_order_item_reject rj
INNER JOIN purchase_order_item i ON i.id = rj.purchase_order_item_id
WHERE rj.id = $1
FOR UPDATE OF rj`, id).Scan(&orderID, &itemID, &status, &resolution,
		&noteResolution, &noteProcess, &qty); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ClaimUpdateResult{}, errClaimNotFound
		}
		return ClaimUpdateResult{}, err
	}

	nextResolution := resolution
	if in.Resolution != nil {
		nextResolution = *in.Resolution
	}
	nextStatus := status
	if in.Status != nil {
		next, err := claimNextStatus(status, *in.Status, nextResolution != resolution)
		if err != nil {
			return ClaimUpdateResult{}, err
		}
		nextStatus = next
	}
	if in.NoteResolution != nil {
		noteResolution = strings.TrimSpace(*in.NoteResolution)
	}
	if in.NoteProcess != nil {
		noteProcess = strings.TrimSpace(*in.NoteProcess)
	}
	// Writing a discrepancy off is a decision, not a default: v1 demanded a reason for it.
	if nextResolution == ClaimResolutionWriteOff && nextStatus == "cancelled" && noteResolution == "" {
		return ClaimUpdateResult{}, errors.New("a write-off needs a reason")
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE purchase_order_item_reject
SET resolution = $2::purchase_order_item_reject_resolution,
    status = $3::purchase_order_item_reject_status,
    note_resolution = $4, note_process = $5
WHERE id = $1`, id, nextResolution, nextStatus, noteResolution, noteProcess); err != nil {
		return ClaimUpdateResult{}, err
	}

	out := ClaimUpdateResult{ID: id, Status: nextStatus, Resolution: nextResolution}
	if orderID.Valid && nextResolution != ClaimResolutionWriteOff && nextStatus != "pending" {
		claimID, sku, err := r.attachClaimDocumentTx(ctx, tx, orderID.Int64, id,
			nextResolution, nextStatus, noteProcess, actorID)
		if err != nil {
			return out, err
		}
		out.PurchaseClaimID = &claimID
		if sku != "" {
			out.ClaimSKU = &sku
		}
	}
	// v1's reject path handed the quantity back to the purchase line, so the PO stops showing the
	// goods as outstanding once the desk decides to swallow the difference.
	if nextResolution == ClaimResolutionWriteOff && nextStatus == "cancelled" && resolution != ClaimResolutionWriteOff {
		restored, err := restoreRejectedItemQtyTx(ctx, tx, itemID, qty)
		if err != nil {
			return out, err
		}
		out.RestoredItemQty = &restored
	}
	if status != nextStatus {
		if err := insertPurchaseHistoryTx(ctx, tx, purchaseHistoryRef{
			OrderID:  nullableInt64(orderID),
			RejectID: &id,
		}, &status, &nextStatus, actorID); err != nil {
			return out, err
		}
	}
	return out, tx.Commit()
}

func nullableInt64(v sql.NullInt64) *int64 {
	if !v.Valid {
		return nil
	}
	out := v.Int64
	return &out
}

func nullableString(v sql.NullString) *string {
	if !v.Valid {
		return nil
	}
	out := v.String
	return &out
}

// attachClaimDocumentTx opens the claim/return document for an order on first confirm and reuses it
// afterwards, so several discrepancies on one order chase the supplier under one number.
func (r *ClaimRepository) attachClaimDocumentTx(ctx context.Context, tx *sql.Tx,
	orderID, rejectID int64, resolution, status, note string, actorID int64,
) (int64, string, error) {
	claimType := "claim"
	if resolution == "return" {
		claimType = "return"
	}
	var claimID int64
	var sku sql.NullString
	err := tx.QueryRowContext(ctx, `
SELECT id, sku FROM purchase_claim
WHERE purchase_order_id = $1 AND type = $2::claim_type AND status = 'draft' AND deleted_at IS NULL
ORDER BY id DESC LIMIT 1
FOR UPDATE`, orderID, claimType).Scan(&claimID, &sku)
	if errors.Is(err, sql.ErrNoRows) {
		code, codeErr := r.code.NextCode(ctx, tx, "purchase_claim", time.Now())
		if codeErr != nil {
			return 0, "", codeErr
		}
		if err := tx.QueryRowContext(ctx, `
INSERT INTO purchase_claim (sku, purchase_order_id, type, status, note, created_by, updated_by)
VALUES ($1, $2, $3::claim_type, 'draft', $4, $5, $5)
RETURNING id`, code, orderID, claimType, note, actorID).Scan(&claimID); err != nil {
			return 0, "", err
		}
		sku = sql.NullString{String: code, Valid: true}
	} else if err != nil {
		return 0, "", err
	}

	// claim_item_status is confirmed/rejected only; a line still waiting on the supplier stays NULL.
	var itemStatus *string
	switch status {
	case "completed":
		v := "confirmed"
		itemStatus = &v
	case "cancelled":
		v := "rejected"
		itemStatus = &v
	}
	if _, err := tx.ExecContext(ctx, `
INSERT INTO purchase_claim_item
  (purchase_claim_id, purchase_order_item_reject_id, amount, status, note, created_by, updated_by)
SELECT $1, rj.id, ROUND(rj.qty * rj.price * (1 + rj.vat_rate / 100), 4),
  $2::claim_item_status, $3, $4, $4
FROM purchase_order_item_reject rj WHERE rj.id = $5
ON CONFLICT (purchase_claim_id, purchase_order_item_reject_id) WHERE deleted_at IS NULL
DO UPDATE SET status = $2::claim_item_status, note = $3, updated_by = $4,
  updated_at = CURRENT_TIMESTAMP`, claimID, itemStatus, note, actorID, rejectID); err != nil {
		return 0, "", err
	}

	// The document closes only when no line on it is still waiting on the supplier.
	if status == "completed" || status == "cancelled" {
		if _, err := tx.ExecContext(ctx, `
UPDATE purchase_claim pc
SET status = CASE
      WHEN EXISTS (
        SELECT 1 FROM purchase_claim_item ci
        INNER JOIN purchase_order_item_reject rj ON rj.id = ci.purchase_order_item_reject_id
        WHERE ci.purchase_claim_id = pc.id AND ci.deleted_at IS NULL
          AND rj.status IN ('pending', 'in_progress')
      ) THEN 'draft'::purchase_claim_status
      WHEN EXISTS (
        SELECT 1 FROM purchase_claim_item ci
        INNER JOIN purchase_order_item_reject rj ON rj.id = ci.purchase_order_item_reject_id
        WHERE ci.purchase_claim_id = pc.id AND ci.deleted_at IS NULL AND rj.status = 'completed'
      ) THEN 'success'::purchase_claim_status
      ELSE 'cancelled'::purchase_claim_status
    END,
    updated_by = $2, updated_at = CURRENT_TIMESTAMP
WHERE pc.id = $1`, claimID, actorID); err != nil {
			return 0, "", err
		}
	}
	return claimID, sku.String, nil
}

// restoreRejectedItemQtyTx gives a written-off quantity back to its purchase line. The discount is
// scaled with the quantity so the per-unit discount the buyer negotiated stays intact.
func restoreRejectedItemQtyTx(ctx context.Context, tx *sql.Tx, itemID, qty int64) (int64, error) {
	if qty <= 0 {
		return 0, nil
	}
	var newQty int64
	if err := tx.QueryRowContext(ctx, `
UPDATE purchase_order_item
SET qty = qty + $2,
    discount = CASE WHEN qty > 0 THEN ROUND(discount / qty * (qty + $2), 4) ELSE discount END,
    status = CASE WHEN status = 'receive_rejected' THEN 'receive_approved'::purchase_order_item_status
                  ELSE status END,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND deleted_at IS NULL
RETURNING qty`, itemID, qty).Scan(&newQty); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return 0, nil
		}
		return 0, err
	}
	return newQty, nil
}
