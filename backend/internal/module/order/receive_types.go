package order

// DTOs for /v1/order/receives — the goods-in side of a purchase order.
//
// v1 mapping: `order_purchase_items.status = receive_approved` + `store_data` JSON of placements →
// warehouse `purchase_order_item.status` + real `product_item_warehouse` / `product_item_stock` rows.
// The bin-only rule means a placement is just a bin id, and the warehouse → zone → shelf → rack path
// is derived on read from `warehouse_list.parent_id`, never stored on the placement.

// ReceivePlacement is one bin taking part of the received quantity.
type ReceivePlacement struct {
	BinID    int64 `json:"bin_id"`
	StockQty int   `json:"stock_qty"`
}

// ReceiveItemBody mirrors v1 ReceiveNewItemRequest: the sell price the item goes on the shelf with,
// a free-gift quantity split across placements by paid ratio, and where the goods physically land.
type ReceiveItemBody struct {
	SellPrice    float64            `json:"sell_price"`
	SellPriceVat float64            `json:"sell_price_vat"`
	BonusQty     int                `json:"bonus_qty"`
	Note         string             `json:"note"`
	Placements   []ReceivePlacement `json:"placements"`
}

// ReceiveItemResult tells the UI which catalog rows the receive created or touched, so it can jump to
// the product item (v1 returned product_id / product_item_id for the same reason).
type ReceiveItemResult struct {
	ProductItemID int64  `json:"product_item_id"`
	ProductListID int64  `json:"product_list_id"`
	OrderStatus   string `json:"order_status"`
}

// ReceiveBinOption is one candidate bin for the placement picker: free space and the derived path.
type ReceiveBinOption struct {
	ID       int64   `json:"id"`
	SKU      string  `json:"sku"`
	Name     string  `json:"name"`
	Path     string  `json:"path"`
	Capacity int     `json:"capacity"`
	Used     float64 `json:"used"`
	Free     float64 `json:"free"`
	/** Set when the bin already holds an item; the one-bin-one-item rule allows only a match. */
	ProductItemID *int64 `json:"product_item_id,omitempty"`
	Barcode       string `json:"barcode,omitempty"`
	QRCode        string `json:"qrcode,omitempty"`
}

type ReceiveBinsResponse struct {
	Items []ReceiveBinOption `json:"items"`
}

// ReceiveRejectInput mirrors v1 create-purchase-item-reject: what was wrong with the delivered goods
// and how the buyer wants it settled.
type ReceiveRejectInput struct {
	Type           string  `json:"type"`
	OverageType    *string `json:"overage_type"`
	Resolution     string  `json:"resolution"`
	Qty            int     `json:"qty"`
	Unit           string  `json:"unit"`
	Price          float64 `json:"price"`
	VatRate        float64 `json:"vat_rate"`
	Note           string  `json:"note"`
	NoteResolution string  `json:"note_resolution"`
	SystemFileIDs  []int64 `json:"system_file_ids"`
}

// ReceiveRejectDetail is one recorded reject as the receive screen lists it.
type ReceiveRejectDetail struct {
	ID                  int64              `json:"id"`
	PurchaseOrderItemID int64              `json:"purchase_order_item_id"`
	SKU                 string             `json:"sku"`
	Type                string             `json:"type"`
	OverageType         *string            `json:"overage_type,omitempty"`
	Resolution          string             `json:"resolution"`
	Status              string             `json:"status"`
	Qty                 int                `json:"qty"`
	Unit                string             `json:"unit"`
	Price               float64            `json:"price"`
	VatRate             float64            `json:"vat_rate"`
	Note                string             `json:"note"`
	NoteResolution      string             `json:"note_resolution"`
	NoteProcess         string             `json:"note_process"`
	Files               []PurchaseItemFile `json:"files"`
	CreatedAt           string             `json:"created_at"`
	CreatedByName       *string            `json:"created_by_name,omitempty"`
	ProductItemName     *string            `json:"product_item_name,omitempty"`
	ProductItemSKU      *string            `json:"product_item_sku,omitempty"`
}

type ReceiveRejectsResponse struct {
	Items []ReceiveRejectDetail `json:"items"`
}

// ReceivePlacementRow is one existing lot of a received line, so the detail view can show where the
// goods went without the v1 store_data blob.
type ReceivePlacementRow struct {
	StockID        int64   `json:"stock_id"`
	BinID          int64   `json:"bin_id"`
	BinSKU         string  `json:"bin_sku"`
	BinName        string  `json:"bin_name"`
	Path           string  `json:"path"`
	Quantity       float64 `json:"quantity"`
	FreeGift       float64 `json:"free_gift"`
	RemainQuantity float64 `json:"remain_quantity"`
	CostPerUnit    float64 `json:"cost_per_unit"`
	SellPrice      float64 `json:"sell_price"`
	ReceivedAt     *string `json:"received_at,omitempty"`
}

type ReceivePlacementsResponse struct {
	Items []ReceivePlacementRow `json:"items"`
}
