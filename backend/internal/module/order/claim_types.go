package order

import "time"

// The purchase-side claim desk works on one `purchase_order_item_reject` row at a time: v1 listed
// those rows directly (`order_purchase_item_rejects`) and its `type_reject` is this schema's
// `resolution`, with `reject` folded into `accept_loss`.
type ClaimListItem struct {
	ID                  int64   `json:"id"`
	PurchaseOrderID     *int64  `json:"purchase_order_id,omitempty"`
	PurchaseOrderItemID int64   `json:"purchase_order_item_id"`
	SKU                 string  `json:"sku"`
	PurchaseOrderSKU    *string `json:"purchase_order_sku,omitempty"`
	Type                string  `json:"type"`
	OverageType         *string `json:"overage_type,omitempty"`
	Resolution          string  `json:"resolution"`
	Status              string  `json:"status"`
	Qty                 int64   `json:"qty"`
	Unit                string  `json:"unit"`
	Price               float64 `json:"price"`
	VatRate             float64 `json:"vat_rate"`
	Note                string  `json:"note"`
	NoteResolution      string  `json:"note_resolution"`
	NoteProcess         string  `json:"note_process"`
	SupplierName        *string `json:"supplier_name,omitempty"`
	CreatedByName       *string `json:"created_by_name,omitempty"`
	ProductItemName     *string `json:"product_item_name,omitempty"`
	ProductItemSKU      *string `json:"product_item_sku,omitempty"`
	/** The claim document this line was folded into once the desk confirmed it, if any. */
	PurchaseClaimID     *int64    `json:"purchase_claim_id,omitempty"`
	PurchaseClaimSKU    *string   `json:"purchase_claim_sku,omitempty"`
	PurchaseClaimStatus *string   `json:"purchase_claim_status,omitempty"`
	CreatedAt           time.Time `json:"created_at"`
}

type ClaimListResponse struct {
	Items []ClaimListItem `json:"items"`
	Total int             `json:"total"`
	Page  int             `json:"page"`
	Limit int             `json:"limit"`
}

type ClaimCountResponse struct {
	Count    int64            `json:"count"`
	ByStatus map[string]int64 `json:"by_status"`
}

// ClaimDetail adds what the process screen shows around the line: the order header, the sibling
// rejects on the same order, and the affected purchase line.
type ClaimDetail struct {
	ClaimListItem
	Files    []PurchaseItemFile  `json:"files"`
	Order    *PurchaseDetail     `json:"order,omitempty"`
	Item     *PurchaseItemDetail `json:"item,omitempty"`
	Siblings []ClaimListItem     `json:"siblings"`
}

type ClaimListQuery struct {
	Page       int
	Limit      int
	Search     string
	Status     string
	Resolution string
	DateFrom   string
	DateTo     string
	SortBy     string
	SortOrder  string
}

// ClaimUpdateInput is v1's single PUT: the desk picks an outcome, notes why, and moves the status.
// Fields left nil are untouched, which is what "save draft" relies on.
type ClaimUpdateInput struct {
	Resolution     *string `json:"resolution,omitempty"`
	Status         *string `json:"status,omitempty"`
	NoteResolution *string `json:"note_resolution,omitempty"`
	NoteProcess    *string `json:"note_process,omitempty"`
}

type ClaimUpdateResult struct {
	ID              int64   `json:"id"`
	Status          string  `json:"status"`
	Resolution      string  `json:"resolution"`
	PurchaseClaimID *int64  `json:"purchase_claim_id,omitempty"`
	ClaimSKU        *string `json:"claim_sku,omitempty"`
	/** Set when the line went back to `accept_loss` and the PO line had to be restored. */
	RestoredItemQty *int64 `json:"restored_item_qty,omitempty"`
}
