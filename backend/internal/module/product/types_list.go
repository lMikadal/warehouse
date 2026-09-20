package product

import "time"

type ItemListFilter struct {
	Page, Limit    int
	Locale, Search string
	Sort, Order    string
	IsActive       *bool
	IsNew          *bool
	CategoryID     *int64
	BrandID        *int64
	CarBrandID     *int64
	ModelID        *int64
	CarYear        *int
	OEM            string
	IDs            []int64 // optional; product_item.id IN (…)
}

type ItemBrowseRow struct {
	ID                 int64
	ProductListID      int64
	SKU                string
	Price              float64
	Unit               string
	QtyPerUnit         int
	MinimumStock       int
	IsActive           bool
	IsStopped          bool
	UpdatedAt          time.Time
	Tag                string
	IsNew              bool
	ProductBrandID     *int64
	ProductCategoryID  *int64
	Name               string
	BrandName          string
	CategoryName       string
	TotalStock         float64
	ReservedStock      float64
	AvailableStock     float64
	TypePrice          string
	PriceWholesale     float64
	AmountPriceWholesale int
	LowStock           bool
	WarehouseRootCount int
	CarCount             int
	CarSummary           string
	CoverSystemFileID    *int64
}

type CarFitmentRow struct {
	ID          int64
	BrandName   string
	ModelName   string
	EngineName  string
	YearStart   *int
	YearEnd     *int
	GearType    *string
}

type WarehousePlacementRow struct {
	PlacementID   int64
	BinID         int64
	WarehouseName string
	ZoneName      string
	ShelfName     string
	RackName      string
	BinName       string
	Quantity      float64
}
