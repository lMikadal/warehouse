package order

import "time"

type StoreSalesListQuery struct {
	Search    string
	Status    string
	DateFrom  string
	DateTo    string
	CreatedBy *int64
	Page      int
	Limit     int
}

type StoreSalesListItem struct {
	ID            int64      `json:"id"`
	SKU           string     `json:"sku,omitempty"`
	Status        string     `json:"status"`
	OrderedAt     *time.Time `json:"ordered_at,omitempty"`
	ParentID      *int64     `json:"parent_id,omitempty"`
	MemberName    *string    `json:"member_name,omitempty"`
	ItemCount     float64    `json:"item_count"`
	TotalPrice    float64    `json:"total_price"`
	ChildCount    int64      `json:"child_count"`
	CreatedAt     time.Time  `json:"created_at"`
	CreatedByName *string    `json:"created_by_name,omitempty"`
}

type StoreSalesListResponse struct {
	Items []StoreSalesListItem `json:"items"`
	Total int                  `json:"total"`
	Page  int                  `json:"page"`
	Limit int                  `json:"limit"`
}

type StoreSalesCountResponse struct {
	Count    int64            `json:"count"`
	ByStatus map[string]int64 `json:"by_status"`
}

type StoreSalesShippingInput struct {
	Type       string     `json:"type"`
	ReceivedAt *time.Time `json:"received_at,omitempty"`
}

type StoreSalesItemInput struct {
	ID            *int64  `json:"id,omitempty"`
	ProductItemID *int64  `json:"product_item_id,omitempty"`
	Type          string  `json:"type"`
	Amount        float64 `json:"amount"`
	PricePerUnit  float64 `json:"price_per_unit"`
	Discount      float64 `json:"discount"`
	Detail        *string `json:"detail,omitempty"`
}

type StoreSalesCreateInput struct {
	Status                string                   `json:"status"`
	ParentID              *int64                   `json:"parent_id,omitempty"`
	MemberUserID          *int64                   `json:"member_user_id,omitempty"`
	MemberSettingCreditID *int64                   `json:"member_setting_credit_id,omitempty"`
	MemberName            *string                  `json:"member_name,omitempty"`
	MemberTel             *string                  `json:"member_tel,omitempty"`
	MemberEmail           *string                  `json:"member_email,omitempty"`
	Shipping              *StoreSalesShippingInput `json:"shipping,omitempty"`
	Items                 []StoreSalesItemInput    `json:"items"`
}

type StoreSalesUpdateInput struct {
	Status                string                   `json:"status"`
	ParentID              *int64                   `json:"parent_id,omitempty"`
	MemberUserID          *int64                   `json:"member_user_id,omitempty"`
	MemberSettingCreditID *int64                   `json:"member_setting_credit_id,omitempty"`
	MemberName            *string                  `json:"member_name,omitempty"`
	MemberTel             *string                  `json:"member_tel,omitempty"`
	MemberEmail           *string                  `json:"member_email,omitempty"`
	Shipping              *StoreSalesShippingInput `json:"shipping,omitempty"`
	Items                 []StoreSalesItemInput    `json:"items"`
}

type StoreSalesStatusInput struct {
	Status string `json:"status"`
}

type StoreSalesShippingDetail struct {
	Type       string     `json:"type"`
	ReceivedAt *time.Time `json:"received_at,omitempty"`
}

type StoreSalesItemDetail struct {
	ID            int64   `json:"id"`
	ProductItemID *int64  `json:"product_item_id,omitempty"`
	Type          string  `json:"type"`
	Amount        float64 `json:"amount"`
	PricePerUnit  float64 `json:"price_per_unit"`
	Discount      float64 `json:"discount"`
	VatType       string  `json:"vat_type"`
	VatRate       float64 `json:"vat_rate"`
	TotalPrice    float64 `json:"total_price"`
	Detail        *string `json:"detail,omitempty"`
}

type StoreSalesDetail struct {
	ID                    int64                     `json:"id"`
	SKU                   string                    `json:"sku,omitempty"`
	Status                string                    `json:"status"`
	FulfillStatus         string                    `json:"fulfill_status"`
	OrderedAt             *time.Time                `json:"ordered_at,omitempty"`
	ParentID              *int64                    `json:"parent_id,omitempty"`
	MemberUserID          *int64                    `json:"member_user_id,omitempty"`
	MemberSettingCreditID *int64                    `json:"member_setting_credit_id,omitempty"`
	MemberName            *string                   `json:"member_name,omitempty"`
	MemberTel             *string                   `json:"member_tel,omitempty"`
	MemberEmail           *string                   `json:"member_email,omitempty"`
	VatType               string                    `json:"vat_type"`
	VatRate               float64                   `json:"vat_rate"`
	Shipping              *StoreSalesShippingDetail `json:"shipping,omitempty"`
	Items                 []StoreSalesItemDetail    `json:"items"`
	Family                []StoreSalesListItem      `json:"family,omitempty"`
	CreatedAt             time.Time                 `json:"created_at"`
	UpdatedAt             time.Time                 `json:"updated_at"`
}

type StoreSalesFilterItem struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

type StoreSalesFiltersResponse struct {
	Items []StoreSalesFilterItem `json:"items"`
	Meta  struct {
		Total int64 `json:"total"`
		Page  int   `json:"page"`
		Limit int   `json:"limit"`
	} `json:"meta"`
}
