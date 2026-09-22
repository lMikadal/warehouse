package order

import "time"

// The purchasing desk's view of what the shop floor filed (เคลม ฝ่ายขาย). v1 served this from
// `/api/v2/admin/order-claim?type=claim` — the very list the claim desk uses, pinned to claims — and
// moved the document with `PATCH .../claims/:id/status` plus a per-item review. Same table here
// (`order_claim`), same two moves, under `/api/v1/order/sales-claims`.
//
// The workflow is the schema's `order_claim_status`: v1's waiting/process/success/reject become
// pending/acknowledged/success/rejected, and the schema adds the two the design asked for —
// `waiting_supplier` between acknowledged and success, and `cancelled` beside rejected.
type SalesClaimItemDetail struct {
	ID                   int64   `json:"id"`
	OrderPaymentItemID   int64   `json:"order_payment_item_id"`
	OrderListItemID      int64   `json:"order_list_item_id"`
	ProductItemID        *int64  `json:"product_item_id,omitempty"`
	Detail               *string `json:"detail,omitempty"`
	Type                 string  `json:"type"`
	SettingClaimReasonID int64   `json:"setting_claim_reason_id"`
	ReasonName           string  `json:"reason_name,omitempty"`
	Amount               float64 `json:"amount"`
	PricePerUnit         float64 `json:"price_per_unit"`
	Discount             float64 `json:"discount"`
	// PaidAmount/PaidTotalPrice are the line as it was paid, so the desk sees what share is claimed.
	PaidAmount     float64 `json:"paid_amount"`
	PaidTotalPrice float64 `json:"paid_total_price"`
	Status         string  `json:"status"`
	Note           string  `json:"note"`
}

type SalesClaimDetail struct {
	ID                int64                  `json:"id"`
	SKU               string                 `json:"sku,omitempty"`
	Type              string                 `json:"type"`
	Status            string                 `json:"status"`
	PaymentType       string                 `json:"payment_type"`
	OtherReason       string                 `json:"other_reason"`
	TotalPrice        float64                `json:"total_price"`
	OrderPaymentID    int64                  `json:"order_payment_id"`
	PaymentSKU        string                 `json:"payment_sku,omitempty"`
	PaymentCategory   string                 `json:"payment_category"`
	PaymentTotalPrice float64                `json:"payment_total_price"`
	OrderListID       int64                  `json:"order_list_id"`
	OrderSKU          string                 `json:"order_sku,omitempty"`
	MemberName        *string                `json:"member_name,omitempty"`
	MemberTel         *string                `json:"member_tel,omitempty"`
	CreatedByName     *string                `json:"created_by_name,omitempty"`
	UpdatedByName     *string                `json:"updated_by_name,omitempty"`
	CreatedAt         time.Time              `json:"created_at"`
	UpdatedAt         time.Time              `json:"updated_at"`
	Items             []SalesClaimItemDetail `json:"items"`
}

type SalesClaimStatusInput struct {
	Status string `json:"status"`
}

type SalesClaimItemPatchInput struct {
	Status *string `json:"status,omitempty"`
	Note   *string `json:"note,omitempty"`
}

// salesClaimTransitions is v1's validClaimStatusTransition, widened by the two statuses the warehouse
// workflow adds: a claim may park at the supplier before it closes, and it may be cancelled outright.
var salesClaimTransitions = map[string][]string{
	"pending":          {"acknowledged", "rejected", "cancelled"},
	"acknowledged":     {"waiting_supplier", "success", "rejected", "cancelled"},
	"waiting_supplier": {"success", "rejected", "cancelled"},
}

// salesClaimItemReviewStatuses is what a reviewer may write on a line: v1's confirmed/rejected.
var salesClaimItemReviewStatuses = []string{"success", "rejected"}

// salesClaimReviewableStatuses is when a line may be reviewed at all — v1 allowed it only while the
// document was in progress.
var salesClaimReviewableStatuses = []string{"acknowledged", "waiting_supplier"}
