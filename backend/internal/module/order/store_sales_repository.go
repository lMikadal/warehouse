package order

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"regexp"
	"strings"
	"time"

	"github.com/lMikadal/warehouse/backend/internal/module/member"
	"github.com/lMikadal/warehouse/backend/internal/module/system"
)

var skuFamilyRe = regexp.MustCompile(`^(PJB-[0-9]{6}-[0-9]+)(?:-[0-9]+)?$`)

type StoreSalesRepository struct {
	db   *sql.DB
	code *system.CodePrefixRepository
}

func NewStoreSalesRepository(db *sql.DB) *StoreSalesRepository {
	return &StoreSalesRepository{db: db, code: system.NewCodePrefixRepository(db)}
}

func skuFamilyBase(sku string) string {
	if m := skuFamilyRe.FindStringSubmatch(sku); len(m) >= 2 {
		return m[1]
	}
	return sku
}

func formatLinkedSKU(base string, n int) string {
	return fmt.Sprintf("%s-%02d", base, n)
}

func shouldAllocateSKU(status string) bool {
	return status == "pending" || status == "success"
}

func shouldAllocateOnCreate(status string, parentID *int64) bool {
	return shouldAllocateSKU(status) || (parentID != nil && *parentID > 0)
}

func lineTotal(amount, price, discount float64) float64 {
	return math.Max(0, amount*price-discount)
}

type vatSnapshot struct {
	VatType string
	VatRate float64
}

func activeSettingVatTx(ctx context.Context, tx *sql.Tx) (vatSnapshot, error) {
	snap := vatSnapshot{VatType: "exclude", VatRate: 0}
	err := tx.QueryRowContext(ctx, `
SELECT vat_type::text, rate::float8 FROM setting_vat
WHERE deleted_at IS NULL AND is_active = TRUE
ORDER BY id LIMIT 1`).Scan(&snap.VatType, &snap.VatRate)
	if errors.Is(err, sql.ErrNoRows) {
		return snap, nil
	}
	return snap, err
}

func lineVatTx(ctx context.Context, tx *sql.Tx, productItemID *int64, fallback vatSnapshot) (vatSnapshot, error) {
	if productItemID == nil || *productItemID <= 0 {
		return fallback, nil
	}
	var snap vatSnapshot
	err := tx.QueryRowContext(ctx, `
SELECT vat_type::text, vat_rate::float8 FROM product_item
WHERE id = $1 AND deleted_at IS NULL`, *productItemID).Scan(&snap.VatType, &snap.VatRate)
	if errors.Is(err, sql.ErrNoRows) {
		return fallback, nil
	}
	return snap, err
}

const orderListItemLineTotalExpr = `GREATEST(0, i.amount * i.price_per_unit - i.discount)`

const orderListItemFamilyScope = `
   INNER JOIN order_list b ON b.id = i.order_list_id
   WHERE b.deleted_at IS NULL AND i.deleted_at IS NULL AND (b.id = d.id OR b.parent_id = d.id)`

const storeSalesListFrom = `
FROM order_list d
LEFT JOIN admin_user au ON au.id = d.created_by
`

func storeSalesListWhere(q StoreSalesListQuery) (string, []any) {
	where := "d.deleted_at IS NULL AND d.parent_id IS NULL"
	args := []any{}
	if q.Search != "" {
		args = append(args, "%"+q.Search+"%")
		n := len(args)
		where += fmt.Sprintf(" AND (d.sku ILIKE $%d OR d.member_name ILIKE $%d)", n, n)
	}
	if q.Status != "" {
		args = append(args, q.Status)
		n := len(args)
		where += fmt.Sprintf(` AND (
			d.status = $%d::order_list_status
			OR EXISTS (
				SELECT 1 FROM order_list c
				WHERE c.parent_id = d.id AND c.deleted_at IS NULL
				  AND c.status = $%d::order_list_status
			)
		)`, n, n)
	}
	if q.DateFrom != "" {
		args = append(args, q.DateFrom)
		where += fmt.Sprintf(" AND d.ordered_at >= $%d::timestamptz", len(args))
	}
	if q.DateTo != "" {
		args = append(args, q.DateTo)
		where += fmt.Sprintf(" AND d.ordered_at <= $%d::timestamptz", len(args))
	}
	if q.CreatedBy != nil {
		args = append(args, *q.CreatedBy)
		where += fmt.Sprintf(" AND d.created_by = $%d", len(args))
	}
	return where, args
}

func (r *StoreSalesRepository) List(ctx context.Context, q StoreSalesListQuery) (StoreSalesListResponse, error) {
	where, args := storeSalesListWhere(q)
	var total int
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) "+storeSalesListFrom+" WHERE "+where, args...).Scan(&total); err != nil {
		return StoreSalesListResponse{}, err
	}
	offset := (q.Page - 1) * q.Limit
	args = append(args, q.Limit, offset)
	query := fmt.Sprintf(`
SELECT d.id, d.sku, d.status::text, d.ordered_at, d.parent_id, d.member_name,
  (SELECT COALESCE(SUM(i.amount), 0) FROM order_list_item i` + orderListItemFamilyScope + `) AS item_count,
  (SELECT COALESCE(SUM(COALESCE(NULLIF(i.total_price, 0), ` + orderListItemLineTotalExpr + `)), 0) FROM order_list_item i` + orderListItemFamilyScope + `) AS total_price,
  (SELECT COUNT(*) FROM order_list c WHERE c.parent_id = d.id AND c.deleted_at IS NULL) AS child_count,
  d.created_at, au.username
%s WHERE %s ORDER BY d.created_at DESC, d.id DESC LIMIT $%d OFFSET $%d`,
		storeSalesListFrom, where, len(args)-1, len(args))
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return StoreSalesListResponse{}, err
	}
	defer rows.Close()
	items := []StoreSalesListItem{}
	for rows.Next() {
		var it StoreSalesListItem
		var sku sql.NullString
		var orderedAt sql.NullTime
		var parentID sql.NullInt64
		var memberName, createdByName sql.NullString
		if err := rows.Scan(&it.ID, &sku, &it.Status, &orderedAt, &parentID, &memberName,
			&it.ItemCount, &it.TotalPrice, &it.ChildCount, &it.CreatedAt, &createdByName); err != nil {
			return StoreSalesListResponse{}, err
		}
		if sku.Valid {
			it.SKU = sku.String
		}
		if orderedAt.Valid {
			it.OrderedAt = &orderedAt.Time
		}
		if parentID.Valid {
			it.ParentID = &parentID.Int64
		}
		if memberName.Valid {
			s := memberName.String
			it.MemberName = &s
		}
		if createdByName.Valid {
			s := createdByName.String
			it.CreatedByName = &s
		}
		items = append(items, it)
	}
	return StoreSalesListResponse{Items: items, Total: total, Page: q.Page, Limit: q.Limit}, rows.Err()
}

func (r *StoreSalesRepository) Count(ctx context.Context, q StoreSalesListQuery) (StoreSalesCountResponse, error) {
	q.Status = ""
	where, args := storeSalesListWhere(q)
	rows, err := r.db.QueryContext(ctx, `
SELECT d.status::text, COUNT(*)
`+storeSalesListFrom+`
WHERE `+where+`
GROUP BY d.status`, args...)
	if err != nil {
		return StoreSalesCountResponse{}, err
	}
	defer rows.Close()
	resp := StoreSalesCountResponse{ByStatus: map[string]int64{}}
	for rows.Next() {
		var st string
		var n int64
		if err := rows.Scan(&st, &n); err != nil {
			return StoreSalesCountResponse{}, err
		}
		resp.ByStatus[st] = n
		resp.Count += n
	}
	return resp, rows.Err()
}

func (r *StoreSalesRepository) IsActiveAdminUser(ctx context.Context, id int64) (bool, error) {
	var ok bool
	err := r.db.QueryRowContext(ctx, `
SELECT EXISTS (
  SELECT 1 FROM admin_user
  WHERE id = $1 AND deleted_at IS NULL AND status = 'active'
)`, id).Scan(&ok)
	return ok, err
}

func (r *StoreSalesRepository) SellerFilters(ctx context.Context, page, limit int, search string, id int64) (StoreSalesFiltersResponse, error) {
	var out StoreSalesFiltersResponse
	if limit <= 0 {
		limit = 10
	}
	out.Meta.Limit = limit
	if id > 0 {
		var name string
		err := r.db.QueryRowContext(ctx, `
SELECT username FROM admin_user
WHERE id = $1 AND deleted_at IS NULL AND status = 'active'`, id).Scan(&name)
		if errors.Is(err, sql.ErrNoRows) {
			out.Items = []StoreSalesFilterItem{}
			out.Meta.Total = 0
			out.Meta.Page = 1
			return out, nil
		}
		if err != nil {
			return out, err
		}
		out.Items = []StoreSalesFilterItem{{ID: id, Name: name}}
		out.Meta.Total = 1
		out.Meta.Page = 1
		return out, nil
	}
	if page <= 0 {
		page = 1
	}
	out.Meta.Page = page
	offset := (page - 1) * limit
	base := `FROM admin_user WHERE deleted_at IS NULL AND status = 'active'`
	args := []any{}
	clause := ""
	if q := strings.TrimSpace(search); q != "" {
		args = append(args, "%"+strings.ToLower(q)+"%")
		n := len(args)
		clause = fmt.Sprintf(" AND (LOWER(username) LIKE $%d OR LOWER(COALESCE(email, '')) LIKE $%d)", n, n)
	}
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) `+base+clause, args...).Scan(&out.Meta.Total); err != nil {
		return out, err
	}
	args = append(args, limit, offset)
	li := len(args) - 1
	oi := len(args)
	rows, err := r.db.QueryContext(ctx, fmt.Sprintf(`
SELECT id, username %s%s ORDER BY username ASC, id ASC LIMIT $%d OFFSET $%d`, base, clause, li, oi), args...)
	if err != nil {
		return out, err
	}
	defer rows.Close()
	out.Items = []StoreSalesFilterItem{}
	for rows.Next() {
		var row StoreSalesFilterItem
		if err := rows.Scan(&row.ID, &row.Name); err != nil {
			return out, err
		}
		out.Items = append(out.Items, row)
	}
	return out, rows.Err()
}

func (r *StoreSalesRepository) GetByID(ctx context.Context, id int64) (StoreSalesDetail, error) {
	var d StoreSalesDetail
	var sku sql.NullString
	var orderedAt sql.NullTime
	var parentID, memberUserID, creditID sql.NullInt64
	var memberName, memberTel, memberEmail sql.NullString
	err := r.db.QueryRowContext(ctx, `
SELECT id, sku, status::text, fulfill_status::text, ordered_at, parent_id,
       member_user_id, member_setting_credit_id, member_name, member_tel, member_email,
       vat_type::text, vat_rate::float8,
       created_at, updated_at
FROM order_list WHERE id = $1 AND deleted_at IS NULL`, id).Scan(
		&d.ID, &sku, &d.Status, &d.FulfillStatus, &orderedAt, &parentID,
		&memberUserID, &creditID, &memberName, &memberTel, &memberEmail,
		&d.VatType, &d.VatRate,
		&d.CreatedAt, &d.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return d, ErrNotFound
	}
	if err != nil {
		return d, err
	}
	if sku.Valid {
		d.SKU = sku.String
	}
	if orderedAt.Valid {
		d.OrderedAt = &orderedAt.Time
	}
	if parentID.Valid {
		d.ParentID = &parentID.Int64
	}
	if memberUserID.Valid {
		d.MemberUserID = &memberUserID.Int64
	}
	if creditID.Valid {
		d.MemberSettingCreditID = &creditID.Int64
	}
	if memberName.Valid {
		s := memberName.String
		d.MemberName = &s
	}
	if memberTel.Valid {
		s := memberTel.String
		d.MemberTel = &s
	}
	if memberEmail.Valid {
		s := memberEmail.String
		d.MemberEmail = &s
	}
	sh, err := r.loadShipping(ctx, id)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return d, err
	}
	d.Shipping = sh
	items, err := r.loadItems(ctx, id)
	if err != nil {
		return d, err
	}
	d.Items = items
	rootID := id
	if d.ParentID != nil {
		rootID = *d.ParentID
	}
	family, err := r.loadFamily(ctx, rootID)
	if err != nil {
		return d, err
	}
	d.Family = family
	return d, nil
}

func (r *StoreSalesRepository) loadShipping(ctx context.Context, orderID int64) (*StoreSalesShippingDetail, error) {
	var sh StoreSalesShippingDetail
	var receivedAt sql.NullTime
	err := r.db.QueryRowContext(ctx, `
SELECT type::text, received_at FROM order_list_shipping WHERE order_list_id = $1`, orderID).Scan(&sh.Type, &receivedAt)
	if err != nil {
		return nil, err
	}
	if receivedAt.Valid {
		sh.ReceivedAt = &receivedAt.Time
	}
	return &sh, nil
}

func (r *StoreSalesRepository) loadItems(ctx context.Context, orderID int64) ([]StoreSalesItemDetail, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT id, product_item_id, type::text, amount, price_per_unit, discount,
       vat_type::text, vat_rate::float8, total_price, detail::text
FROM order_list_item
WHERE order_list_id = $1 AND deleted_at IS NULL
ORDER BY id`, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []StoreSalesItemDetail{}
	for rows.Next() {
		var it StoreSalesItemDetail
		var productID sql.NullInt64
		var detail sql.NullString
		if err := rows.Scan(&it.ID, &productID, &it.Type, &it.Amount, &it.PricePerUnit, &it.Discount, &it.VatType, &it.VatRate, &it.TotalPrice, &detail); err != nil {
			return nil, err
		}
		if productID.Valid {
			it.ProductItemID = &productID.Int64
		}
		if detail.Valid && detail.String != "" && detail.String != "null" {
			s := compareDetailFromJSON(detail.String)
			if s != "" {
				it.Detail = &s
			}
		}
		out = append(out, it)
	}
	return out, rows.Err()
}

func (r *StoreSalesRepository) loadFamily(ctx context.Context, rootID int64) ([]StoreSalesListItem, error) {
	lineTotalSub := fmt.Sprintf(
		`COALESCE(SUM(COALESCE(NULLIF(i.total_price, 0), %s)), 0)`, orderListItemLineTotalExpr,
	)
	query := fmt.Sprintf(`
SELECT d.id, d.sku, d.status::text, d.ordered_at, d.parent_id, d.member_name,
  (SELECT COALESCE(SUM(i.amount), 0) FROM order_list_item i WHERE i.order_list_id = d.id AND i.deleted_at IS NULL),
  (SELECT %s FROM order_list_item i WHERE i.order_list_id = d.id AND i.deleted_at IS NULL),
  0, d.created_at, NULL
FROM order_list d
WHERE d.deleted_at IS NULL AND (d.id = $1 OR d.parent_id = $1)
ORDER BY d.created_at ASC, d.id ASC`, lineTotalSub)
	rows, err := r.db.QueryContext(ctx, query, rootID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []StoreSalesListItem{}
	for rows.Next() {
		var it StoreSalesListItem
		var sku sql.NullString
		var orderedAt sql.NullTime
		var parentID sql.NullInt64
		var memberName sql.NullString
		if err := rows.Scan(&it.ID, &sku, &it.Status, &orderedAt, &parentID, &memberName,
			&it.ItemCount, &it.TotalPrice, &it.ChildCount, &it.CreatedAt, new(sql.NullString)); err != nil {
			return nil, err
		}
		if sku.Valid {
			it.SKU = sku.String
		}
		if orderedAt.Valid {
			it.OrderedAt = &orderedAt.Time
		}
		if parentID.Valid {
			it.ParentID = &parentID.Int64
		}
		if memberName.Valid {
			s := memberName.String
			it.MemberName = &s
		}
		out = append(out, it)
	}
	return out, rows.Err()
}

func (r *StoreSalesRepository) nextSKUTx(ctx context.Context, tx *sql.Tx, parentID *int64) (string, error) {
	if parentID != nil && *parentID > 0 {
		var parentSKU sql.NullString
		if err := tx.QueryRowContext(ctx, `
SELECT sku FROM order_list WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`, *parentID).Scan(&parentSKU); err != nil {
			return "", err
		}
		if !parentSKU.Valid || parentSKU.String == "" {
			return "", ErrValidation
		}
		base := skuFamilyBase(parentSKU.String)
		var next int
		if err := tx.QueryRowContext(ctx, `
SELECT COALESCE(MAX(CASE WHEN sku LIKE $1 || '-%' THEN substring(sku FROM '([0-9]+)$')::int ELSE 0 END), 0) + 1
FROM order_list
WHERE deleted_at IS NULL AND sku IS NOT NULL AND (sku = $1 OR sku LIKE $1 || '-%')`, base).Scan(&next); err != nil {
			return "", err
		}
		return formatLinkedSKU(base, next), nil
	}
	base, err := r.code.NextCode(ctx, tx, "order_list", time.Now())
	if err != nil {
		return "", err
	}
	return base + "-01", nil
}

func (r *StoreSalesRepository) Create(ctx context.Context, in StoreSalesCreateInput, actorID int64) (int64, error) {
	if in.Status == "" {
		in.Status = "draft"
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback() //nolint:errcheck

	var sku any
	if shouldAllocateOnCreate(in.Status, in.ParentID) {
		n, err := r.nextSKUTx(ctx, tx, in.ParentID)
		if err != nil {
			return 0, err
		}
		sku = n
	}
	var orderedAt any
	if in.Status == "pending" || in.Status == "success" {
		orderedAt = time.Now()
	}
	headerVat, err := activeSettingVatTx(ctx, tx)
	if err != nil {
		return 0, err
	}
	var id int64
	err = tx.QueryRowContext(ctx, `
INSERT INTO order_list (
  sku, status, parent_id, member_user_id, member_setting_credit_id,
  member_name, member_tel, member_email, vat_type, vat_rate, ordered_at, created_by, updated_by
) VALUES (
  $1, $2::order_list_status, $3, $4, $5, $6, $7, $8, $9::setting_vat_type, $10, $11, $12, $12
) RETURNING id`,
		sku, in.Status, in.ParentID, in.MemberUserID, in.MemberSettingCreditID,
		in.MemberName, in.MemberTel, in.MemberEmail, headerVat.VatType, headerVat.VatRate,
		orderedAt, actorID,
	).Scan(&id)
	if err != nil {
		return 0, err
	}
	if err := r.replaceItemsTx(ctx, tx, id, in.Items, actorID, headerVat); err != nil {
		return 0, err
	}
	if in.Shipping != nil {
		if err := r.upsertShippingTx(ctx, tx, id, in.Shipping); err != nil {
			return 0, err
		}
	}
	if in.Status == "pending" {
		if err := insertStoreSalesPickingHistoryTx(ctx, tx, id, in.MemberUserID, actorID); err != nil {
			return 0, err
		}
	}
	return id, tx.Commit()
}

func (r *StoreSalesRepository) Update(ctx context.Context, id int64, in StoreSalesUpdateInput, actorID int64) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck

	var curStatus string
	if err := tx.QueryRowContext(ctx, `
SELECT status::text FROM order_list WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`, id).Scan(&curStatus); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	if curStatus != "draft" && curStatus != "pending" {
		return ErrValidation
	}
	status := in.Status
	if status == "" {
		status = curStatus
	}
	if shouldAllocateSKU(status) {
		var curSKU sql.NullString
		_ = tx.QueryRowContext(ctx, `SELECT sku FROM order_list WHERE id = $1`, id).Scan(&curSKU)
		if !curSKU.Valid || curSKU.String == "" {
			n, err := r.nextSKUTx(ctx, tx, in.ParentID)
			if err != nil {
				return err
			}
			if _, err := tx.ExecContext(ctx, `UPDATE order_list SET sku = $2 WHERE id = $1`, id, n); err != nil {
				return err
			}
		}
	}
	var orderedAt any
	if status == "pending" || status == "success" {
		orderedAt = time.Now()
	}
	headerVat, err := activeSettingVatTx(ctx, tx)
	if err != nil {
		return err
	}
	res, err := tx.ExecContext(ctx, `
UPDATE order_list SET
  status = $2::order_list_status,
  parent_id = $3,
  member_user_id = $4,
  member_setting_credit_id = $5,
  member_name = $6,
  member_tel = $7,
  member_email = $8,
  vat_type = $9::setting_vat_type,
  vat_rate = $10,
  ordered_at = COALESCE($11, ordered_at),
  updated_by = $12,
  updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL`,
		id, status, in.ParentID, in.MemberUserID, in.MemberSettingCreditID,
		in.MemberName, in.MemberTel, in.MemberEmail, headerVat.VatType, headerVat.VatRate,
		orderedAt, actorID,
	)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	if err := r.replaceItemsTx(ctx, tx, id, in.Items, actorID, headerVat); err != nil {
		return err
	}
	if in.Shipping != nil {
		if err := r.upsertShippingTx(ctx, tx, id, in.Shipping); err != nil {
			return err
		}
	}
	if curStatus == "draft" && status == "pending" {
		if err := insertStoreSalesPickingHistoryTx(ctx, tx, id, in.MemberUserID, actorID); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func insertStoreSalesPickingHistoryTx(ctx context.Context, tx *sql.Tx, orderID int64, memberUserID *int64, actorID int64) error {
	if memberUserID == nil || *memberUserID <= 0 {
		return nil
	}
	var sku sql.NullString
	if err := tx.QueryRowContext(ctx, `SELECT sku FROM order_list WHERE id = $1`, orderID).Scan(&sku); err != nil {
		return err
	}
	skuStr := ""
	if sku.Valid {
		skuStr = sku.String
	}
	titles := member.OrderCreatedHistoryTitles(skuStr)
	empty := map[string]string{"th": "", "en": ""}
	_, err := member.InsertMemberHistoryInTx(ctx, tx, *memberUserID, actorID, titles, empty)
	return err
}

func (r *StoreSalesRepository) PatchStatus(ctx context.Context, id int64, status string, actorID int64) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck

	var curStatus string
	var parentID sql.NullInt64
	if err := tx.QueryRowContext(ctx, `
SELECT status::text, parent_id FROM order_list WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`, id).Scan(&curStatus, &parentID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	switch status {
	case "cancelled", "rejected", "draft", "pending", "success":
	default:
		return ErrValidation
	}
	if shouldAllocateSKU(status) {
		var curSKU sql.NullString
		_ = tx.QueryRowContext(ctx, `SELECT sku FROM order_list WHERE id = $1`, id).Scan(&curSKU)
		if !curSKU.Valid || curSKU.String == "" {
			var pid *int64
			if parentID.Valid {
				pid = &parentID.Int64
			}
			n, err := r.nextSKUTx(ctx, tx, pid)
			if err != nil {
				return err
			}
			if _, err := tx.ExecContext(ctx, `UPDATE order_list SET sku = $2 WHERE id = $1`, id, n); err != nil {
				return err
			}
		}
	}
	var orderedAt any
	if status == "pending" || status == "success" {
		orderedAt = time.Now()
	}
	_, err = tx.ExecContext(ctx, `
UPDATE order_list SET status = $2::order_list_status,
  ordered_at = COALESCE($3, ordered_at),
  updated_by = $4, updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL`, id, status, orderedAt, actorID)
	if err != nil {
		return err
	}
	return tx.Commit()
}

func (r *StoreSalesRepository) SoftDelete(ctx context.Context, id int64, actorID int64) error {
	res, err := r.db.ExecContext(ctx, `
UPDATE order_list SET deleted_at = NOW(), updated_by = $2, updated_at = NOW()
WHERE id = $1 AND deleted_at IS NULL AND status = 'draft'`, id, actorID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *StoreSalesRepository) replaceItemsTx(ctx context.Context, tx *sql.Tx, orderID int64, items []StoreSalesItemInput, actorID int64, headerVat vatSnapshot) error {
	if _, err := tx.ExecContext(ctx, `
UPDATE order_list_item SET deleted_at = NOW(), updated_at = NOW()
WHERE order_list_id = $1 AND deleted_at IS NULL`, orderID); err != nil {
		return err
	}
	for _, it := range items {
		itemType := it.Type
		if itemType == "" {
			itemType = "item"
		}
		lineVat, err := lineVatTx(ctx, tx, it.ProductItemID, headerVat)
		if err != nil {
			return err
		}
		total := lineTotal(it.Amount, it.PricePerUnit, it.Discount)
		if _, err := tx.ExecContext(ctx, `
INSERT INTO order_list_item (
  order_list_id, product_item_id, type, amount, price_per_unit, discount,
  vat_type, vat_rate, total_price, detail, created_by, updated_by
) VALUES ($1, $2, $3::order_list_item_type, $4, $5, $6, $7::setting_vat_type, $8, $9, $10::jsonb, $11, $11)`,
			orderID, it.ProductItemID, itemType, it.Amount, it.PricePerUnit, it.Discount,
			lineVat.VatType, lineVat.VatRate, total,
			detailJSON(it.Detail), actorID,
		); err != nil {
			return err
		}
	}
	return nil
}

func detailJSON(d *string) any {
	if d == nil || strings.TrimSpace(*d) == "" {
		return nil
	}
	b, err := json.Marshal(strings.TrimSpace(*d))
	if err != nil {
		return nil
	}
	return string(b)
}

// compareDetailFromJSON decodes jsonb compare lines stored as a JSON string.
func compareDetailFromJSON(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" || raw == "null" {
		return ""
	}
	var s string
	if err := json.Unmarshal([]byte(raw), &s); err == nil {
		return s
	}
	return raw
}

func (r *StoreSalesRepository) upsertShippingTx(ctx context.Context, tx *sql.Tx, orderID int64, sh *StoreSalesShippingInput) error {
	shType := sh.Type
	if shType == "" {
		shType = "store"
	}
	_, err := tx.ExecContext(ctx, `
INSERT INTO order_list_shipping (order_list_id, type, received_at)
VALUES ($1, $2::order_shipping_type, $3)
ON CONFLICT (order_list_id) DO UPDATE SET type = EXCLUDED.type, received_at = EXCLUDED.received_at`,
		orderID, shType, sh.ReceivedAt)
	return err
}

func (r *StoreSalesRepository) PatchShipping(ctx context.Context, orderID int64, in StoreSalesShippingInput) error {
	var status string
	err := r.db.QueryRowContext(ctx, `
SELECT status::text FROM order_list WHERE id = $1 AND deleted_at IS NULL`, orderID).Scan(&status)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	if status != "draft" && status != "pending" {
		return ErrValidation
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck
	if err := r.upsertShippingTx(ctx, tx, orderID, &in); err != nil {
		return err
	}
	return tx.Commit()
}
