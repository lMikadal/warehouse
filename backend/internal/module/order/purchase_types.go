package order

import "time"

// Purchase = คำสั่งซื้อ (v1 order_purchases → purchase_order).
// v1 kept six denormalised money columns; warehouse stores discount/special_discount/total_price
// and derives the rest so the API still answers with the v1 field set.

type PurchaseListQuery struct {
	Search string
	Status string
	// StatusIn narrows to a set of statuses when Status is empty; the receive desk uses it to keep
	// unpaid orders out of its list no matter what the caller asks for.
	StatusIn []string
	// HasReceiveReject keeps only orders where goods-in found something wrong. v1 had a dedicated
	// receive_reject order status; here the evidence lives on the lines, so it is a flag.
	HasReceiveReject bool
	DateFrom         string
	DateTo           string
	CreatedBy        *int64
	SupplierID       *int64
	RequestID        *int64
	GrandTotalMin    *float64
	GrandTotalMax    *float64
	SortBy           string
	SortOrder        string
	Page             int
	Limit            int
}

type PurchaseTotals struct {
	TotalPrice         float64 `json:"total_price"`
	TotalDiscount      float64 `json:"total_discount"`
	TotalPriceDiscount float64 `json:"total_price_discount"`
	TotalVat           float64 `json:"total_vat"`
	TotalPriceVat      float64 `json:"total_price_vat"`
	TotalGrandPrice    float64 `json:"total_grand_price"`
}

type PurchaseListItem struct {
	ID                   int64   `json:"id"`
	SKU                  *string `json:"sku,omitempty"`
	SKUDraft             *string `json:"sku_draft,omitempty"`
	Status               string  `json:"status"`
	IsWaiting            bool    `json:"is_waiting"`
	SupplierUserID       *int64  `json:"supplier_user_id,omitempty"`
	SupplierName         *string `json:"supplier_name,omitempty"`
	SupplierSKU          *string `json:"supplier_sku,omitempty"`
	PurchaseRequestID    *int64  `json:"purchase_request_id,omitempty"`
	PurchaseRequestSKU   *string `json:"purchase_request_sku,omitempty"`
	RequestCreatedByName *string `json:"request_created_by_name,omitempty"`
	TotalQty             int64   `json:"total_qty"`
	ApprovedItemCount    int64   `json:"approved_item_count"`
	ItemRejectCount      int64   `json:"item_reject_count"`
	ClaimRejectCount     int64   `json:"claim_reject_count"`
	VatType              string  `json:"vat_type"`
	VatRate              float64 `json:"vat_rate"`
	PurchaseTotals
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
	CreatedByName *string   `json:"created_by_name,omitempty"`
}

type PurchaseListResponse struct {
	Items []PurchaseListItem `json:"items"`
	Total int                `json:"total"`
	Page  int                `json:"page"`
	Limit int                `json:"limit"`
}

type PurchaseCountResponse struct {
	Count        int64            `json:"count"`
	ByStatus     map[string]int64 `json:"by_status"`
	ByItemStatus map[string]int64 `json:"by_item_status"`
	// KPI cards on the v1 list header: order value excl. VAT, the VAT on top, and what is still owed.
	SumTotalExVat      float64 `json:"sum_total_ex_vat"`
	SumTotalVat        float64 `json:"sum_total_vat"`
	SumOutstandingDebt float64 `json:"sum_outstanding_debt"`
}

type PurchaseItemInput struct {
	ID                       *int64  `json:"id,omitempty"`
	PurchaseRequestItemID    *int64  `json:"purchase_request_item_id,omitempty"`
	Type                     string  `json:"type"`
	ProductItemID            *int64  `json:"product_item_id,omitempty"`
	Name                     *string `json:"name,omitempty"`
	ProductAttributeBrandID  *int64  `json:"product_attribute_brand_id,omitempty"`
	ProductAttributeModelID  *int64  `json:"product_attribute_model_id,omitempty"`
	ProductAttributeEngineID *int64  `json:"product_attribute_engine_id,omitempty"`
	IdentificationNumber     string  `json:"identification_number"`
	Qty                      int64   `json:"qty"`
	FreeGift                 int64   `json:"free_gift"`
	Unit                     string  `json:"unit"`
	PricePerUnit             float64 `json:"price_per_unit"`
	VatRate                  float64 `json:"vat_rate"`
	Discount                 float64 `json:"discount"`
	Note                     string  `json:"note"`
	SystemFileIDs            []int64 `json:"system_file_ids,omitempty"`
}

type PurchaseSaveInput struct {
	Status            string              `json:"status"`
	SupplierUserID    *int64              `json:"supplier_user_id,omitempty"`
	PurchaseRequestID *int64              `json:"purchase_request_id,omitempty"`
	OrderedAt         *time.Time          `json:"ordered_at,omitempty"`
	VatType           string              `json:"vat_type"`
	VatRate           float64             `json:"vat_rate"`
	Discount          float64             `json:"discount"`
	SpecialDiscount   float64             `json:"special_discount"`
	IsWaiting         *bool               `json:"is_waiting,omitempty"`
	Note              string              `json:"note"`
	Items             []PurchaseItemInput `json:"items"`
}

type PurchaseStatusInput struct {
	Status string `json:"status"`
	Note   string `json:"note,omitempty"`
}

type PurchaseItemStatusInput struct {
	Status string `json:"status"`
	Note   string `json:"note,omitempty"`
}

// PurchaseConvertUnitInput mirrors v1 ConvertUnitRequest: take QtyToConvert off the line and
// re-express it in TargetUnit, where FromRatio units of the old unit make ToRatio of the new one.
type PurchaseConvertUnitInput struct {
	QtyToConvert int64  `json:"qty_to_convert"`
	FromRatio    int64  `json:"from_ratio"`
	ToRatio      int64  `json:"to_ratio"`
	TargetUnit   string `json:"target_unit"`
}

type PurchaseConvertUnitResult struct {
	NewItemID int64 `json:"new_item_id"`
	Qty       int64 `json:"qty"`
	// SourceDeleted is true when the split consumed the whole source line, which v1 retires.
	SourceDeleted bool `json:"source_deleted"`
}

type PurchaseItemFile struct {
	ID           int64 `json:"id"`
	SystemFileID int64 `json:"system_file_id"`
	SortOrder    int   `json:"sort_order"`
}

type PurchaseItemDetail struct {
	ID                       int64              `json:"id"`
	PurchaseOrderID          int64              `json:"purchase_order_id"`
	PurchaseRequestItemID    *int64             `json:"purchase_request_item_id,omitempty"`
	ParentID                 *int64             `json:"parent_id,omitempty"`
	Status                   string             `json:"status"`
	Type                     string             `json:"type"`
	ProductItemID            *int64             `json:"product_item_id,omitempty"`
	ProductItemSKU           *string            `json:"product_item_sku,omitempty"`
	ProductItemName          *string            `json:"product_item_name,omitempty"`
	CodeBarcode              *string            `json:"code_barcode,omitempty"`
	CodeQrcode               *string            `json:"code_qrcode,omitempty"`
	Name                     *string            `json:"name,omitempty"`
	ProductAttributeBrandID  *int64             `json:"product_attribute_brand_id,omitempty"`
	BrandName                *string            `json:"brand_name,omitempty"`
	ProductAttributeModelID  *int64             `json:"product_attribute_model_id,omitempty"`
	ModelName                *string            `json:"model_name,omitempty"`
	ProductAttributeEngineID *int64             `json:"product_attribute_engine_id,omitempty"`
	EngineName               *string            `json:"engine_name,omitempty"`
	IdentificationNumber     string             `json:"identification_number"`
	Qty                      int64              `json:"qty"`
	FreeGift                 int64              `json:"free_gift"`
	Unit                     string             `json:"unit"`
	OldQty                   *int64             `json:"old_qty,omitempty"`
	OldUnit                  *string            `json:"old_unit,omitempty"`
	PricePerUnit             float64            `json:"price_per_unit"`
	VatRate                  float64            `json:"vat_rate"`
	Discount                 float64            `json:"discount"`
	TotalPrice               float64            `json:"total_price"`
	TotalPriceVat            float64            `json:"total_price_vat"`
	Note                     string             `json:"note"`
	ReceivedQty              float64            `json:"received_qty"`
	Files                    []PurchaseItemFile `json:"files"`
	CreatedAt                time.Time          `json:"created_at"`
	UpdatedAt                time.Time          `json:"updated_at"`
}

type PurchasePayment struct {
	ID                     int64      `json:"id"`
	PurchaseOrderID        int64      `json:"purchase_order_id"`
	SettingPaymentMethodID int64      `json:"setting_payment_method_id"`
	PaymentMethodName      *string    `json:"payment_method_name,omitempty"`
	SupplierBankID         *int64     `json:"supplier_bank_id,omitempty"`
	SupplierBankName       *string    `json:"supplier_bank_name,omitempty"`
	VatRate                float64    `json:"vat_rate"`
	Discount               float64    `json:"discount"`
	TotalPrice             float64    `json:"total_price"`
	Note                   string     `json:"note"`
	SystemFileID           *int64     `json:"system_file_id,omitempty"`
	CreditTerm             *int       `json:"credit_term,omitempty"`
	PaidAt                 *time.Time `json:"paid_at,omitempty"`
	CreatedAt              time.Time  `json:"created_at"`
	CreatedByName          *string    `json:"created_by_name,omitempty"`
}

type PurchasePaymentInput struct {
	SettingPaymentMethodID int64      `json:"setting_payment_method_id"`
	SupplierBankID         *int64     `json:"supplier_bank_id,omitempty"`
	VatRate                float64    `json:"vat_rate"`
	Discount               float64    `json:"discount"`
	TotalPrice             float64    `json:"total_price"`
	Note                   string     `json:"note"`
	SystemFileID           *int64     `json:"system_file_id,omitempty"`
	CreditTerm             *int       `json:"credit_term,omitempty"`
	PaidAt                 *time.Time `json:"paid_at,omitempty"`
}

type PurchaseDetail struct {
	ID                   int64     `json:"id"`
	SKU                  *string   `json:"sku,omitempty"`
	SKUDraft             *string   `json:"sku_draft,omitempty"`
	Status               string    `json:"status"`
	IsWaiting            bool      `json:"is_waiting"`
	SupplierUserID       *int64    `json:"supplier_user_id,omitempty"`
	SupplierName         *string   `json:"supplier_name,omitempty"`
	PurchaseRequestID    *int64    `json:"purchase_request_id,omitempty"`
	PurchaseRequestSKU   *string   `json:"purchase_request_sku,omitempty"`
	RequestCreatedByName *string   `json:"request_created_by_name,omitempty"`
	OrderedAt            time.Time `json:"ordered_at"`
	VatType              string    `json:"vat_type"`
	VatRate              float64   `json:"vat_rate"`
	Discount             float64   `json:"discount"`
	SpecialDiscount      float64   `json:"special_discount"`
	TotalQty             int64     `json:"total_qty"`
	PurchaseTotals
	Note          string               `json:"note"`
	Items         []PurchaseItemDetail `json:"items"`
	Payments      []PurchasePayment    `json:"payments"`
	Files         []PurchaseItemFile   `json:"files"`
	CreatedAt     time.Time            `json:"created_at"`
	UpdatedAt     time.Time            `json:"updated_at"`
	CreatedByName *string              `json:"created_by_name,omitempty"`
}

type PurchaseStockHistoryRow struct {
	ID               int64      `json:"id"`
	ProductItemID    int64      `json:"product_item_id"`
	ProductItemName  *string    `json:"product_item_name,omitempty"`
	PurchaseOrderID  *int64     `json:"purchase_order_id,omitempty"`
	PurchaseOrderSKU *string    `json:"purchase_order_sku,omitempty"`
	SupplierUserID   *int64     `json:"supplier_user_id,omitempty"`
	SupplierName     *string    `json:"supplier_name,omitempty"`
	Quantity         float64    `json:"quantity"`
	RemainQuantity   float64    `json:"remain_quantity"`
	CostPerUnit      float64    `json:"cost_per_unit"`
	DiscountPerUnit  float64    `json:"discount_per_unit"`
	SellPrice        float64    `json:"sell_price"`
	ReceivedAt       *time.Time `json:"received_at,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
}

type PurchaseStockHistoryResponse struct {
	Items []PurchaseStockHistoryRow `json:"items"`
}

type PurchaseFileInput struct {
	SystemFileIDs []int64 `json:"system_file_ids"`
}
