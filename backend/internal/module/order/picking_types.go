package order

import "time"

// The picking desk (ใบจัดสินค้า) takes a submitted sales order, verifies every line against a barcode,
// then settles it as a loan (credit) or a paid receipt. v1 split one slip over `v2_order_bills` +
// `v2_order_orders`; here they are the same `order_list` row, so v1's "bill id" and "order id" are one
// id, and v1's order status (wait/in_progress/success/fail) is this schema's `fulfill_status`
// (pending/in_progress/success/fail). The sale-document lifecycle stays on `order_list.status`.
type PickingListQuery struct {
	Page     int
	Limit    int
	Search   string
	Status   string
	DateFrom string
	DateTo   string
	// CreatedBy narrows to one seller; the handler drops it when the user is gone.
	CreatedBy *int64
	// RootOnly hides split children, which is v1's `bill_root_only=1`. The list always sets it; the
	// children show up as expandable payment rows instead.
	RootOnly bool
}

type PickingListItem struct {
	ID            int64      `json:"id"`
	SKU           string     `json:"sku,omitempty"`
	Status        string     `json:"status"`
	DocStatus     string     `json:"doc_status"`
	ParentID      *int64     `json:"parent_id,omitempty"`
	MemberName    *string    `json:"member_name,omitempty"`
	ItemCount     int64      `json:"item_count"`
	PieceCount    float64    `json:"piece_count"`
	TotalPrice    float64    `json:"total_price"`
	PaymentCount  int64      `json:"payment_count"`
	PaymentSKU    *string    `json:"payment_sku,omitempty"`
	OrderedAt     *time.Time `json:"ordered_at,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	CreatedByName *string    `json:"created_by_name,omitempty"`
	UpdatedAt     *time.Time `json:"updated_at,omitempty"`
	UpdatedByName *string    `json:"updated_by_name,omitempty"`
}

type PickingListResponse struct {
	Items []PickingListItem `json:"items"`
	Total int               `json:"total"`
	Page  int               `json:"page"`
	Limit int               `json:"limit"`
}

type PickingCountResponse struct {
	Count    int64            `json:"count"`
	ByStatus map[string]int64 `json:"by_status"`
}

type PickingItemDetail struct {
	ID            int64   `json:"id"`
	ProductItemID *int64  `json:"product_item_id,omitempty"`
	Type          string  `json:"type"`
	Amount        float64 `json:"amount"`
	AmountPicked  float64 `json:"amount_picked"`
	AmountChecked float64 `json:"amount_checked"`
	Status        string  `json:"status"`
	PricePerUnit  float64 `json:"price_per_unit"`
	Discount      float64 `json:"discount"`
	VatType       string  `json:"vat_type"`
	VatRate       float64 `json:"vat_rate"`
	TotalPrice    float64 `json:"total_price"`
	Detail        *string `json:"detail,omitempty"`
	// WarehouseListID is the bin the picker took the goods from, v1's `order_items.warehouse_id`. It is
	// what the stock deduction on settle reads, and nothing in the UI sets it yet.
	WarehouseListID *int64 `json:"warehouse_list_id,omitempty"`
}

type PickingOrderDetail struct {
	ID                    int64                     `json:"id"`
	SKU                   string                    `json:"sku,omitempty"`
	Status                string                    `json:"status"`
	DocStatus             string                    `json:"doc_status"`
	ParentID              *int64                    `json:"parent_id,omitempty"`
	MemberUserID          *int64                    `json:"member_user_id,omitempty"`
	MemberSettingCreditID *int64                    `json:"member_setting_credit_id,omitempty"`
	MemberName            *string                   `json:"member_name,omitempty"`
	MemberTel             *string                   `json:"member_tel,omitempty"`
	MemberEmail           *string                   `json:"member_email,omitempty"`
	VatType               string                    `json:"vat_type"`
	VatRate               float64                   `json:"vat_rate"`
	OrderedAt             *time.Time                `json:"ordered_at,omitempty"`
	Shipping              *StoreSalesShippingDetail `json:"shipping,omitempty"`
	Items                 []PickingItemDetail       `json:"items"`
	CreatedAt             time.Time                 `json:"created_at"`
	CreatedBy             *int64                    `json:"created_by,omitempty"`
	CreatedByName         *string                   `json:"created_by_name,omitempty"`
}

// PickingFamilyResponse is v1's GET /:id/family: the root slip plus its split children, each with its
// own lines, so the form can show one tab per slip.
type PickingFamilyResponse struct {
	RootID int64                `json:"root_id"`
	Orders []PickingOrderDetail `json:"orders"`
}

// PickingItemPatchInput is v1's single item PATCH. Absent fields stay untouched: the verify step sends
// amount_checked + status, the store-check toggle sends status alone, and mapping a compare line to a
// real product sends product_item_id alone.
type PickingItemPatchInput struct {
	AmountChecked   *float64 `json:"amount_checked,omitempty"`
	Status          *string  `json:"status,omitempty"`
	ProductItemID   *int64   `json:"product_item_id,omitempty"`
	WarehouseListID *int64   `json:"warehouse_list_id,omitempty"`
}

func (in PickingItemPatchInput) hasPatch() bool {
	return in.AmountChecked != nil || in.Status != nil || in.ProductItemID != nil || in.WarehouseListID != nil
}

type PickingStatusInput struct {
	Status string `json:"status"`
}

type PickingPaymentMethodInput struct {
	SettingPaymentMethodID int64   `json:"setting_payment_method_id"`
	Amount                 float64 `json:"amount"`
}

type PickingPaymentItemInput struct {
	OrderListItemID int64   `json:"order_list_item_id"`
	Amount          float64 `json:"amount"`
	PricePerUnit    float64 `json:"price_per_unit"`
	Discount        float64 `json:"discount"`
	TotalPrice      float64 `json:"total_price"`
}

// PickingPaymentSaveInput covers both the draft save and the settle. Items is a pointer so an omitted
// `items` key means "leave the priced snapshot alone", which is what v1's draft save relied on.
type PickingPaymentSaveInput struct {
	PaymentCategory    string                      `json:"payment_category"`
	OrderedAt          *time.Time                  `json:"ordered_at,omitempty"`
	VatRate            float64                     `json:"vat_rate"`
	Discount           float64                     `json:"discount"`
	SpecialDiscount    float64                     `json:"special_discount"`
	TotalPrice         float64                     `json:"total_price"`
	IsPaid             bool                        `json:"is_paid"`
	CreditApprovedBy   *int64                      `json:"credit_approved_by,omitempty"`
	DiscountApprovedBy *int64                      `json:"discount_approved_by,omitempty"`
	Methods            []PickingPaymentMethodInput `json:"methods"`
	Items              *[]PickingPaymentItemInput  `json:"items,omitempty"`
}

type PickingPaymentMethodDetail struct {
	ID                     int64   `json:"id"`
	SettingPaymentMethodID int64   `json:"setting_payment_method_id"`
	Name                   *string `json:"name,omitempty"`
	Amount                 float64 `json:"amount"`
}

type PickingPaymentItemDetail struct {
	ID              int64   `json:"id"`
	OrderListItemID int64   `json:"order_list_item_id"`
	Amount          float64 `json:"amount"`
	VatRate         float64 `json:"vat_rate"`
	PricePerUnit    float64 `json:"price_per_unit"`
	Discount        float64 `json:"discount"`
	TotalPrice      float64 `json:"total_price"`
}

type PickingPaymentDetail struct {
	ID              int64     `json:"id"`
	OrderListID     int64     `json:"order_list_id"`
	SKU             string    `json:"sku,omitempty"`
	PaymentCategory string    `json:"payment_category"`
	OrderedAt       time.Time `json:"ordered_at"`
	VatRate         float64   `json:"vat_rate"`
	Discount        float64   `json:"discount"`
	SpecialDiscount float64   `json:"special_discount"`
	TotalPrice      float64   `json:"total_price"`
	AmountPaid      float64   `json:"amount_paid"`
	// IsFull is generated from amount_paid >= total_price. v1 stored the cashier's "pay in full" toggle
	// here instead, so the payment screen restores that toggle from this flag.
	IsFull             bool                         `json:"is_full"`
	IsPaid             bool                         `json:"is_paid"`
	CreditApprovedBy   *int64                       `json:"credit_approved_by,omitempty"`
	DiscountApprovedBy *int64                       `json:"discount_approved_by,omitempty"`
	Methods            []PickingPaymentMethodDetail `json:"methods"`
	Items              []PickingPaymentItemDetail   `json:"items"`
	CreatedAt          time.Time                    `json:"created_at"`
}

type PickingPaymentsResponse struct {
	Items []PickingPaymentDetail `json:"items"`
}

// PickingApprovalInput carries the approver PIN for the credit-limit and special-discount overrides
// (v1's verify-superadmin / verify-discount).
type PickingApprovalInput struct {
	Code string `json:"code"`
}

type PickingApprovalResponse struct {
	UserID int64 `json:"user_id"`
}
