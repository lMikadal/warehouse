package product

import (
	"context"
	"database/sql"
	"strings"
	"time"
)

type ListRepository struct {
	db *sql.DB
}

func NewListRepository(db *sql.DB) *ListRepository {
	return &ListRepository{db: db}
}

type localeBlock struct {
	Name        string `json:"name"`
	SubName     string `json:"sub_name,omitempty"`
	Description string `json:"description,omitempty"`
}

type listLangBody struct {
	Th localeBlock `json:"th"`
	En localeBlock `json:"en"`
}

type listCarBody struct {
	ID        *int64  `json:"id,omitempty"`
	BrandID   *int64  `json:"product_attribute_brand_id,omitempty"`
	ModelID   *int64  `json:"product_attribute_model_id,omitempty"`
	EngineID  int64   `json:"product_attribute_engine_id"`
	GearType  *string `json:"gear_type,omitempty"`
	YearStart *int    `json:"year_start,omitempty"`
	YearEnd   *int    `json:"year_end,omitempty"`
}

type itemLangNames struct {
	Th string `json:"th"`
	En string `json:"en"`
}

type itemChannelPriceBody struct {
	SettingSaleChannelID int64   `json:"setting_sale_channel_id"`
	Price                float64 `json:"price"`
	PriceVat             float64 `json:"price_vat,omitempty"`
	VatType              string  `json:"vat_type,omitempty"`
	VatRate              float64 `json:"vat_rate,omitempty"`
}

type itemSupplierBody struct {
	SupplierUserID int64   `json:"supplier_user_id"`
	CostPrice      float64 `json:"cost_price"`
	Discount       float64 `json:"discount"`
	DiscountType   string  `json:"discount_type"`
}

type itemWarehouseBody struct {
	ID    *int64 `json:"id,omitempty"`
	BinID int64  `json:"bin_id"`
}

type itemFileBody struct {
	ID           *int64 `json:"id,omitempty"`
	SystemFileID int64  `json:"system_file_id"`
	SortOrder    int    `json:"sort_order"`
}

type listItemBody struct {
	ID                 *int64                 `json:"id,omitempty"`
	SKU                string                 `json:"sku,omitempty"`
	Barcode            string                 `json:"barcode,omitempty"`
	Qrcode             string                 `json:"qrcode,omitempty"`
	Price              float64                `json:"price"`
	PriceWholesale     float64                `json:"price_wholesale"`
	PriceVat           float64                `json:"price_vat"`
	PriceWholesaleVat    float64                `json:"price_wholesale_vat"`
	AmountPriceWholesale int                    `json:"amount_price_wholesale"`
	VatType              string                 `json:"vat_type,omitempty"`
	VatRate            float64                `json:"vat_rate,omitempty"`
	TypePrice          string                 `json:"type_price"`
	Unit               string                 `json:"unit"`
	QtyPerUnit         int                    `json:"qty_per_unit"`
	Weight             *float64               `json:"weight,omitempty"`
	Width              *float64               `json:"width,omitempty"`
	Length             *float64               `json:"length,omitempty"`
	Height             *float64               `json:"height,omitempty"`
	MinimumStock       int                    `json:"minimum_stock"`
	OldProductItemID   *int64                 `json:"old_product_item_id,omitempty"`
	IsNew              bool                   `json:"is_new"`
	IsActive           bool                   `json:"is_active"`
	IsStopped          bool                   `json:"is_stopped"`
	IsAuthentic        bool                   `json:"is_authentic"`
	Promotion          string                 `json:"promotion,omitempty"`
	TotalStock         float64                `json:"total_stock,omitempty"`
	WarehouseRootCount int                    `json:"warehouse_root_count,omitempty"`
	LowStock           bool                   `json:"low_stock,omitempty"`
	Names              itemLangNames          `json:"names"`
	ChannelPrices      []itemChannelPriceBody `json:"channel_prices,omitempty"`
	Suppliers          []itemSupplierBody     `json:"suppliers,omitempty"`
	Warehouses         []itemWarehouseBody    `json:"warehouse_placements,omitempty"`
	Files              []itemFileBody         `json:"files,omitempty"`
}

type listAggregateBody struct {
	SKU               string         `json:"sku"`
	SupplierSKU       string         `json:"supplier_sku,omitempty"`
	Tag               string         `json:"tag,omitempty"`
	Note              string         `json:"note,omitempty"`
	IsActive          bool           `json:"is_active"`
	ProductBrandID    *int64         `json:"product_brand_id,omitempty"`
	ProductCategoryID *int64         `json:"product_category_id,omitempty"`
	Languages         listLangBody   `json:"languages"`
	FactoryCodes      []string       `json:"factory_codes,omitempty"`
	OtherCodes        []string       `json:"other_codes,omitempty"`
	SupplierIDs       []int64        `json:"supplier_ids,omitempty"`
	Cars              []listCarBody  `json:"cars,omitempty"`
	Items             []listItemBody `json:"items"`
}

type listAggregateResponse struct {
	ID                int64          `json:"id"`
	SKU               string         `json:"sku"`
	SupplierSKU       string         `json:"supplier_sku"`
	Tag               string         `json:"tag"`
	Note              string         `json:"note"`
	IsActive          bool           `json:"is_active"`
	ProductBrandID    *int64         `json:"product_brand_id,omitempty"`
	ProductCategoryID *int64         `json:"product_category_id,omitempty"`
	UpdatedAt         time.Time      `json:"updated_at"`
	Languages         listLangBody   `json:"languages"`
	FactoryCodes      []string       `json:"factory_codes"`
	OtherCodes        []string       `json:"other_codes"`
	SupplierIDs       []int64        `json:"supplier_ids"`
	Cars              []listCarBody  `json:"cars"`
	Items             []listItemBody `json:"items"`
}

func validateListAggregate(b listAggregateBody) error {
	if strings.TrimSpace(b.SKU) == "" {
		return ErrValidation
	}
	if strings.TrimSpace(b.Languages.Th.Name) == "" || strings.TrimSpace(b.Languages.En.Name) == "" {
		return ErrValidation
	}
	if len(b.Items) == 0 {
		return ErrValidation
	}
	return nil
}

func (r *ListRepository) activeVatSnapshot(ctx context.Context) (SettingVatSnapshot, error) {
	return activeSettingVatSnapshot(ctx, r.db)
}

func (r *ListRepository) GetAggregate(ctx context.Context, id int64, locale string) (*listAggregateResponse, error) {
	var row struct {
		sku, tag, note, supplierSKU string
		isActive                    bool
		brandID, catID              sql.NullInt64
		updatedAt                   time.Time
	}
	err := r.db.QueryRowContext(ctx, `
SELECT sku, supplier_sku, tag, note, is_active, product_brand_id, product_category_id, updated_at
FROM product_list WHERE id = $1 AND deleted_at IS NULL`, id).Scan(
		&row.sku, &row.supplierSKU, &row.tag, &row.note, &row.isActive, &row.brandID, &row.catID, &row.updatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	out := &listAggregateResponse{
		ID: id, SKU: row.sku, SupplierSKU: row.supplierSKU, Tag: row.tag, Note: row.note,
		IsActive: row.isActive, UpdatedAt: row.updatedAt,
	}
	if row.brandID.Valid {
		out.ProductBrandID = &row.brandID.Int64
	}
	if row.catID.Valid {
		out.ProductCategoryID = &row.catID.Int64
	}
	out.Languages = loadListLang(ctx, r.db, id)
	out.FactoryCodes = loadListCodes(ctx, r.db, id, "factory")
	out.OtherCodes = loadListCodes(ctx, r.db, id, "other")
	out.SupplierIDs = loadListSuppliers(ctx, r.db, id)
	out.Cars = loadListCars(ctx, r.db, id)
	items, err := loadListItems(ctx, r.db, id)
	if err != nil {
		return nil, err
	}
	out.Items = items
	return out, nil
}

func loadListLang(ctx context.Context, db *sql.DB, listID int64) listLangBody {
	var out listLangBody
	for _, loc := range []struct {
		key string
		dst *localeBlock
	}{
		{"th", &out.Th},
		{"en", &out.En},
	} {
		_ = db.QueryRowContext(ctx, `
SELECT name, COALESCE(sub_name, ''), COALESCE(description, '')
FROM product_list_language WHERE product_list_id = $1 AND locale = $2`, listID, loc.key).
			Scan(&loc.dst.Name, &loc.dst.SubName, &loc.dst.Description)
	}
	return out
}

func loadListCodes(ctx context.Context, db *sql.DB, listID int64, codeType string) []string {
	rows, err := db.QueryContext(ctx, `
SELECT sku FROM product_list_code
WHERE product_list_id = $1 AND code_type = $2::product_list_code_type AND deleted_at IS NULL
ORDER BY id`, listID, codeType)
	if err != nil {
		return nil
	}
	defer rows.Close()
	var out []string
	for rows.Next() {
		var s string
		if rows.Scan(&s) == nil && strings.TrimSpace(s) != "" {
			out = append(out, s)
		}
	}
	return out
}

func loadListSuppliers(ctx context.Context, db *sql.DB, listID int64) []int64 {
	rows, err := db.QueryContext(ctx, `
SELECT supplier_user_id FROM product_list_supplier WHERE product_list_id = $1`, listID)
	if err != nil {
		return nil
	}
	defer rows.Close()
	var out []int64
	for rows.Next() {
		var id int64
		if rows.Scan(&id) == nil {
			out = append(out, id)
		}
	}
	return out
}

func loadListCars(ctx context.Context, db *sql.DB, listID int64) []listCarBody {
	rows, err := db.QueryContext(ctx, `
SELECT id, product_attribute_brand_id, product_attribute_model_id, product_attribute_engine_id,
       gear_type::text, year_start, year_end
FROM product_list_car WHERE product_list_id = $1 AND deleted_at IS NULL ORDER BY id`, listID)
	if err != nil {
		return nil
	}
	defer rows.Close()
	var out []listCarBody
	for rows.Next() {
		var c listCarBody
		var brand, model sql.NullInt64
		var gear sql.NullString
		var ys, ye sql.NullInt64
		var carID int64
		if err := rows.Scan(&carID, &brand, &model, &c.EngineID, &gear, &ys, &ye); err != nil {
			continue
		}
		if brand.Valid {
			c.BrandID = &brand.Int64
		}
		if model.Valid {
			c.ModelID = &model.Int64
		}
		c.ID = &carID
		if gear.Valid {
			g := gear.String
			c.GearType = &g
		}
		if ys.Valid {
			v := int(ys.Int64)
			c.YearStart = &v
		}
		if ye.Valid {
			v := int(ye.Int64)
			c.YearEnd = &v
		}
		out = append(out, c)
	}
	return out
}

func loadListItems(ctx context.Context, db *sql.DB, listID int64) ([]listItemBody, error) {
	rows, err := db.QueryContext(ctx, `
SELECT id, COALESCE(sku, ''), COALESCE(barcode, ''), COALESCE(qrcode, ''),
       price::float8, price_wholesale::float8, price_vat::float8, price_wholesale_vat::float8,
       amount_price_wholesale,
       vat_type::text, vat_rate::float8, type_price::text, unit::text, qty_per_unit,
       weight::float8, width::float8, length::float8, height::float8,
       minimum_stock, old_product_item_id, is_new, is_active, is_stopped, is_authentic, promotion
FROM product_item WHERE product_list_id = $1 AND deleted_at IS NULL ORDER BY id`, listID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []listItemBody
	for rows.Next() {
		var it listItemBody
		var itemID int64
		var w, wi, l, h sql.NullFloat64
		var oldItemID sql.NullInt64
		if err := rows.Scan(&itemID, &it.SKU, &it.Barcode, &it.Qrcode, &it.Price, &it.PriceWholesale,
			&it.PriceVat, &it.PriceWholesaleVat, &it.AmountPriceWholesale, &it.VatType, &it.VatRate,
			&it.TypePrice, &it.Unit, &it.QtyPerUnit, &w, &wi, &l, &h,
			&it.MinimumStock, &oldItemID, &it.IsNew, &it.IsActive, &it.IsStopped, &it.IsAuthentic, &it.Promotion); err != nil {
			return nil, err
		}
		if w.Valid {
			it.Weight = &w.Float64
		}
		if wi.Valid {
			it.Width = &wi.Float64
		}
		if l.Valid {
			it.Length = &l.Float64
		}
		if h.Valid {
			it.Height = &h.Float64
		}
		if oldItemID.Valid {
			it.OldProductItemID = &oldItemID.Int64
		}
		it.ID = &itemID
		it.Names = loadItemNames(ctx, db, itemID)
		it.ChannelPrices = loadItemChannelPrices(ctx, db, itemID)
		it.Suppliers = loadItemSuppliers(ctx, db, itemID)
		it.Warehouses = loadItemWarehouses(ctx, db, itemID)
		it.Files = loadItemFiles(ctx, db, itemID)
		loadItemSummaryStats(ctx, db, itemID, it.MinimumStock, &it)
		out = append(out, it)
	}
	return out, rows.Err()
}

func loadItemNames(ctx context.Context, db *sql.DB, itemID int64) itemLangNames {
	var n itemLangNames
	_ = db.QueryRowContext(ctx, `SELECT name FROM product_item_language WHERE product_item_id = $1 AND locale = 'th'`, itemID).Scan(&n.Th)
	_ = db.QueryRowContext(ctx, `SELECT name FROM product_item_language WHERE product_item_id = $1 AND locale = 'en'`, itemID).Scan(&n.En)
	return n
}

func loadItemChannelPrices(ctx context.Context, db *sql.DB, itemID int64) []itemChannelPriceBody {
	rows, _ := db.QueryContext(ctx, `
SELECT setting_sale_channel_id, price::float8, price_vat::float8, vat_type::text, vat_rate::float8
FROM product_item_price WHERE product_item_id = $1`, itemID)
	if rows == nil {
		return nil
	}
	defer rows.Close()
	var out []itemChannelPriceBody
	for rows.Next() {
		var p itemChannelPriceBody
		if rows.Scan(&p.SettingSaleChannelID, &p.Price, &p.PriceVat, &p.VatType, &p.VatRate) == nil {
			out = append(out, p)
		}
	}
	return out
}

func loadItemSuppliers(ctx context.Context, db *sql.DB, itemID int64) []itemSupplierBody {
	rows, _ := db.QueryContext(ctx, `
SELECT supplier_user_id, cost_price::float8, discount::float8, discount_type::text
FROM product_item_supplier WHERE product_item_id = $1`, itemID)
	if rows == nil {
		return nil
	}
	defer rows.Close()
	var out []itemSupplierBody
	for rows.Next() {
		var s itemSupplierBody
		if rows.Scan(&s.SupplierUserID, &s.CostPrice, &s.Discount, &s.DiscountType) == nil {
			out = append(out, s)
		}
	}
	return out
}

func loadItemWarehouses(ctx context.Context, db *sql.DB, itemID int64) []itemWarehouseBody {
	rows, _ := db.QueryContext(ctx, `
SELECT id, bin_id FROM product_item_warehouse WHERE product_item_id = $1 AND deleted_at IS NULL`, itemID)
	if rows == nil {
		return nil
	}
	defer rows.Close()
	var out []itemWarehouseBody
	for rows.Next() {
		var w itemWarehouseBody
		if rows.Scan(&w.ID, &w.BinID) == nil {
			out = append(out, w)
		}
	}
	return out
}

func loadItemSummaryStats(ctx context.Context, db *sql.DB, itemID int64, minimumStock int, it *listItemBody) {
	_ = db.QueryRowContext(ctx, `
SELECT COALESCE(SUM(s.remain_quantity), 0)::float8
FROM product_item_stock s
WHERE s.product_item_id = $1 AND s.deleted_at IS NULL`, itemID).Scan(&it.TotalStock)
	var whCnt int
	_ = db.QueryRowContext(ctx, `
SELECT COUNT(DISTINCT zone.parent_id)::int
FROM product_item_warehouse piw
INNER JOIN warehouse_list bin ON bin.id = piw.bin_id AND bin.type = 'bin'
LEFT JOIN warehouse_list rack ON rack.id = bin.parent_id AND rack.type = 'rack'
LEFT JOIN warehouse_list shelf ON shelf.id = rack.parent_id AND shelf.type = 'shelf'
LEFT JOIN warehouse_list zone ON zone.id = shelf.parent_id AND zone.type = 'zone'
WHERE piw.product_item_id = $1 AND piw.deleted_at IS NULL AND zone.parent_id IS NOT NULL`, itemID).Scan(&whCnt)
	it.WarehouseRootCount = whCnt
	it.LowStock = it.TotalStock < float64(minimumStock)
}

func loadItemFiles(ctx context.Context, db *sql.DB, itemID int64) []itemFileBody {
	rows, err := db.QueryContext(ctx, `
SELECT id, system_file_id, sort_order
FROM product_item_file
WHERE product_item_id = $1 AND deleted_at IS NULL
ORDER BY sort_order ASC, id ASC`, itemID)
	if err != nil {
		return nil
	}
	defer rows.Close()
	var out []itemFileBody
	for rows.Next() {
		var f itemFileBody
		var id int64
		if rows.Scan(&id, &f.SystemFileID, &f.SortOrder) == nil {
			f.ID = &id
			out = append(out, f)
		}
	}
	return out
}

func (r *ListRepository) CreateAggregate(ctx context.Context, b listAggregateBody, actorID int64) (int64, error) {
	if err := validateListAggregate(b); err != nil {
		return 0, err
	}
	snap, err := r.activeVatSnapshot(ctx)
	if err != nil {
		return 0, err
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	var listID int64
	err = tx.QueryRowContext(ctx, `
INSERT INTO product_list (sku, product_brand_id, product_category_id, tag, supplier_sku, note, is_active, created_by, updated_by)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8) RETURNING id`,
		strings.TrimSpace(b.SKU), b.ProductBrandID, b.ProductCategoryID,
		strings.TrimSpace(b.Tag), strings.TrimSpace(b.SupplierSKU), strings.TrimSpace(b.Note),
		b.IsActive, nullActor(actorID)).Scan(&listID)
	if err != nil {
		return 0, err
	}
	if err := upsertListChildren(ctx, tx, listID, b, actorID, snap); err != nil {
		return 0, err
	}
	return listID, tx.Commit()
}

func (r *ListRepository) UpdateAggregate(ctx context.Context, listID int64, b listAggregateBody, actorID int64) error {
	if err := validateListAggregate(b); err != nil {
		return ErrValidation
	}
	snap, err := r.activeVatSnapshot(ctx)
	if err != nil {
		return err
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	res, err := tx.ExecContext(ctx, `
UPDATE product_list SET sku = $2, product_brand_id = $3, product_category_id = $4, tag = $5,
  supplier_sku = $6, note = $7, is_active = $8, updated_at = NOW(), updated_by = $9
WHERE id = $1 AND deleted_at IS NULL`, listID,
		strings.TrimSpace(b.SKU), b.ProductBrandID, b.ProductCategoryID,
		strings.TrimSpace(b.Tag), strings.TrimSpace(b.SupplierSKU), strings.TrimSpace(b.Note),
		b.IsActive, nullActor(actorID))
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	if err := upsertListChildren(ctx, tx, listID, b, actorID, snap); err != nil {
		return err
	}
	return tx.Commit()
}

func upsertListChildren(ctx context.Context, tx *sql.Tx, listID int64, b listAggregateBody, actorID int64, snap SettingVatSnapshot) error {
	for _, loc := range []struct {
		locale string
		block  localeBlock
	}{
		{"th", b.Languages.Th},
		{"en", b.Languages.En},
	} {
		if _, err := tx.ExecContext(ctx, `
INSERT INTO product_list_language (product_list_id, locale, name, sub_name, description)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (product_list_id, locale) DO UPDATE SET
  name = EXCLUDED.name, sub_name = EXCLUDED.sub_name, description = EXCLUDED.description, updated_at = NOW()`,
			listID, loc.locale, strings.TrimSpace(loc.block.Name), nullStr(loc.block.SubName), nullStr(loc.block.Description)); err != nil {
			return err
		}
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM product_list_supplier WHERE product_list_id = $1`, listID); err != nil {
		return err
	}
	for _, sid := range b.SupplierIDs {
		if sid <= 0 {
			continue
		}
		if _, err := tx.ExecContext(ctx, `
INSERT INTO product_list_supplier (product_list_id, supplier_user_id) VALUES ($1, $2)
ON CONFLICT DO NOTHING`, listID, sid); err != nil {
			return err
		}
	}
	if err := syncListCodes(ctx, tx, listID, "factory", b.FactoryCodes, actorID); err != nil {
		return err
	}
	if err := syncListCodes(ctx, tx, listID, "other", b.OtherCodes, actorID); err != nil {
		return err
	}
	if err := syncListCars(ctx, tx, listID, b.Cars, actorID); err != nil {
		return err
	}
	return syncListItems(ctx, tx, listID, b.Items, actorID, snap)
}

func nullStr(s string) sql.NullString {
	s = strings.TrimSpace(s)
	if s == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: s, Valid: true}
}

func strOrNull(s string) any {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	return s
}

func int64OrNull(id *int64) any {
	if id == nil || *id <= 0 {
		return nil
	}
	return *id
}

func validateOldProductItemRef(ctx context.Context, tx *sql.Tx, listID int64, oldID *int64) error {
	if oldID == nil || *oldID <= 0 {
		return nil
	}
	var refListID int64
	err := tx.QueryRowContext(ctx, `
SELECT product_list_id FROM product_item WHERE id = $1 AND deleted_at IS NULL`, *oldID).Scan(&refListID)
	if err == sql.ErrNoRows {
		return ErrValidation
	}
	if err != nil {
		return err
	}
	if refListID != listID {
		return ErrValidation
	}
	return nil
}

func syncListCodes(ctx context.Context, tx *sql.Tx, listID int64, codeType string, codes []string, actorID int64) error {
	if _, err := tx.ExecContext(ctx, `
UPDATE product_list_code SET deleted_at = NOW(), updated_at = NOW(), updated_by = $3
WHERE product_list_id = $1 AND code_type = $2::product_list_code_type AND deleted_at IS NULL`,
		listID, codeType, nullActor(actorID)); err != nil {
		return err
	}
	for _, code := range codes {
		code = strings.TrimSpace(code)
		if code == "" {
			continue
		}
		if _, err := tx.ExecContext(ctx, `
INSERT INTO product_list_code (product_list_id, code_type, sku, created_by, updated_by)
VALUES ($1, $2::product_list_code_type, $3, $4, $4)`, listID, codeType, code, nullActor(actorID)); err != nil {
			return err
		}
	}
	return nil
}

func syncListCars(ctx context.Context, tx *sql.Tx, listID int64, cars []listCarBody, actorID int64) error {
	keep := map[int64]bool{}
	for _, c := range cars {
		if c.ID != nil && *c.ID > 0 {
			keep[*c.ID] = true
		}
	}
	rows, err := tx.QueryContext(ctx, `SELECT id FROM product_list_car WHERE product_list_id = $1 AND deleted_at IS NULL`, listID)
	if err != nil {
		return err
	}
	var existing []int64
	for rows.Next() {
		var id int64
		if rows.Scan(&id) == nil && !keep[id] {
			existing = append(existing, id)
		}
	}
	rows.Close()
	for _, id := range existing {
		if _, err := tx.ExecContext(ctx, `
UPDATE product_list_car SET deleted_at = NOW(), updated_at = NOW(), updated_by = $2 WHERE id = $1`, id, nullActor(actorID)); err != nil {
			return err
		}
	}
	for _, c := range cars {
		gear := c.GearType
		if c.ID != nil && *c.ID > 0 {
			_, err := tx.ExecContext(ctx, `
UPDATE product_list_car SET product_attribute_brand_id = $2, product_attribute_model_id = $3,
  product_attribute_engine_id = $4, gear_type = $5::product_list_car_gear_type, year_start = $6, year_end = $7,
  updated_at = NOW(), updated_by = $8
WHERE id = $1 AND product_list_id = $9 AND deleted_at IS NULL`,
				*c.ID, c.BrandID, c.ModelID, c.EngineID, gear, c.YearStart, c.YearEnd, nullActor(actorID), listID)
			if err != nil {
				return err
			}
			continue
		}
		if c.EngineID <= 0 {
			return ErrValidation
		}
		_, err := tx.ExecContext(ctx, `
INSERT INTO product_list_car (product_list_id, product_attribute_brand_id, product_attribute_model_id,
  product_attribute_engine_id, gear_type, year_start, year_end, created_by, updated_by)
VALUES ($1, $2, $3, $4, $5::product_list_car_gear_type, $6, $7, $8, $8)`,
			listID, c.BrandID, c.ModelID, c.EngineID, gear, c.YearStart, c.YearEnd, nullActor(actorID))
		if err != nil {
			return err
		}
	}
	return nil
}

func syncListItems(ctx context.Context, tx *sql.Tx, listID int64, items []listItemBody, actorID int64, snap SettingVatSnapshot) error {
	keep := map[int64]bool{}
	for _, it := range items {
		if it.ID != nil && *it.ID > 0 {
			keep[*it.ID] = true
		}
	}
	rows, err := tx.QueryContext(ctx, `SELECT id FROM product_item WHERE product_list_id = $1 AND deleted_at IS NULL`, listID)
	if err != nil {
		return err
	}
	for rows.Next() {
		var id int64
		if rows.Scan(&id) == nil && !keep[id] {
			if _, err := tx.ExecContext(ctx, `
UPDATE product_item SET deleted_at = NOW(), updated_at = NOW(), updated_by = $2 WHERE id = $1`, id, nullActor(actorID)); err != nil {
				rows.Close()
				return err
			}
		}
	}
	rows.Close()

	for _, it := range items {
		tp := it.TypePrice
		if tp != "stock" {
			tp = "manual"
		}
		unit := it.Unit
		if unit == "" {
			unit = "piece"
		}
		if it.ID != nil && *it.ID > 0 {
			if err := upsertOneItem(ctx, tx, listID, *it.ID, it, actorID, snap); err != nil {
				return err
			}
			continue
		}
		if err := validateOldProductItemRef(ctx, tx, listID, it.OldProductItemID); err != nil {
			return err
		}
		norm := it
		normalizeStorefrontPrices(snap, &norm)
		var itemID int64
		err := tx.QueryRowContext(ctx, `
INSERT INTO product_item (product_list_id, sku, barcode, qrcode, price, price_wholesale, price_vat, price_wholesale_vat,
  amount_price_wholesale, vat_type, vat_rate, promotion, type_price, unit, qty_per_unit, weight, width, length, height, minimum_stock,
  old_product_item_id, is_new, is_stopped, is_authentic, is_active, created_by, updated_by)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::setting_vat_type, $11, $12, $13::product_item_type_price, $14::product_unit,
  $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $26)
RETURNING id`,
			listID, strOrNull(norm.SKU), strOrNull(norm.Barcode), strOrNull(norm.Qrcode),
			norm.Price, norm.PriceWholesale, norm.PriceVat, norm.PriceWholesaleVat, norm.AmountPriceWholesale,
			norm.VatType, norm.VatRate,
			strings.TrimSpace(norm.Promotion), tp, unit, norm.QtyPerUnit,
			norm.Weight, norm.Width, norm.Length, norm.Height, norm.MinimumStock, int64OrNull(norm.OldProductItemID),
			norm.IsNew, norm.IsStopped, norm.IsAuthentic, norm.IsActive, nullActor(actorID)).Scan(&itemID)
		if err != nil {
			return err
		}
		if err := upsertItemLang(ctx, tx, itemID, it.Names); err != nil {
			return err
		}
		if err := syncItemExtras(ctx, tx, itemID, it, actorID, snap); err != nil {
			return err
		}
	}
	return nil
}

func upsertOneItem(ctx context.Context, tx *sql.Tx, listID, itemID int64, it listItemBody, actorID int64, snap SettingVatSnapshot) error {
	tp := it.TypePrice
	if tp != "stock" {
		tp = "manual"
	}
	unit := it.Unit
	if unit == "" {
		unit = "piece"
	}
	norm := it
	normalizeStorefrontPrices(snap, &norm)
	res, err := tx.ExecContext(ctx, `
UPDATE product_item SET sku = $2, barcode = $3, qrcode = $4, price = $5, price_wholesale = $6, price_vat = $7,
  price_wholesale_vat = $8, amount_price_wholesale = $9, vat_type = $10::setting_vat_type, vat_rate = $11, promotion = $12,
  type_price = $13::product_item_type_price, unit = $14::product_unit, qty_per_unit = $15,
  weight = $16, width = $17, length = $18, height = $19, minimum_stock = $20, is_new = $21, is_stopped = $22,
  is_authentic = $23, is_active = $24, updated_at = NOW(), updated_by = $25
WHERE id = $1 AND product_list_id = $26 AND deleted_at IS NULL`,
		itemID, strOrNull(norm.SKU), strOrNull(norm.Barcode), strOrNull(norm.Qrcode),
		norm.Price, norm.PriceWholesale, norm.PriceVat, norm.PriceWholesaleVat, norm.AmountPriceWholesale,
		norm.VatType, norm.VatRate,
		strings.TrimSpace(norm.Promotion), tp, unit, norm.QtyPerUnit,
		norm.Weight, norm.Width, norm.Length, norm.Height, norm.MinimumStock, norm.IsNew, norm.IsStopped,
		norm.IsAuthentic, norm.IsActive, nullActor(actorID), listID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	if err := upsertItemLang(ctx, tx, itemID, it.Names); err != nil {
		return err
	}
	return syncItemExtras(ctx, tx, itemID, it, actorID, snap)
}

func upsertItemLang(ctx context.Context, tx *sql.Tx, itemID int64, names itemLangNames) error {
	for _, loc := range []struct {
		locale, name string
	}{
		{"th", names.Th},
		{"en", names.En},
	} {
		name := strings.TrimSpace(loc.name)
		if name == "" {
			continue
		}
		if _, err := tx.ExecContext(ctx, `
INSERT INTO product_item_language (product_item_id, locale, name)
VALUES ($1, $2, $3)
ON CONFLICT (product_item_id, locale) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()`,
			itemID, loc.locale, name); err != nil {
			return err
		}
	}
	return nil
}

func syncItemExtras(ctx context.Context, tx *sql.Tx, itemID int64, it listItemBody, actorID int64, snap SettingVatSnapshot) error {
	if _, err := tx.ExecContext(ctx, `DELETE FROM product_item_price WHERE product_item_id = $1`, itemID); err != nil {
		return err
	}
	for _, p := range it.ChannelPrices {
		if p.SettingSaleChannelID <= 0 {
			continue
		}
		norm := p
		normalizeChannelPrice(snap, &norm)
		if _, err := tx.ExecContext(ctx, `
INSERT INTO product_item_price (product_item_id, setting_sale_channel_id, price, price_vat, vat_type, vat_rate)
VALUES ($1, $2, $3, $4, $5::setting_vat_type, $6)`, itemID, norm.SettingSaleChannelID, norm.Price, norm.PriceVat, norm.VatType, norm.VatRate); err != nil {
			return err
		}
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM product_item_supplier WHERE product_item_id = $1`, itemID); err != nil {
		return err
	}
	for _, s := range it.Suppliers {
		if s.SupplierUserID <= 0 {
			continue
		}
		dt := s.DiscountType
		if dt != "percent" {
			dt = "baht"
		}
		if _, err := tx.ExecContext(ctx, `
INSERT INTO product_item_supplier (product_item_id, supplier_user_id, cost_price, discount, discount_type, created_by, updated_by)
VALUES ($1, $2, $3, $4, $5::discount_unit, $6, $6)`,
			itemID, s.SupplierUserID, s.CostPrice, s.Discount, dt, nullActor(actorID)); err != nil {
			return err
		}
	}
	keepBins := map[int64]bool{}
	for _, w := range it.Warehouses {
		if w.BinID <= 0 {
			continue
		}
		if w.ID != nil {
			keepBins[*w.ID] = true
		}
	}
	rows, err := tx.QueryContext(ctx, `
SELECT id, bin_id FROM product_item_warehouse WHERE product_item_id = $1 AND deleted_at IS NULL`, itemID)
	if err != nil {
		return err
	}
	for rows.Next() {
		var id, binID int64
		if rows.Scan(&id, &binID) != nil {
			continue
		}
		still := false
		for _, w := range it.Warehouses {
			if w.ID != nil && *w.ID == id {
				still = true
				break
			}
		}
		if !still {
			if _, err := tx.ExecContext(ctx, `
UPDATE product_item_warehouse SET deleted_at = NOW(), updated_at = NOW(), updated_by = $2 WHERE id = $1`, id, nullActor(actorID)); err != nil {
				rows.Close()
				return err
			}
		}
	}
	rows.Close()
	for _, w := range it.Warehouses {
		if w.BinID <= 0 {
			continue
		}
		if w.ID != nil && *w.ID > 0 {
			var oldBinID int64
			err := tx.QueryRowContext(ctx, `
SELECT bin_id FROM product_item_warehouse WHERE id = $1 AND product_item_id = $2 AND deleted_at IS NULL`,
				*w.ID, itemID).Scan(&oldBinID)
			if err == sql.ErrNoRows {
				continue
			}
			if err != nil {
				return err
			}
			if oldBinID != w.BinID {
				if err := assertBinAvailable(ctx, tx, w.BinID, itemID); err != nil {
					return err
				}
			}
			if _, err := tx.ExecContext(ctx, `
UPDATE product_item_warehouse SET bin_id = $2, updated_at = NOW(), updated_by = $3
WHERE id = $1 AND product_item_id = $4 AND deleted_at IS NULL`, *w.ID, w.BinID, nullActor(actorID), itemID); err != nil {
				return err
			}
			continue
		}
		if err := assertBinAvailable(ctx, tx, w.BinID, itemID); err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, `
INSERT INTO product_item_warehouse (product_item_id, bin_id, created_by, updated_by)
VALUES ($1, $2, $3, $3)`, itemID, w.BinID, nullActor(actorID)); err != nil {
			return err
		}
	}
	return syncItemFiles(ctx, tx, itemID, it.Files, actorID)
}

func syncItemFiles(ctx context.Context, tx *sql.Tx, itemID int64, files []itemFileBody, actorID int64) error {
	keep := map[int64]bool{}
	for _, f := range files {
		if f.ID != nil && *f.ID > 0 {
			keep[*f.ID] = true
		}
	}
	rows, err := tx.QueryContext(ctx, `
SELECT id FROM product_item_file WHERE product_item_id = $1 AND deleted_at IS NULL`, itemID)
	if err != nil {
		return err
	}
	for rows.Next() {
		var id int64
		if rows.Scan(&id) == nil && !keep[id] {
			if _, err := tx.ExecContext(ctx, `
UPDATE product_item_file SET deleted_at = NOW(), updated_at = NOW(), updated_by = $2 WHERE id = $1`, id, nullActor(actorID)); err != nil {
				rows.Close()
				return err
			}
		}
	}
	rows.Close()
	for _, f := range files {
		if f.SystemFileID <= 0 {
			continue
		}
		sortOrder := f.SortOrder
		if f.ID != nil && *f.ID > 0 {
			if _, err := tx.ExecContext(ctx, `
UPDATE product_item_file SET system_file_id = $2, sort_order = $3, updated_at = NOW(), updated_by = $4
WHERE id = $1 AND product_item_id = $5 AND deleted_at IS NULL`,
				*f.ID, f.SystemFileID, sortOrder, nullActor(actorID), itemID); err != nil {
				return err
			}
			continue
		}
		var existingID int64
		err := tx.QueryRowContext(ctx, `
SELECT id FROM product_item_file
WHERE product_item_id = $1 AND system_file_id = $2 AND deleted_at IS NULL`, itemID, f.SystemFileID).Scan(&existingID)
		if err == sql.ErrNoRows {
			if _, err := tx.ExecContext(ctx, `
INSERT INTO product_item_file (product_item_id, system_file_id, sort_order, created_by, updated_by)
VALUES ($1, $2, $3, $4, $4)`, itemID, f.SystemFileID, sortOrder, nullActor(actorID)); err != nil {
				return err
			}
			continue
		}
		if err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, `
UPDATE product_item_file SET sort_order = $2, updated_at = NOW(), updated_by = $3
WHERE id = $1`, existingID, sortOrder, nullActor(actorID)); err != nil {
			return err
		}
	}
	return nil
}

func assertBinAvailable(ctx context.Context, tx *sql.Tx, binID, excludeItemID int64) error {
	var otherItem int64
	err := tx.QueryRowContext(ctx, `
SELECT product_item_id FROM product_item_warehouse
WHERE bin_id = $1 AND deleted_at IS NULL AND product_item_id <> $2 LIMIT 1`, binID, excludeItemID).Scan(&otherItem)
	if err == sql.ErrNoRows {
		return nil
	}
	if err != nil {
		return err
	}
	return ErrBinInUse
}

func (r *ListRepository) PatchItemFull(ctx context.Context, itemID int64, it listItemBody, actorID int64) error {
	snap, err := r.activeVatSnapshot(ctx)
	if err != nil {
		return err
	}
	var listID int64
	if err := r.db.QueryRowContext(ctx, `
SELECT product_list_id FROM product_item WHERE id = $1 AND deleted_at IS NULL`, itemID).Scan(&listID); err != nil {
		if err == sql.ErrNoRows {
			return ErrNotFound
		}
		return err
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if err := upsertOneItem(ctx, tx, listID, itemID, it, actorID, snap); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *ListRepository) SoftDeleteList(ctx context.Context, id int64, actorID int64) error {
	res, err := r.db.ExecContext(ctx, `
UPDATE product_list SET deleted_at = NOW(), updated_at = NOW(), updated_by = $2 WHERE id = $1 AND deleted_at IS NULL`, id, nullActor(actorID))
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}
