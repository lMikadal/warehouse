package order

import "time"

// The shop-floor claim desk (ทำรายการเคลม/คืน) opens a claim against a settled payment: the clerk picks
// the payment, picks the paid lines, and files one claim or return document per round. v1 nested this
// under `order-order/:id/payments/:paymentId/claims` over `v2_order_order_claims`; here the payment id
// alone identifies the document, so the routes are `/store-claims/:paymentId/claims` on `order_claim`.
//
// Status names differ because the warehouse enum (`order_claim_status`) already covers the purchasing
// side of the same document: v1 waiting → pending, process → acknowledged, reject → rejected. Item
//
//	review states map the same way: v1 confirmed → success, rejected → rejected, unreviewed → pending.
type StoreClaimPaymentListQuery struct {
	Page  int
	Limit int
	// Search matches the payment document number or the customer name, like v1's list.
	Search          string
	DateFrom        string
	DateTo          string
	PaymentCategory string
}

type StoreClaimPaymentListItem struct {
	ID              int64     `json:"id"`
	SKU             string    `json:"sku,omitempty"`
	OrderListID     int64     `json:"order_list_id"`
	OrderSKU        string    `json:"order_sku,omitempty"`
	PaymentCategory string    `json:"payment_category"`
	MemberName      *string   `json:"member_name,omitempty"`
	TotalPrice      float64   `json:"total_price"`
	CreatedByName   *string   `json:"created_by_name,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
}

type StoreClaimPaymentListResponse struct {
	Items []StoreClaimPaymentListItem `json:"items"`
	Total int                         `json:"total"`
	Page  int                         `json:"page"`
	Limit int                         `json:"limit"`
}

// StoreClaimPaymentLine is one paid product line of the payment, the unit a claim item points at.
type StoreClaimPaymentLine struct {
	ID              int64   `json:"id"`
	OrderListItemID int64   `json:"order_list_item_id"`
	ProductItemID   *int64  `json:"product_item_id,omitempty"`
	Detail          *string `json:"detail,omitempty"`
	Amount          float64 `json:"amount"`
	PricePerUnit    float64 `json:"price_per_unit"`
	Discount        float64 `json:"discount"`
	TotalPrice      float64 `json:"total_price"`
	// ClaimedAmount is what active claims already took off this line, so the form can cap the quantity
	// the same way the create guard does.
	ClaimedAmount float64 `json:"claimed_amount"`
}

type StoreClaimPaymentDetail struct {
	ID              int64     `json:"id"`
	SKU             string    `json:"sku,omitempty"`
	OrderListID     int64     `json:"order_list_id"`
	OrderSKU        string    `json:"order_sku,omitempty"`
	PaymentCategory string    `json:"payment_category"`
	TotalPrice      float64   `json:"total_price"`
	AmountPaid      float64   `json:"amount_paid"`
	IsPaid          bool      `json:"is_paid"`
	MemberUserID    *int64    `json:"member_user_id,omitempty"`
	MemberName      *string   `json:"member_name,omitempty"`
	MemberTel       *string   `json:"member_tel,omitempty"`
	MemberEmail     *string   `json:"member_email,omitempty"`
	CreatedByName   *string   `json:"created_by_name,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
	// The slip's own dates, which the claim form's customer header shows next to the receipt date.
	OrderCreatedAt *time.Time                   `json:"order_created_at,omitempty"`
	DeliveryAt     *time.Time                   `json:"delivery_at,omitempty"`
	Lines          []StoreClaimPaymentLine      `json:"lines"`
	Methods        []PickingPaymentMethodDetail `json:"methods"`
}

type StoreClaimItemInput struct {
	OrderPaymentItemID   int64   `json:"order_payment_item_id"`
	Type                 string  `json:"type"`
	SettingClaimReasonID int64   `json:"setting_claim_reason_id"`
	Amount               float64 `json:"amount"`
	Note                 string  `json:"note"`
}

// StoreClaimCreateInput mirrors v1's claim POST. TotalPrice is a pointer because v1 fell back to the
// summed claimed quantity when the clerk left the refund amount blank.
type StoreClaimCreateInput struct {
	Type        string                `json:"type"`
	PaymentType string                `json:"payment_type"`
	OtherReason string                `json:"other_reason"`
	TotalPrice  *float64              `json:"total_price,omitempty"`
	Items       []StoreClaimItemInput `json:"items"`
}

type StoreClaimItemDetail struct {
	ID                   int64   `json:"id"`
	OrderPaymentItemID   int64   `json:"order_payment_item_id"`
	OrderListItemID      int64   `json:"order_list_item_id"`
	ProductItemID        *int64  `json:"product_item_id,omitempty"`
	Type                 string  `json:"type"`
	SettingClaimReasonID int64   `json:"setting_claim_reason_id"`
	ReasonName           string  `json:"reason_name,omitempty"`
	Amount               float64 `json:"amount"`
	Status               string  `json:"status"`
	Note                 string  `json:"note"`
}

type StoreClaimDetail struct {
	ID             int64                  `json:"id"`
	SKU            string                 `json:"sku,omitempty"`
	OrderPaymentID int64                  `json:"order_payment_id"`
	Type           string                 `json:"type"`
	PaymentType    string                 `json:"payment_type"`
	OtherReason    string                 `json:"other_reason"`
	TotalPrice     float64                `json:"total_price"`
	Status         string                 `json:"status"`
	CreatedAt      time.Time              `json:"created_at"`
	Items          []StoreClaimItemDetail `json:"items"`
}

type StoreClaimsResponse struct {
	Items []StoreClaimDetail `json:"items"`
}

type StoreClaimListQuery struct {
	Page     int
	Limit    int
	Search   string
	Type     string
	Status   string
	DateFrom string
	DateTo   string
}

type StoreClaimListItem struct {
	ID             int64     `json:"id"`
	SKU            string    `json:"sku,omitempty"`
	Type           string    `json:"type"`
	Status         string    `json:"status"`
	PaymentType    string    `json:"payment_type"`
	TotalPrice     float64   `json:"total_price"`
	OrderPaymentID int64     `json:"order_payment_id"`
	PaymentSKU     string    `json:"payment_sku,omitempty"`
	OrderListID    int64     `json:"order_list_id"`
	MemberName     *string   `json:"member_name,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
}

type StoreClaimListResponse struct {
	Items []StoreClaimListItem `json:"items"`
	Total int                  `json:"total"`
	Page  int                  `json:"page"`
	Limit int                  `json:"limit"`
}

type StoreClaimCountResponse struct {
	Count    int64            `json:"count"`
	ByStatus map[string]int64 `json:"by_status"`
}

// storeClaimStatuses is order_claim_status in workflow order. The shop floor only ever files `pending`;
// the rest belong to the purchasing side (Phase 8) and to this list's filter tabs.
var storeClaimStatuses = []string{
	"pending", "acknowledged", "waiting_supplier", "success", "cancelled", "rejected",
}

var storeClaimPaymentTypes = []string{"cash", "transfer", "other", "debt_reduction"}

// storeClaimActiveStatuses is v1's quota set (waiting|process|success), widened by the one status the
// warehouse workflow adds in between. A cancelled or rejected claim frees its quantity again.
var storeClaimActiveStatuses = []string{"pending", "acknowledged", "waiting_supplier", "success"}
