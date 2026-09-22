package order

import (
	"context"
	"database/sql"
)

// purchaseHistoryRef points a purchase_history row at whichever entity changed.
type purchaseHistoryRef struct {
	OrderID         *int64
	OrderItemID     *int64
	RejectID        *int64
	ClaimID         *int64
	ClaimItemID     *int64
	RequestID       *int64
	RequestItemID   *int64
	RequestRejectID *int64
}

// purchaseStatusLabels feeds purchase_history_language so the history modal reads the same in
// both locales. Statuses of every purchase_* entity share this map; labels are status words only.
var purchaseStatusLabels = map[string]struct{ TH, EN string }{
	"draft":             {"ฉบับร่าง", "Draft"},
	"pending":           {"รออนุมัติ", "Pending"},
	"approved":          {"อนุมัติแล้ว", "Approved"},
	"paying":            {"รอชำระเงิน", "Paying"},
	"received":          {"รับสินค้าแล้ว", "Received"},
	"receive_partial":   {"รับเข้าบางส่วน", "Partially received"},
	"receive_completed": {"รับเข้าครบแล้ว", "Fully received"},
	"completed":         {"เสร็จสิ้น", "Completed"},
	"in_progress":       {"กำลังดำเนินการ", "In progress"},
	"success":           {"สำเร็จ", "Success"},
	"cancelled":         {"ยกเลิก", "Cancelled"},
	"rejected":          {"ไม่อนุมัติ", "Rejected"},
	"acknowledged":      {"รับเรื่องแล้ว", "Acknowledged"},
	"waiting_supplier":  {"รอผู้ขาย", "Waiting for supplier"},
}

func purchaseStatusLabel(status string, en bool) string {
	if l, ok := purchaseStatusLabels[status]; ok {
		if en {
			return l.EN
		}
		return l.TH
	}
	return status
}

func purchaseHistoryTitle(oldStatus, newStatus *string, en bool) (string, string) {
	if newStatus == nil {
		if en {
			return "Updated", ""
		}
		return "แก้ไขข้อมูล", ""
	}
	to := purchaseStatusLabel(*newStatus, en)
	if oldStatus == nil || *oldStatus == "" {
		if en {
			return "Status set to " + to, ""
		}
		return "ตั้งสถานะเป็น " + to, ""
	}
	from := purchaseStatusLabel(*oldStatus, en)
	if en {
		return "Status changed", from + " → " + to
	}
	return "เปลี่ยนสถานะ", from + " → " + to
}

// insertPurchaseHistoryTx appends one audit row plus its th/en translations.
func insertPurchaseHistoryTx(ctx context.Context, tx *sql.Tx, ref purchaseHistoryRef, oldStatus, newStatus *string, actorID int64) error {
	var id int64
	if err := tx.QueryRowContext(ctx, `
INSERT INTO purchase_history (
  purchase_order_id, purchase_order_item_id, purchase_order_item_reject_id,
  purchase_claim_id, purchase_claim_item_id,
  purchase_request_id, purchase_request_item_id, purchase_request_item_reject_id,
  old_status, new_status, created_by
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
RETURNING id`,
		ref.OrderID, ref.OrderItemID, ref.RejectID, ref.ClaimID, ref.ClaimItemID,
		ref.RequestID, ref.RequestItemID, ref.RequestRejectID,
		oldStatus, newStatus, nullActorID(actorID)).Scan(&id); err != nil {
		return err
	}
	thTitle, thDesc := purchaseHistoryTitle(oldStatus, newStatus, false)
	enTitle, enDesc := purchaseHistoryTitle(oldStatus, newStatus, true)
	_, err := tx.ExecContext(ctx, `
INSERT INTO purchase_history_language (purchase_history_id, locale, title, description)
VALUES ($1, 'th', $2, $3), ($1, 'en', $4, $5)`, id, thTitle, thDesc, enTitle, enDesc)
	return err
}

// purchaseHistoryFor reads the history feed of one purchase_* entity. refColumn must be one of the
// purchase_history FK columns above (caller-supplied constant, never user input).
func purchaseHistoryFor(ctx context.Context, db *sql.DB, refColumn string, refID int64, locale string) (TicketHistoryResponse, error) {
	if locale == "" {
		locale = "th"
	}
	rows, err := db.QueryContext(ctx, `
SELECT h.id, h.old_status, h.new_status,
  COALESCE(hl.title, ''), COALESCE(hl.description, ''), h.created_at, au.username
FROM purchase_history h
LEFT JOIN purchase_history_language hl ON hl.purchase_history_id = h.id AND hl.locale = $2
LEFT JOIN admin_user au ON au.id = h.created_by
WHERE h.`+refColumn+` = $1
ORDER BY h.created_at DESC, h.id DESC
LIMIT 100`, refID, locale)
	if err != nil {
		return TicketHistoryResponse{}, err
	}
	defer rows.Close()
	out := TicketHistoryResponse{Items: []TicketHistoryEntry{}}
	for rows.Next() {
		var e TicketHistoryEntry
		var oldStatus, newStatus, createdByName sql.NullString
		if err := rows.Scan(&e.ID, &oldStatus, &newStatus, &e.Title, &e.Description, &e.CreatedAt, &createdByName); err != nil {
			return out, err
		}
		assignNullStr(&e.OldStatus, oldStatus)
		assignNullStr(&e.NewStatus, newStatus)
		assignNullStr(&e.CreatedByName, createdByName)
		out.Items = append(out.Items, e)
	}
	return out, rows.Err()
}
