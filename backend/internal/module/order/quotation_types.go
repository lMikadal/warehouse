package order

import "time"

type QuotationListQuery struct {
	Search    string
	Status    string
	Overdue   bool
	DateFrom  string
	DateTo    string
	CreatedBy *int64
	Page      int
	Limit     int
}

type QuotationListItem struct {
	ID              int64     `json:"id"`
	SKU             string    `json:"sku,omitempty"`
	Status          string    `json:"status"`
	MemberName      *string   `json:"member_name,omitempty"`
	GrandTotal      float64   `json:"grand_total"`
	ItemCount       float64   `json:"item_count"`
	Fulfilled       bool      `json:"fulfilled"`
	ReceiptLocked   bool      `json:"receipt_locked"`
	IsOverdue       bool      `json:"is_overdue"`
	CreatedAt       time.Time `json:"created_at"`
	CreatedByName   *string   `json:"created_by_name,omitempty"`
}

type QuotationListResponse struct {
	Items []QuotationListItem `json:"items"`
	Total int                 `json:"total"`
	Page  int                 `json:"page"`
	Limit int                 `json:"limit"`
}

type QuotationCountResponse struct {
	Count    int64            `json:"count"`
	ByStatus map[string]int64 `json:"by_status"`
	Overdue  int64            `json:"overdue"`
}

type QuotationItemInput struct {
	ProductItemID *int64  `json:"product_item_id,omitempty"`
	Amount        float64 `json:"amount"`
	PricePerUnit  float64 `json:"price_per_unit"`
	Discount      float64 `json:"discount"`
}

type QuotationCreateInput struct {
	Status                string               `json:"status"`
	ParentID              *int64               `json:"parent_id,omitempty"`
	MemberUserID          *int64               `json:"member_user_id,omitempty"`
	MemberSettingCreditID *int64               `json:"member_setting_credit_id,omitempty"`
	MemberName            *string              `json:"member_name,omitempty"`
	MemberTel             *string              `json:"member_tel,omitempty"`
	MemberEmail           *string              `json:"member_email,omitempty"`
	IssueDate             *string              `json:"issue_date,omitempty"`
	ValidUntil            *string              `json:"valid_until,omitempty"`
	ReserveStock          bool                 `json:"reserve_stock"`
	Notes                 *string              `json:"notes,omitempty"`
	Items                 []QuotationItemInput `json:"items"`
	FileIDs               []int64              `json:"file_ids,omitempty"`
}

type QuotationUpdateInput struct {
	Status                string               `json:"status"`
	MemberUserID          *int64               `json:"member_user_id,omitempty"`
	MemberSettingCreditID *int64               `json:"member_setting_credit_id,omitempty"`
	MemberName            *string              `json:"member_name,omitempty"`
	MemberTel             *string              `json:"member_tel,omitempty"`
	MemberEmail           *string              `json:"member_email,omitempty"`
	IssueDate             *string              `json:"issue_date,omitempty"`
	ValidUntil            *string              `json:"valid_until,omitempty"`
	ReserveStock          *bool                `json:"reserve_stock,omitempty"`
	Notes                 *string              `json:"notes,omitempty"`
	Items                 []QuotationItemInput `json:"items"`
	FileIDs               []int64              `json:"file_ids,omitempty"`
}

type QuotationStatusInput struct {
	Status string `json:"status"`
}

type QuotationAcceptInput struct {
	Mode       string  `json:"mode"`
	CreditDate *string `json:"credit_date,omitempty"`
}

type QuotationPaymentMethodInput struct {
	SettingPaymentMethodID int64   `json:"setting_payment_method_id"`
	Amount                 float64 `json:"amount"`
}

type QuotationPaymentInput struct {
	Methods            []QuotationPaymentMethodInput `json:"methods"`
	CreditApprovedBy   *int64                        `json:"credit_approved_by,omitempty"`
}

type QuotationPickingInput struct {
	OnlyInStock bool `json:"only_in_stock"`
}

type QuotationPickingResponse struct {
	OrderListID      int64    `json:"order_list_id,omitempty"`
	Warnings         []string `json:"warnings,omitempty"`
	Partial          bool     `json:"partial"`
	PriceChanged     bool     `json:"price_changed"`
	OutOfStockCount  int      `json:"out_of_stock_count"`
}

type QuotationDuplicateInput struct {
	ItemIDs []int64 `json:"item_ids,omitempty"`
}

type QuotationItemDetail struct {
	ID            int64   `json:"id"`
	ProductItemID *int64  `json:"product_item_id,omitempty"`
	Amount        float64 `json:"amount"`
	PricePerUnit  float64 `json:"price_per_unit"`
	Discount      float64 `json:"discount"`
	VatType       string  `json:"vat_type"`
	VatRate       float64 `json:"vat_rate"`
	TotalPrice    float64 `json:"total_price"`
	SortOrder     int     `json:"sort_order"`
}

type QuotationFileDetail struct {
	ID           int64  `json:"id"`
	SystemFileID int64  `json:"system_file_id"`
	SortOrder    int    `json:"sort_order"`
	FileName     string `json:"file_name,omitempty"`
}

type QuotationDetail struct {
	ID                    int64                   `json:"id"`
	SKU                   string                  `json:"sku,omitempty"`
	Status                string                  `json:"status"`
	ParentID              *int64                  `json:"parent_id,omitempty"`
	MemberUserID          *int64                  `json:"member_user_id,omitempty"`
	MemberSettingCreditID *int64                  `json:"member_setting_credit_id,omitempty"`
	MemberName            *string                 `json:"member_name,omitempty"`
	MemberTel             *string                 `json:"member_tel,omitempty"`
	MemberEmail           *string                 `json:"member_email,omitempty"`
	IssueDate             *string                 `json:"issue_date,omitempty"`
	ValidUntil            *string                 `json:"valid_until,omitempty"`
	ReserveStock          bool                    `json:"reserve_stock"`
	Notes                 *string                 `json:"notes,omitempty"`
	AcceptMode            *string                 `json:"accept_mode,omitempty"`
	AcceptedAt            *time.Time              `json:"accepted_at,omitempty"`
	CreditDate            *string                 `json:"credit_date,omitempty"`
	VatType               string                  `json:"vat_type"`
	VatRate               float64                 `json:"vat_rate"`
	SubtotalExVat         float64                 `json:"subtotal_ex_vat"`
	DiscountTotal         float64                 `json:"discount_total"`
	VatAmount             float64                 `json:"vat_amount"`
	GrandTotal            float64                 `json:"grand_total"`
	Fulfilled             bool                    `json:"fulfilled"`
	ReceiptLocked         bool                    `json:"receipt_locked"`
	IsOverdue             bool                    `json:"is_overdue"`
	Items                 []QuotationItemDetail   `json:"items"`
	Files                 []QuotationFileDetail   `json:"files"`
	CreatedAt             time.Time               `json:"created_at"`
	UpdatedAt             time.Time               `json:"updated_at"`
	CreatedByName         *string                 `json:"created_by_name,omitempty"`
}

type QuotationFilterItem struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

type QuotationFiltersResponse struct {
	Items []QuotationFilterItem `json:"items"`
	Meta  struct {
		Total int64 `json:"total"`
		Page  int   `json:"page"`
		Limit int   `json:"limit"`
	} `json:"meta"`
}
