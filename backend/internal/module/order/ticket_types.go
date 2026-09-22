package order

import "time"

// Ticket = คำร้อง (v1 order_tickets → purchase_request).
// Line types map v1 old→catalog and new→custom.

type TicketListQuery struct {
	Search       string
	Status       string
	DateFrom     string
	DateTo       string
	CreatedBy    *int64
	ExcludeDraft bool
	Page         int
	Limit        int
}

type TicketListItem struct {
	ID                     int64     `json:"id"`
	SKU                    string    `json:"sku"`
	Status                 string    `json:"status"`
	TotalQty               int64     `json:"total_qty"`
	TotalDeposit           float64   `json:"total_deposit"`
	CustomerName           string    `json:"customer_name"`
	CreatedAt              time.Time `json:"created_at"`
	CreatedByName          *string   `json:"created_by_name,omitempty"`
	RejectedItemCount      int64     `json:"rejected_item_count"`
	CancelledItemCount     int64     `json:"cancelled_item_count"`
	ApprovedItemCount      int64     `json:"approved_item_count"`
	ReceivedItemCount      int64     `json:"received_item_count"`
	CompletedItemCount     int64     `json:"completed_item_count"`
	PendingItemRejectCount int64     `json:"pending_item_reject_count"`
	PurchaseOrderCount     int64     `json:"purchase_order_count"`
	AllItemsHavePO         bool      `json:"all_items_have_po"`
}

type TicketListResponse struct {
	Items []TicketListItem `json:"items"`
	Total int              `json:"total"`
	Page  int              `json:"page"`
	Limit int              `json:"limit"`
}

type TicketCountResponse struct {
	Count        int64            `json:"count"`
	ByStatus     map[string]int64 `json:"by_status"`
	ByItemStatus map[string]int64 `json:"by_item_status"`
}

type TicketCustomerInput struct {
	MemberUserID *int64     `json:"member_user_id,omitempty"`
	SKU          string     `json:"sku"`
	Name         string     `json:"name"`
	Tel          string     `json:"tel"`
	Email        string     `json:"email"`
	DateReceive  *time.Time `json:"date_receive,omitempty"`
}

type TicketItemInput struct {
	ID                       *int64  `json:"id,omitempty"`
	Type                     string  `json:"type"`
	ProductItemID            *int64  `json:"product_item_id,omitempty"`
	Name                     *string `json:"name,omitempty"`
	ProductAttributeBrandID  *int64  `json:"product_attribute_brand_id,omitempty"`
	ProductAttributeModelID  *int64  `json:"product_attribute_model_id,omitempty"`
	ProductAttributeEngineID *int64  `json:"product_attribute_engine_id,omitempty"`
	IdentificationNumber     string  `json:"identification_number"`
	QtySell                  int64   `json:"qty_sell"`
	QtyReorder               int64   `json:"qty_reorder"`
	Deposit                  float64 `json:"deposit"`
	Unit                     string  `json:"unit"`
	Note                     string  `json:"note"`
	SystemFileIDs            []int64 `json:"system_file_ids,omitempty"`
}

type TicketCreateInput struct {
	Status                 string               `json:"status"`
	SettingSaleChannelID   *int64               `json:"setting_sale_channel_id,omitempty"`
	SettingPaymentMethodID *int64               `json:"setting_payment_method_id,omitempty"`
	TotalDepositOld        float64              `json:"total_deposit_old"`
	TotalDepositNew        float64              `json:"total_deposit_new"`
	TotalDeposit           float64              `json:"total_deposit"`
	Note                   string               `json:"note"`
	Customer               *TicketCustomerInput `json:"customer,omitempty"`
	Items                  []TicketItemInput    `json:"items"`
}

type TicketUpdateInput = TicketCreateInput

type TicketStatusInput struct {
	Status string `json:"status"`
}

type TicketNoteInput struct {
	Note string `json:"note"`
}

type TicketItemStatusInput struct {
	Status string `json:"status"`
	Reason string `json:"reason,omitempty"`
}

type TicketItemFile struct {
	ID           int64  `json:"id"`
	SystemFileID int64  `json:"system_file_id"`
	SortOrder    int    `json:"sort_order"`
	FileName     string `json:"file_name,omitempty"`
}

type TicketItemDetail struct {
	ID                       int64              `json:"id"`
	Status                   string             `json:"status"`
	Type                     string             `json:"type"`
	ProductItemID            *int64             `json:"product_item_id,omitempty"`
	ProductItemSKU           *string            `json:"product_item_sku,omitempty"`
	ProductItemName          *string            `json:"product_item_name,omitempty"`
	StockQty                 float64            `json:"stock_qty"`
	Name                     *string            `json:"name,omitempty"`
	ProductAttributeBrandID  *int64             `json:"product_attribute_brand_id,omitempty"`
	BrandName                *string            `json:"brand_name,omitempty"`
	ProductAttributeModelID  *int64             `json:"product_attribute_model_id,omitempty"`
	ModelName                *string            `json:"model_name,omitempty"`
	ProductAttributeEngineID *int64             `json:"product_attribute_engine_id,omitempty"`
	EngineName               *string            `json:"engine_name,omitempty"`
	IdentificationNumber     string             `json:"identification_number"`
	QtySell                  int64              `json:"qty_sell"`
	QtyReorder               int64              `json:"qty_reorder"`
	Deposit                  float64            `json:"deposit"`
	Unit                     string             `json:"unit"`
	Note                     string             `json:"note"`
	Files                    []TicketItemFile   `json:"files"`
	Rejects                  []TicketItemReject `json:"rejects"`
	PurchaseOrderCount       int64              `json:"purchase_order_count"`
}

type TicketItemReject struct {
	ID                    int64      `json:"id"`
	PurchaseRequestItemID int64      `json:"purchase_request_item_id"`
	Status                string     `json:"status"`
	Type                  string     `json:"type"`
	Note                  string     `json:"note"`
	Date                  *time.Time `json:"date,omitempty"`
	ProductItemID         *int64     `json:"product_item_id,omitempty"`
	ProductItemName       *string    `json:"product_item_name,omitempty"`
	CreatedAt             time.Time  `json:"created_at"`
	CreatedByName         *string    `json:"created_by_name,omitempty"`
}

type TicketItemRejectInput struct {
	Type          string `json:"type"`
	Status        string `json:"status,omitempty"`
	Note          string `json:"note"`
	// Date is YYYY-MM-DD (date-only). encoding/json cannot bind that into *time.Time.
	Date          *string `json:"date,omitempty"`
	ProductItemID *int64  `json:"product_item_id,omitempty"`
}

type TicketItemRejectStatusInput struct {
	Status string `json:"status"`
}

type TicketCustomerDetail struct {
	MemberUserID *int64     `json:"member_user_id,omitempty"`
	SKU          string     `json:"sku"`
	Name         string     `json:"name"`
	Tel          string     `json:"tel"`
	Email        string     `json:"email"`
	DateReceive  *time.Time `json:"date_receive,omitempty"`
}

type TicketDetail struct {
	ID                     int64                 `json:"id"`
	SKU                    string                `json:"sku"`
	Status                 string                `json:"status"`
	SettingSaleChannelID   *int64                `json:"setting_sale_channel_id,omitempty"`
	SettingPaymentMethodID *int64                `json:"setting_payment_method_id,omitempty"`
	TotalQty               int64                 `json:"total_qty"`
	TotalDepositOld        float64               `json:"total_deposit_old"`
	TotalDepositNew        float64               `json:"total_deposit_new"`
	TotalDeposit           float64               `json:"total_deposit"`
	Note                   string                `json:"note"`
	Customer               *TicketCustomerDetail `json:"customer,omitempty"`
	Items                  []TicketItemDetail    `json:"items"`
	CreatedAt              time.Time             `json:"created_at"`
	UpdatedAt              time.Time             `json:"updated_at"`
	CreatedByName          *string               `json:"created_by_name,omitempty"`
}

type TicketHistoryEntry struct {
	ID            int64     `json:"id"`
	OldStatus     *string   `json:"old_status,omitempty"`
	NewStatus     *string   `json:"new_status,omitempty"`
	Title         string    `json:"title"`
	Description   string    `json:"description"`
	CreatedAt     time.Time `json:"created_at"`
	CreatedByName *string   `json:"created_by_name,omitempty"`
}

type TicketHistoryResponse struct {
	Items []TicketHistoryEntry `json:"items"`
}
