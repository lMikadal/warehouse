package member

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/lMikadal/warehouse/backend/internal/tree"
)

type UserRow struct {
	ID                   int64
	SKU                  *string
	MemberTierID         *int64
	Type                 string
	SettingPrefixID      *int64
	Name                 string
	StoreName            *string
	TaxNumber            *string
	Branch               *string
	BranchName           *string
	Tel                  *string
	Email                *string
	Address              *string
	WebsiteProvinceID    *int64
	WebsiteDistrictID    *int64
	WebsiteSubDistrictID *int64
	Postcode             *string
	SystemFileID         *int64
	Note                 *string
	IsActive             bool
	UpdatedAt            time.Time
	BusinessLabel        string
}

type UserListFilter struct {
	Page, Limit       int
	Search            string
	IsActive          *bool
	MemberTierID      *int64
	BusinessID        *int64
	Sort, Order       string
}

type AddressInput struct {
	Type                 string  `json:"type"`
	MemberType           string  `json:"member_type"`
	SettingPrefixID      *int64  `json:"setting_prefix_id"`
	Name                 *string `json:"name"`
	StoreName            *string `json:"store_name"`
	TaxNumber            *string `json:"tax_number"`
	Branch               *string `json:"branch"`
	BranchName           *string `json:"branch_name"`
	Address              *string `json:"address"`
	WebsiteProvinceID    *int64  `json:"website_province_id"`
	WebsiteDistrictID    *int64  `json:"website_district_id"`
	WebsiteSubDistrictID *int64  `json:"website_sub_district_id"`
	Postcode             *string `json:"postcode"`
	Tel                  *string `json:"tel"`
	Email                *string `json:"email"`
	CreditLimit          *float64 `json:"credit_limit"`
	CreditDate           *int     `json:"credit_date"`
	Relationship         *string  `json:"relationship"`
	IsSameInformation    bool     `json:"is_same_information"`
}

type UserCreateInput struct {
	SKU                  *string
	MemberTierID         *int64
	Type                 string
	SettingPrefixID      *int64
	Name                 string
	StoreName            *string
	TaxNumber            *string
	Branch               *string
	BranchName           *string
	Tel                  *string
	Email                *string
	Address              *string
	WebsiteProvinceID    *int64
	WebsiteDistrictID    *int64
	WebsiteSubDistrictID *int64
	Postcode             *string
	SystemFileID         *int64
	Note                 *string
	IsActive             bool
	SettingRelationIDs   []int64
	OwnerAdminUserIDs    []int64
	Addresses            []AddressInput
	ActorID              int64
}

type UserPatch struct {
	SKU                  *string
	SKUSet               bool
	MemberTierID         optionalInt64
	Type                 *string
	SettingPrefixID      optionalInt64
	Name                 *string
	StoreName            optionalString
	TaxNumber            optionalString
	Branch               optionalString
	BranchName           optionalString
	Tel                  optionalString
	Email                optionalString
	Address              optionalString
	WebsiteProvinceID    optionalInt64
	WebsiteDistrictID    optionalInt64
	WebsiteSubDistrictID optionalInt64
	Postcode             optionalString
	SystemFileID         optionalInt64
	Note                 optionalString
	IsActive             *bool
	SettingRelationIDs   []int64
	SetSettings          bool
	OwnerAdminUserIDs    []int64
	SetOwners            bool
	Addresses            []AddressInput
	SetAddresses         bool
	ActorID              int64
}

type UserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) List(ctx context.Context, f UserListFilter, locale string) ([]UserRow, int64, error) {
	if locale == "" {
		locale = "th"
	}
	w, args := userListWhere(f, locale, 1)
	var total int64
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(DISTINCT u.id) FROM member_user u `+w, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	limit := f.Limit
	if limit <= 0 {
		limit = 10
	}
	page := f.Page
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * limit
	wList, listArgs := userListWhere(f, locale, 1)
	li := len(listArgs) + 1
	oi := li + 1
	q := fmt.Sprintf(`
SELECT DISTINCT u.id, u.sku, u.member_tier_id, u.type::text, u.setting_prefix_id, u.name, u.store_name, u.tax_number,
  u.branch::text, u.branch_name, u.tel, u.email, u.is_active, u.updated_at,
  COALESCE((
    SELECT bl.name FROM member_user_setting mus
    JOIN member_setting_relation msr ON msr.id = mus.member_setting_relation_id AND msr.deleted_at IS NULL
    JOIN member_setting_business_language bl ON bl.member_setting_business_id = msr.business_id AND bl.locale = $1
    WHERE mus.member_user_id = u.id LIMIT 1
  ), '') AS business_label
FROM member_user u %s
ORDER BY %s
LIMIT $%d OFFSET $%d`, wList, userListOrder(f.Sort, f.Order), li, oi)
	listArgs = append(listArgs, limit, offset)
	rows, err := r.db.QueryContext(ctx, q, listArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var out []UserRow
	for rows.Next() {
		var row UserRow
		var branch sql.NullString
		if err := rows.Scan(&row.ID, &row.SKU, &row.MemberTierID, &row.Type, &row.SettingPrefixID, &row.Name, &row.StoreName, &row.TaxNumber,
			&branch, &row.BranchName, &row.Tel, &row.Email, &row.IsActive, &row.UpdatedAt, &row.BusinessLabel); err != nil {
			return nil, 0, err
		}
		if branch.Valid {
			s := branch.String
			row.Branch = &s
		}
		out = append(out, row)
	}
	return out, total, rows.Err()
}

func userListWhere(f UserListFilter, locale string, start int) (string, []any) {
	args := []any{locale}
	clauses := []string{"WHERE u.deleted_at IS NULL"}
	n := start + 1
	if f.IsActive != nil {
		clauses = append(clauses, fmt.Sprintf("u.is_active = $%d", n))
		args = append(args, *f.IsActive)
		n++
	}
	if f.MemberTierID != nil {
		clauses = append(clauses, fmt.Sprintf("u.member_tier_id = $%d", n))
		args = append(args, *f.MemberTierID)
		n++
	}
	if f.BusinessID != nil {
		clauses = append(clauses, fmt.Sprintf(`EXISTS (
  SELECT 1 FROM member_user_setting mus
  JOIN member_setting_relation msr ON msr.id = mus.member_setting_relation_id AND msr.deleted_at IS NULL
  WHERE mus.member_user_id = u.id AND msr.business_id = $%d)`, n))
		args = append(args, *f.BusinessID)
		n++
	}
	if q := strings.TrimSpace(f.Search); q != "" {
		pat := "%" + strings.ToLower(q) + "%"
		clauses = append(clauses, fmt.Sprintf(`(
  LOWER(u.name) LIKE $%d OR LOWER(COALESCE(u.sku, '')) LIKE $%d OR LOWER(COALESCE(u.tel, '')) LIKE $%d OR LOWER(COALESCE(u.email, '')) LIKE $%d
)`, n, n, n, n))
		args = append(args, pat)
	}
	return strings.Join(clauses, " "), args
}

func userListOrder(sort, order string) string {
	col := "u.created_at ASC, u.id ASC"
	switch sort {
	case "name":
		col = "u.name"
	case "sku":
		col = "u.sku"
	case "updated_at":
		col = "u.updated_at"
	case "is_active":
		col = "u.is_active"
	}
	if order == "desc" {
		return col + " DESC, u.id DESC"
	}
	if sort != "" {
		return col + " ASC, u.id ASC"
	}
	return col
}

func (r *UserRepository) GetAggregate(ctx context.Context, id int64, locale string) (*UserRow, []AddressInput, []int64, []int64, []FileRow, []DiscountRow, []HistoryRow, error) {
	var row UserRow
	var branch sql.NullString
	err := r.db.QueryRowContext(ctx, `
SELECT id, sku, member_tier_id, type::text, setting_prefix_id, name, store_name, tax_number, branch::text, branch_name,
  tel, email, address, website_province_id, website_district_id, website_sub_district_id, postcode, system_file_id, note, is_active, updated_at
FROM member_user WHERE id = $1 AND deleted_at IS NULL`, id).Scan(
		&row.ID, &row.SKU, &row.MemberTierID, &row.Type, &row.SettingPrefixID, &row.Name, &row.StoreName, &row.TaxNumber,
		&branch, &row.BranchName, &row.Tel, &row.Email, &row.Address, &row.WebsiteProvinceID, &row.WebsiteDistrictID,
		&row.WebsiteSubDistrictID, &row.Postcode, &row.SystemFileID, &row.Note, &row.IsActive, &row.UpdatedAt)
	if branch.Valid {
		s := branch.String
		row.Branch = &s
	}
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil, nil, nil, nil, nil, nil, nil
	}
	if err != nil {
		return nil, nil, nil, nil, nil, nil, nil, err
	}
	addrs, err := r.loadAddresses(ctx, id)
	if err != nil {
		return nil, nil, nil, nil, nil, nil, nil, err
	}
	settings, err := r.loadSettingIDs(ctx, id)
	if err != nil {
		return nil, nil, nil, nil, nil, nil, nil, err
	}
	owners, err := r.loadOwnerIDs(ctx, id)
	if err != nil {
		return nil, nil, nil, nil, nil, nil, nil, err
	}
	files, err := r.loadFiles(ctx, id)
	if err != nil {
		return nil, nil, nil, nil, nil, nil, nil, err
	}
	discounts, err := r.loadDiscounts(ctx, id)
	if err != nil {
		return nil, nil, nil, nil, nil, nil, nil, err
	}
	histories, err := r.loadHistories(ctx, id, locale)
	if err != nil {
		return nil, nil, nil, nil, nil, nil, nil, err
	}
	return &row, addrs, settings, owners, files, discounts, histories, nil
}

func (r *UserRepository) Create(ctx context.Context, in UserCreateInput) (int64, error) {
	if strings.TrimSpace(in.Name) == "" {
		return 0, ErrValidation
	}
	if in.Type == "" {
		in.Type = "person"
	}
	if in.SKU != nil && strings.TrimSpace(*in.SKU) != "" {
		ok, err := r.skuExists(ctx, strings.TrimSpace(*in.SKU), 0)
		if err != nil {
			return 0, err
		}
		if ok {
			return 0, ErrConflict
		}
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()
	act := nullActor(in.ActorID)
	var id int64
	err = tx.QueryRowContext(ctx, `
INSERT INTO member_user (sku, member_tier_id, type, setting_prefix_id, name, store_name, tax_number, branch, branch_name,
  tel, email, address, website_province_id, website_district_id, website_sub_district_id, postcode, system_file_id, note, is_active, created_by, updated_by)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$20) RETURNING id`,
		in.SKU, in.MemberTierID, in.Type, in.SettingPrefixID, in.Name, in.StoreName, in.TaxNumber, in.Branch, in.BranchName,
		in.Tel, in.Email, in.Address, in.WebsiteProvinceID, in.WebsiteDistrictID, in.WebsiteSubDistrictID, in.Postcode,
		in.SystemFileID, in.Note, in.IsActive, act).Scan(&id)
	if err != nil {
		return 0, err
	}
	if err := r.replaceSettingsTx(ctx, tx, id, in.SettingRelationIDs); err != nil {
		return 0, err
	}
	if err := r.replaceOwnersTx(ctx, tx, id, in.OwnerAdminUserIDs); err != nil {
		return 0, err
	}
	for _, a := range in.Addresses {
		if err := upsertAddressTx(ctx, tx, id, a, act); err != nil {
			return 0, err
		}
	}
	return id, tx.Commit()
}

func (r *UserRepository) Patch(ctx context.Context, id int64, p UserPatch) error {
	ok, err := r.exists(ctx, id)
	if err != nil || !ok {
		return ErrNotFound
	}
	if p.SKUSet && p.SKU != nil && strings.TrimSpace(*p.SKU) != "" {
		taken, err := r.skuExists(ctx, strings.TrimSpace(*p.SKU), id)
		if err != nil {
			return err
		}
		if taken {
			return ErrConflict
		}
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	act := nullActor(p.ActorID)
	sets := []string{"updated_at = NOW()", fmt.Sprintf("updated_by = $%d", 2)}
	args := []any{id, act}
	n := 3
	addSet := func(col string, val any) {
		sets = append(sets, fmt.Sprintf("%s = $%d", col, n))
		args = append(args, val)
		n++
	}
	if p.SKUSet {
		addSet("sku", p.SKU)
	}
	if p.MemberTierID.Set {
		addSet("member_tier_id", p.MemberTierID.Value)
	}
	if p.Type != nil {
		addSet("type", *p.Type)
	}
	if p.SettingPrefixID.Set {
		addSet("setting_prefix_id", p.SettingPrefixID.Value)
	}
	if p.Name != nil {
		addSet("name", *p.Name)
	}
	if p.StoreName.Set {
		addSet("store_name", p.StoreName.Value)
	}
	if p.TaxNumber.Set {
		addSet("tax_number", p.TaxNumber.Value)
	}
	if p.Branch.Set {
		addSet("branch", p.Branch.Value)
	}
	if p.BranchName.Set {
		addSet("branch_name", p.BranchName.Value)
	}
	if p.Tel.Set {
		addSet("tel", p.Tel.Value)
	}
	if p.Email.Set {
		addSet("email", p.Email.Value)
	}
	if p.Address.Set {
		addSet("address", p.Address.Value)
	}
	if p.WebsiteProvinceID.Set {
		addSet("website_province_id", p.WebsiteProvinceID.Value)
	}
	if p.WebsiteDistrictID.Set {
		addSet("website_district_id", p.WebsiteDistrictID.Value)
	}
	if p.WebsiteSubDistrictID.Set {
		addSet("website_sub_district_id", p.WebsiteSubDistrictID.Value)
	}
	if p.Postcode.Set {
		addSet("postcode", p.Postcode.Value)
	}
	if p.SystemFileID.Set {
		addSet("system_file_id", p.SystemFileID.Value)
	}
	if p.Note.Set {
		addSet("note", p.Note.Value)
	}
	if p.IsActive != nil {
		addSet("is_active", *p.IsActive)
	}
	if len(sets) > 2 {
		q := fmt.Sprintf("UPDATE member_user SET %s WHERE id = $1 AND deleted_at IS NULL", strings.Join(sets, ", "))
		if _, err := tx.ExecContext(ctx, q, args...); err != nil {
			return err
		}
	}
	if p.SetSettings {
		if err := r.replaceSettingsTx(ctx, tx, id, p.SettingRelationIDs); err != nil {
			return err
		}
	}
	if p.SetOwners {
		if err := r.replaceOwnersTx(ctx, tx, id, p.OwnerAdminUserIDs); err != nil {
			return err
		}
	}
	if p.SetAddresses {
		for _, a := range p.Addresses {
			if err := upsertAddressTx(ctx, tx, id, a, act); err != nil {
				return err
			}
		}
	}
	return tx.Commit()
}

func (r *UserRepository) SoftDelete(ctx context.Context, id int64, actorID int64) error {
	res, err := r.db.ExecContext(ctx, `
UPDATE member_user SET deleted_at = NOW(), updated_at = NOW(), updated_by = $2 WHERE id = $1 AND deleted_at IS NULL`, id, nullActor(actorID))
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *UserRepository) exists(ctx context.Context, id int64) (bool, error) {
	var n int
	err := r.db.QueryRowContext(ctx, `SELECT 1 FROM member_user WHERE id = $1 AND deleted_at IS NULL`, id).Scan(&n)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	return err == nil, err
}

func (r *UserRepository) skuExists(ctx context.Context, sku string, exclude int64) (bool, error) {
	var id int64
	err := r.db.QueryRowContext(ctx, `
SELECT id FROM member_user WHERE deleted_at IS NULL AND LOWER(sku) = LOWER($1) AND ($2 = 0 OR id <> $2)`, sku, exclude).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	return err == nil, err
}

func (r *UserRepository) replaceSettingsTx(ctx context.Context, tx *sql.Tx, userID int64, relIDs []int64) error {
	if _, err := tx.ExecContext(ctx, `DELETE FROM member_user_setting WHERE member_user_id = $1`, userID); err != nil {
		return err
	}
	for _, relID := range relIDs {
		if relID <= 0 {
			continue
		}
		if _, err := tx.ExecContext(ctx, `
INSERT INTO member_user_setting (member_user_id, member_setting_relation_id) VALUES ($1, $2)`, userID, relID); err != nil {
			return err
		}
	}
	return nil
}

func (r *UserRepository) replaceOwnersTx(ctx context.Context, tx *sql.Tx, userID int64, adminIDs []int64) error {
	if _, err := tx.ExecContext(ctx, `DELETE FROM member_user_owner WHERE member_user_id = $1`, userID); err != nil {
		return err
	}
	for _, aid := range adminIDs {
		if aid <= 0 {
			continue
		}
		if _, err := tx.ExecContext(ctx, `
INSERT INTO member_user_owner (member_user_id, admin_user_id) VALUES ($1, $2)`, userID, aid); err != nil {
			return err
		}
	}
	return nil
}

func upsertAddressTx(ctx context.Context, tx *sql.Tx, userID int64, a AddressInput, act sql.NullInt64) error {
	if a.Type == "" {
		return ErrValidation
	}
	memberType := a.MemberType
	if memberType == "" {
		memberType = "person"
	}
	var existing int64
	err := tx.QueryRowContext(ctx, `
SELECT id FROM member_address WHERE member_user_id = $1 AND type = $2::member_address_type AND deleted_at IS NULL`, userID, a.Type).Scan(&existing)
	if errors.Is(err, sql.ErrNoRows) {
		_, err = tx.ExecContext(ctx, `
INSERT INTO member_address (member_user_id, type, member_type, setting_prefix_id, name, store_name, tax_number, branch, branch_name,
  address, website_province_id, website_district_id, website_sub_district_id, postcode, tel, email, credit_limit, credit_date, relationship, is_same_information, created_by, updated_by)
VALUES ($1,$2::member_address_type,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$21)`,
			userID, a.Type, memberType, a.SettingPrefixID, a.Name, a.StoreName, a.TaxNumber, a.Branch, a.BranchName,
			a.Address, a.WebsiteProvinceID, a.WebsiteDistrictID, a.WebsiteSubDistrictID, a.Postcode, a.Tel, a.Email,
			a.CreditLimit, a.CreditDate, a.Relationship, a.IsSameInformation, act)
		return err
	}
	if err != nil {
		return err
	}
	_, err = tx.ExecContext(ctx, `
UPDATE member_address SET member_type = $3, setting_prefix_id = $4, name = $5, store_name = $6, tax_number = $7, branch = $8, branch_name = $9,
  address = $10, website_province_id = $11, website_district_id = $12, website_sub_district_id = $13, postcode = $14, tel = $15, email = $16,
  credit_limit = $17, credit_date = $18, relationship = $19, is_same_information = $20, updated_at = NOW(), updated_by = $21
WHERE id = $2 AND member_user_id = $1`,
		userID, existing, memberType, a.SettingPrefixID, a.Name, a.StoreName, a.TaxNumber, a.Branch, a.BranchName,
		a.Address, a.WebsiteProvinceID, a.WebsiteDistrictID, a.WebsiteSubDistrictID, a.Postcode, a.Tel, a.Email,
		a.CreditLimit, a.CreditDate, a.Relationship, a.IsSameInformation, act)
	return err
}

func (r *UserRepository) loadAddresses(ctx context.Context, userID int64) ([]AddressInput, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT type::text, member_type::text, setting_prefix_id, name, store_name, tax_number, branch::text, branch_name, address,
  website_province_id, website_district_id, website_sub_district_id, postcode, tel, email, credit_limit, credit_date, relationship, is_same_information
FROM member_address WHERE member_user_id = $1 AND deleted_at IS NULL`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []AddressInput
	for rows.Next() {
		var a AddressInput
		if err := rows.Scan(&a.Type, &a.MemberType, &a.SettingPrefixID, &a.Name, &a.StoreName, &a.TaxNumber, &a.Branch, &a.BranchName,
			&a.Address, &a.WebsiteProvinceID, &a.WebsiteDistrictID, &a.WebsiteSubDistrictID, &a.Postcode, &a.Tel, &a.Email,
			&a.CreditLimit, &a.CreditDate, &a.Relationship, &a.IsSameInformation); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func (r *UserRepository) loadSettingIDs(ctx context.Context, userID int64) ([]int64, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT member_setting_relation_id FROM member_user_setting WHERE member_user_id = $1`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		out = append(out, id)
	}
	return out, rows.Err()
}

func (r *UserRepository) loadOwnerIDs(ctx context.Context, userID int64) ([]int64, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT admin_user_id FROM member_user_owner WHERE member_user_id = $1`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		out = append(out, id)
	}
	return out, rows.Err()
}

type FileRow struct {
	ID           int64     `json:"id"`
	SystemFileID int64     `json:"system_file_id"`
	SortOrder    int       `json:"sort_order"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func (r *UserRepository) loadFiles(ctx context.Context, userID int64) ([]FileRow, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT id, system_file_id, sort_order, updated_at FROM member_file WHERE member_user_id = $1 AND deleted_at IS NULL ORDER BY sort_order, id`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []FileRow
	for rows.Next() {
		var row FileRow
		if err := rows.Scan(&row.ID, &row.SystemFileID, &row.SortOrder, &row.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

type DiscountRow struct {
	ID              int64      `json:"id"`
	MemberCreditID  *int64     `json:"member_credit_id"`
	ProductItemID   int64      `json:"product_item_id"`
	MinimumQty      float64    `json:"minimum_qty"`
	Discount        float64    `json:"discount"`
	DiscountType    string     `json:"discount_type"`
	DateStart       *time.Time `json:"date_start,omitempty"`
	DateEnd         *time.Time `json:"date_end,omitempty"`
	IsActive        bool       `json:"is_active"`
}

func (r *UserRepository) loadDiscounts(ctx context.Context, userID int64) ([]DiscountRow, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT id, member_credit_id, product_item_id, minimum_qty, discount, discount_type::text, date_start, date_end, is_active
FROM member_discount WHERE member_user_id = $1 AND deleted_at IS NULL ORDER BY id`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []DiscountRow
	for rows.Next() {
		var row DiscountRow
		if err := rows.Scan(&row.ID, &row.MemberCreditID, &row.ProductItemID, &row.MinimumQty, &row.Discount, &row.DiscountType, &row.DateStart, &row.DateEnd, &row.IsActive); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

type HistoryRow struct {
	ID        int64             `json:"id"`
	CreatedAt time.Time         `json:"created_at"`
	CreatedBy *int64            `json:"created_by,omitempty"`
	Names     map[string]string `json:"names,omitempty"`
}

func (r *UserRepository) loadHistories(ctx context.Context, userID int64, locale string) ([]HistoryRow, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT id, created_at, created_by FROM member_history WHERE member_user_id = $1 ORDER BY created_at DESC, id DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []HistoryRow
	for rows.Next() {
		var row HistoryRow
		if err := rows.Scan(&row.ID, &row.CreatedAt, &row.CreatedBy); err != nil {
			return nil, err
		}
		names, _ := r.loadHistoryNames(ctx, row.ID)
		row.Names = names
		out = append(out, row)
	}
	return out, rows.Err()
}

func (r *UserRepository) loadHistoryNames(ctx context.Context, historyID int64) (map[string]string, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT locale, title FROM member_history_language WHERE member_history_id = $1`, historyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]string{}
	for rows.Next() {
		var loc, name string
		if err := rows.Scan(&loc, &name); err != nil {
			return nil, err
		}
		out[loc] = name
	}
	return out, rows.Err()
}

func (r *UserRepository) CreateFile(ctx context.Context, userID, fileID int64, actorID int64) (int64, error) {
	var maxSort int
	_ = r.db.QueryRowContext(ctx, `SELECT COALESCE(MAX(sort_order), 0) FROM member_file WHERE member_user_id = $1 AND deleted_at IS NULL`, userID).Scan(&maxSort)
	var id int64
	err := r.db.QueryRowContext(ctx, `
INSERT INTO member_file (member_user_id, system_file_id, sort_order, created_by, updated_by)
VALUES ($1, $2, $3, $4, $4) RETURNING id`, userID, fileID, maxSort+10, nullActor(actorID)).Scan(&id)
	return id, err
}

func (r *UserRepository) ReorderFiles(ctx context.Context, userID, dragID, targetID, actorID int64) error {
	rows, err := r.db.QueryContext(ctx, `SELECT id, sort_order FROM member_file WHERE member_user_id = $1 AND deleted_at IS NULL ORDER BY sort_order, id`, userID)
	if err != nil {
		return err
	}
	defer rows.Close()
	var nodes []tree.Node
	for rows.Next() {
		var n tree.Node
		if err := rows.Scan(&n.ID, &n.SortOrder); err != nil {
			return err
		}
		nodes = append(nodes, n)
	}
	next, err := tree.ReorderSiblings(nodes, dragID, targetID)
	if err != nil {
		return ErrInvalidReorder
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	act := nullActor(actorID)
	for _, n := range next {
		if _, err := tx.ExecContext(ctx, `UPDATE member_file SET sort_order = $2, updated_at = NOW(), updated_by = $3 WHERE id = $1`, n.ID, n.SortOrder, act); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (r *UserRepository) DeleteFile(ctx context.Context, userID, fileID int64, actorID int64) error {
	res, err := r.db.ExecContext(ctx, `
UPDATE member_file SET deleted_at = NOW(), updated_at = NOW(), updated_by = $3
WHERE id = $1 AND member_user_id = $2 AND deleted_at IS NULL`, fileID, userID, nullActor(actorID))
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *UserRepository) CreateDiscount(ctx context.Context, userID int64, d DiscountRow, actorID int64) (int64, error) {
	dt := d.DiscountType
	if dt == "" {
		dt = "percent"
	}
	var id int64
	err := r.db.QueryRowContext(ctx, `
INSERT INTO member_discount (member_user_id, member_credit_id, product_item_id, minimum_qty, discount, discount_type, date_start, date_end, is_active, created_by, updated_by)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10) RETURNING id`,
		userID, d.MemberCreditID, d.ProductItemID, d.MinimumQty, d.Discount, dt, d.DateStart, d.DateEnd, d.IsActive, nullActor(actorID)).Scan(&id)
	return id, err
}

func (r *UserRepository) PatchDiscount(ctx context.Context, userID, discountID int64, d DiscountRow, actorID int64) error {
	res, err := r.db.ExecContext(ctx, `
UPDATE member_discount SET member_credit_id = $3, product_item_id = $4, minimum_qty = $5, discount = $6, discount_type = $7,
  date_start = $8, date_end = $9, is_active = $10, updated_at = NOW(), updated_by = $11
WHERE id = $2 AND member_user_id = $1 AND deleted_at IS NULL`,
		userID, discountID, d.MemberCreditID, d.ProductItemID, d.MinimumQty, d.Discount, d.DiscountType, d.DateStart, d.DateEnd, d.IsActive, nullActor(actorID))
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *UserRepository) DeleteDiscount(ctx context.Context, userID, discountID int64, actorID int64) error {
	res, err := r.db.ExecContext(ctx, `
UPDATE member_discount SET deleted_at = NOW(), updated_at = NOW(), updated_by = $3 WHERE id = $2 AND member_user_id = $1 AND deleted_at IS NULL`,
		userID, discountID, nullActor(actorID))
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *UserRepository) CreateHistory(ctx context.Context, userID int64, names map[string]string, actorID int64) (int64, error) {
	if err := validateNames(names); err != nil {
		return 0, err
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()
	var id int64
	err = tx.QueryRowContext(ctx, `INSERT INTO member_history (member_user_id, created_by) VALUES ($1, $2) RETURNING id`, userID, nullActor(actorID)).Scan(&id)
	if err != nil {
		return 0, err
	}
	for _, loc := range []string{"th", "en"} {
		name := strings.TrimSpace(names[loc])
		if _, err := tx.ExecContext(ctx, `
INSERT INTO member_history_language (member_history_id, locale, title, description) VALUES ($1, $2, $3, '')
ON CONFLICT (member_history_id, locale) DO UPDATE SET title = EXCLUDED.title, updated_at = NOW()`, id, loc, name); err != nil {
			return 0, err
		}
	}
	return id, tx.Commit()
}

func (r *UserRepository) ListFilters(ctx context.Context, locale string) (map[string]any, error) {
	if locale == "" {
		locale = "th"
	}
	businesses, err := r.filterBusinesses(ctx, locale)
	if err != nil {
		return nil, err
	}
	return map[string]any{"businesses": businesses}, nil
}

func (r *UserRepository) filterBusinesses(ctx context.Context, locale string) ([]map[string]any, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT b.id, COALESCE(l.name, '') FROM member_setting_business b
LEFT JOIN member_setting_business_language l ON l.member_setting_business_id = b.id AND l.locale = $1
WHERE b.deleted_at IS NULL AND b.is_active = TRUE ORDER BY b.id`, locale)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []map[string]any
	for rows.Next() {
		var id int64
		var name string
		if err := rows.Scan(&id, &name); err != nil {
			return nil, err
		}
		out = append(out, map[string]any{"id": id, "name": name})
	}
	return out, rows.Err()
}
