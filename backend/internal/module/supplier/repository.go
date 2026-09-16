package supplier

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/lMikadal/warehouse/backend/internal/tree"
)

var ErrInvalidReorder = errors.New("invalid reorder")

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func listOrderBy(sort, order string) string {
	col := "u.created_at ASC, u.id ASC"
	switch sort {
	case "sku":
		col = "u.sku"
	case "updated_at":
		col = "u.updated_at"
	case "is_active":
		col = "u.is_active"
	default:
		return col
	}
	if order == "desc" {
		return col + " DESC, u.id DESC"
	}
	return col + " ASC, u.id ASC"
}

func (r *Repository) List(ctx context.Context, f UserListFilter) ([]UserRow, int64, error) {
	w, args := listWhere(f, 1)
	var total int64
	if err := r.db.QueryRowContext(ctx, `
SELECT COUNT(*)
FROM supplier_user u
LEFT JOIN supplier_information ci ON ci.supplier_user_id = u.id AND ci.type = 'contact'
WHERE `+w, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	wList, listArgs := listWhere(f, 1)
	limitIdx := len(listArgs) + 1
	offsetIdx := limitIdx + 1
	q := fmt.Sprintf(`
SELECT u.id, u.sku, u.credit_term, u.credit_term_note, u.is_active, u.updated_at,
       ci.tax_number, ci.name, ci.setting_prefix_id, ci.address, ci.tel, ci.email
FROM supplier_user u
LEFT JOIN supplier_information ci ON ci.supplier_user_id = u.id AND ci.type = 'contact'
WHERE %s
ORDER BY %s
LIMIT $%d OFFSET $%d`, wList, listOrderBy(f.Sort, f.Order), limitIdx, offsetIdx)
	listArgs = append(listArgs, f.Limit, (f.Page-1)*f.Limit)
	rows, err := r.db.QueryContext(ctx, q, listArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var out []UserRow
	for rows.Next() {
		var row UserRow
		if err := rows.Scan(&row.ID, &row.SKU, &row.CreditTerm, &row.CreditTermNote, &row.IsActive, &row.UpdatedAt,
			&row.TaxNumber, &row.CompanyName, &row.SettingPrefixID, &row.CompanyAddress, &row.ContactTel, &row.ContactEmail); err != nil {
			return nil, 0, err
		}
		out = append(out, row)
	}
	return out, total, rows.Err()
}

func listWhere(f UserListFilter, startArg int) (string, []any) {
	clauses := []string{"u.deleted_at IS NULL"}
	args := []any{}
	n := startArg
	if f.IsActive != nil {
		clauses = append(clauses, fmt.Sprintf("u.is_active = $%d", n))
		args = append(args, *f.IsActive)
		n++
	}
	if q := strings.TrimSpace(f.Search); q != "" {
		pat := "%" + strings.ToLower(q) + "%"
		clauses = append(clauses, fmt.Sprintf(`(
  LOWER(u.sku) LIKE $%d OR
  LOWER(COALESCE(ci.tax_number, '')) LIKE $%d OR
  LOWER(COALESCE(ci.name, '')) LIKE $%d OR
  LOWER(COALESCE(ci.address, '')) LIKE $%d OR
  LOWER(COALESCE(ci.tel, '')) LIKE $%d OR
  LOWER(COALESCE(ci.email, '')) LIKE $%d
)`, n, n, n, n, n, n))
		args = append(args, pat)
	}
	return strings.Join(clauses, " AND "), args
}

func (r *Repository) SKUExists(ctx context.Context, sku string, excludeID int64) (bool, error) {
	var id int64
	err := r.db.QueryRowContext(ctx, `
SELECT id FROM supplier_user WHERE deleted_at IS NULL AND LOWER(sku) = LOWER($1) AND ($2 = 0 OR id <> $2)`,
		sku, excludeID).Scan(&id)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

func (r *Repository) UserExists(ctx context.Context, id int64) (bool, error) {
	var n int
	err := r.db.QueryRowContext(ctx, `SELECT 1 FROM supplier_user WHERE id = $1 AND deleted_at IS NULL`, id).Scan(&n)
	if err == sql.ErrNoRows {
		return false, nil
	}
	return err == nil, err
}

func (r *Repository) GetAggregate(ctx context.Context, id int64, locale string) (*UserRow, map[string]InformationRow, []ContactRow, []BankRow, error) {
	var base UserRow
	err := r.db.QueryRowContext(ctx, `
SELECT id, sku, credit_term, credit_term_note, is_active, updated_at
FROM supplier_user WHERE id = $1 AND deleted_at IS NULL`, id).Scan(
		&base.ID, &base.SKU, &base.CreditTerm, &base.CreditTermNote, &base.IsActive, &base.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil, nil, nil, nil
	}
	if err != nil {
		return nil, nil, nil, nil, err
	}
	info, err := r.loadInformation(ctx, id, locale)
	if err != nil {
		return nil, nil, nil, nil, err
	}
	contacts, err := r.loadContacts(ctx, id)
	if err != nil {
		return nil, nil, nil, nil, err
	}
	banks, err := r.loadBanks(ctx, id)
	if err != nil {
		return nil, nil, nil, nil, err
	}
	return &base, info, contacts, banks, nil
}

func (r *Repository) loadInformation(ctx context.Context, supplierID int64, locale string) (map[string]InformationRow, error) {
	if locale == "" {
		locale = "th"
	}
	rows, err := r.db.QueryContext(ctx, `
SELECT si.type::text, si.setting_prefix_id,
       COALESCE(
         (SELECT spl.name FROM setting_prefix_language spl
          WHERE spl.setting_prefix_id = si.setting_prefix_id AND spl.locale = $2 LIMIT 1),
         (SELECT spl.name FROM setting_prefix_language spl
          WHERE spl.setting_prefix_id = si.setting_prefix_id AND spl.locale = 'th' LIMIT 1)
       ) AS setting_prefix_name,
       si.name, si.branch::text, si.branch_name, si.tax_number, si.address,
       si.website_province_id,
       COALESCE(
         (SELECT pl.name FROM system_province_language pl
          WHERE pl.system_province_id = si.website_province_id AND pl.locale = $2 LIMIT 1),
         (SELECT pl.name FROM system_province_language pl
          WHERE pl.system_province_id = si.website_province_id AND pl.locale = 'th' LIMIT 1)
       ) AS website_province_name,
       si.website_district_id,
       COALESCE(
         (SELECT dl.name FROM system_district_language dl
          WHERE dl.system_district_id = si.website_district_id AND dl.locale = $2 LIMIT 1),
         (SELECT dl.name FROM system_district_language dl
          WHERE dl.system_district_id = si.website_district_id AND dl.locale = 'th' LIMIT 1)
       ) AS website_district_name,
       si.website_sub_district_id,
       COALESCE(
         (SELECT sdl.name FROM system_sub_district_language sdl
          WHERE sdl.system_sub_district_id = si.website_sub_district_id AND sdl.locale = $2 LIMIT 1),
         (SELECT sdl.name FROM system_sub_district_language sdl
          WHERE sdl.system_sub_district_id = si.website_sub_district_id AND sdl.locale = 'th' LIMIT 1)
       ) AS website_sub_district_name,
       si.postcode, si.tel, si.email, si.is_same_information
FROM supplier_information si WHERE si.supplier_user_id = $1`, supplierID, locale)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]InformationRow{}
	for rows.Next() {
		var row InformationRow
		if err := rows.Scan(
			&row.Type, &row.SettingPrefixID, &row.SettingPrefixName,
			&row.Name, &row.Branch, &row.BranchName, &row.TaxNumber,
			&row.Address, &row.WebsiteProvinceID, &row.WebsiteProvinceName,
			&row.WebsiteDistrictID, &row.WebsiteDistrictName,
			&row.WebsiteSubDistrictID, &row.WebsiteSubDistrictName,
			&row.Postcode, &row.Tel, &row.Email, &row.IsSameInformation,
		); err != nil {
			return nil, err
		}
		out[row.Type] = row
	}
	return out, rows.Err()
}

func (r *Repository) loadContacts(ctx context.Context, supplierID int64) ([]ContactRow, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT id, name, email, tel, position, sort_order
FROM supplier_contact
WHERE supplier_user_id = $1 AND deleted_at IS NULL
ORDER BY sort_order ASC, id ASC`, supplierID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []ContactRow
	for rows.Next() {
		var row ContactRow
		if err := rows.Scan(&row.ID, &row.Name, &row.Email, &row.Tel, &row.Position, &row.SortOrder); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

func (r *Repository) loadBanks(ctx context.Context, supplierID int64) ([]BankRow, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT id, setting_bank_id, name, number, branch, is_active, is_default, sort_order
FROM supplier_bank
WHERE supplier_user_id = $1 AND deleted_at IS NULL
ORDER BY sort_order ASC, id ASC`, supplierID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []BankRow
	for rows.Next() {
		var row BankRow
		if err := rows.Scan(&row.ID, &row.SettingBankID, &row.Name, &row.Number, &row.Branch, &row.IsActive, &row.IsDefault, &row.SortOrder); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

func (r *Repository) Create(ctx context.Context, in CreateUserInput, actorID int64) (int64, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	var id int64
	err = tx.QueryRowContext(ctx, `
INSERT INTO supplier_user (sku, credit_term, credit_term_note, is_active, created_by, updated_by)
VALUES ($1, $2, $3, $4, $5, $5) RETURNING id`,
		in.SKU, nullInt32(in.CreditTerm), nullString(in.CreditTermNote), in.IsActive, actorID).Scan(&id)
	if err != nil {
		return 0, err
	}
	for _, typ := range []string{InfoContact, InfoTaxInvoice, InfoDelivery} {
		info, ok := in.Information[typ]
		if !ok && typ != InfoContact {
			continue
		}
		requireName := typ == InfoContact
		if err := upsertInformationTx(ctx, tx, id, typ, info, requireName); err != nil {
			return 0, err
		}
	}
	for i, c := range in.Contacts {
		if err := insertContactTx(ctx, tx, id, c, (i+1)*100, actorID); err != nil {
			return 0, err
		}
	}
	for i, b := range in.Banks {
		if err := insertBankTx(ctx, tx, id, b, (i+1)*100, actorID); err != nil {
			return 0, err
		}
	}
	if err := tx.Commit(); err != nil {
		return 0, err
	}
	return id, nil
}

func (r *Repository) Patch(ctx context.Context, id int64, in PatchUserInput, actorID int64) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	res, err := tx.ExecContext(ctx, `
UPDATE supplier_user SET
  sku = COALESCE($2, sku),
  credit_term = CASE WHEN $3::boolean THEN $4 ELSE credit_term END,
  credit_term_note = CASE WHEN $5::boolean THEN $6 ELSE credit_term_note END,
  is_active = COALESCE($7, is_active),
  updated_by = $8,
  updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND deleted_at IS NULL`,
		id, in.SKU, in.CreditTerm != nil, nullInt32Ptr(in.CreditTerm), in.CreditTermNote != nil, nullStringPtr(in.CreditTermNote), in.IsActive, actorID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return sql.ErrNoRows
	}
	for typ, info := range in.Information {
		requireName := typ == InfoContact
		if err := upsertInformationTx(ctx, tx, id, typ, info, requireName); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (r *Repository) SoftDelete(ctx context.Context, id int64, actorID int64) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	res, err := tx.ExecContext(ctx, `
UPDATE supplier_user SET deleted_at = CURRENT_TIMESTAMP, updated_by = $2, updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND deleted_at IS NULL`, id, actorID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return sql.ErrNoRows
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE supplier_contact SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP, updated_by = $2
WHERE supplier_user_id = $1 AND deleted_at IS NULL`, id, actorID); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE supplier_bank SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP, updated_by = $2
WHERE supplier_user_id = $1 AND deleted_at IS NULL`, id, actorID); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM supplier_information WHERE supplier_user_id = $1`, id); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *Repository) CreateContact(ctx context.Context, supplierID int64, in ContactInput, actorID int64) (int64, error) {
	var count int
	if err := r.db.QueryRowContext(ctx, `
SELECT COUNT(*) FROM supplier_contact WHERE supplier_user_id = $1 AND deleted_at IS NULL`, supplierID).Scan(&count); err != nil {
		return 0, err
	}
	var id int64
	err := r.db.QueryRowContext(ctx, `
INSERT INTO supplier_contact (supplier_user_id, name, email, tel, position, sort_order, created_by, updated_by)
VALUES ($1, $2, $3, $4, $5, $6, $7, $7) RETURNING id`,
		supplierID, strings.TrimSpace(in.Name), nullStringPtr(in.Email), nullStringPtr(in.Tel), nullStringPtr(in.Position), (count+1)*100, actorID).Scan(&id)
	return id, err
}

func (r *Repository) PatchContact(ctx context.Context, supplierID, contactID int64, in ContactInput, actorID int64) error {
	res, err := r.db.ExecContext(ctx, `
UPDATE supplier_contact SET name = $3, email = $4, tel = $5, position = $6, updated_by = $7, updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND supplier_user_id = $2 AND deleted_at IS NULL`,
		contactID, supplierID, strings.TrimSpace(in.Name), nullStringPtr(in.Email), nullStringPtr(in.Tel), nullStringPtr(in.Position), actorID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (r *Repository) DeleteContact(ctx context.Context, supplierID, contactID int64, actorID int64) error {
	res, err := r.db.ExecContext(ctx, `
UPDATE supplier_contact SET deleted_at = CURRENT_TIMESTAMP, updated_by = $3, updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND supplier_user_id = $2 AND deleted_at IS NULL`, contactID, supplierID, actorID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (r *Repository) ReorderContacts(ctx context.Context, supplierID, dragID, targetID int64, actorID int64) error {
	if err := tree.PersistParentScopedSiblingReorder(
		ctx, r.db, tree.ReorderSupplierContact, supplierID, dragID, targetID, actorID,
	); err != nil {
		if errors.Is(err, tree.ErrInvalidReorder) {
			return ErrInvalidReorder
		}
		return err
	}
	return nil
}

func (r *Repository) CreateBank(ctx context.Context, supplierID int64, in BankInput, actorID int64) (int64, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()
	var count int
	if err := tx.QueryRowContext(ctx, `
SELECT COUNT(*) FROM supplier_bank WHERE supplier_user_id = $1 AND deleted_at IS NULL`, supplierID).Scan(&count); err != nil {
		return 0, err
	}
	isActive := true
	if in.IsActive != nil {
		isActive = *in.IsActive
	}
	isDefault := false
	if in.IsDefault != nil {
		isDefault = *in.IsDefault
	}
	if isDefault {
		if err := clearBankDefaultsTx(ctx, tx, supplierID, 0); err != nil {
			return 0, err
		}
	}
	var id int64
	err = tx.QueryRowContext(ctx, `
INSERT INTO supplier_bank (supplier_user_id, setting_bank_id, name, number, branch, is_active, is_default, sort_order, created_by, updated_by)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9) RETURNING id`,
		supplierID, in.SettingBankID, strings.TrimSpace(in.Name), strings.TrimSpace(in.Number), nullStringPtr(in.Branch), isActive, isDefault, (count+1)*100, actorID).Scan(&id)
	if err != nil {
		return 0, err
	}
	if err := tx.Commit(); err != nil {
		return 0, err
	}
	return id, nil
}

func (r *Repository) PatchBank(ctx context.Context, supplierID, bankID int64, in BankInput, actorID int64) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	isDefault := false
	if in.IsDefault != nil {
		isDefault = *in.IsDefault
	}
	if isDefault {
		if err := clearBankDefaultsTx(ctx, tx, supplierID, bankID); err != nil {
			return err
		}
	}
	isActive := true
	if in.IsActive != nil {
		isActive = *in.IsActive
	}
	res, err := tx.ExecContext(ctx, `
UPDATE supplier_bank SET
  setting_bank_id = $3,
  name = $4,
  number = $5,
  branch = $6,
  is_active = $7,
  is_default = $8,
  updated_by = $9,
  updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND supplier_user_id = $2 AND deleted_at IS NULL`,
		bankID, supplierID, in.SettingBankID, strings.TrimSpace(in.Name), strings.TrimSpace(in.Number),
		nullStringPtr(in.Branch), isActive, isDefault, actorID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return sql.ErrNoRows
	}
	return tx.Commit()
}

func (r *Repository) DeleteBank(ctx context.Context, supplierID, bankID int64, actorID int64) error {
	res, err := r.db.ExecContext(ctx, `
UPDATE supplier_bank SET deleted_at = CURRENT_TIMESTAMP, updated_by = $3, updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND supplier_user_id = $2 AND deleted_at IS NULL`, bankID, supplierID, actorID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (r *Repository) ReorderBanks(ctx context.Context, supplierID, dragID, targetID int64, actorID int64) error {
	if err := tree.PersistParentScopedSiblingReorder(
		ctx, r.db, tree.ReorderSupplierBank, supplierID, dragID, targetID, actorID,
	); err != nil {
		if errors.Is(err, tree.ErrInvalidReorder) {
			return ErrInvalidReorder
		}
		return err
	}
	return nil
}

func clearBankDefaultsTx(ctx context.Context, tx *sql.Tx, supplierID, exceptID int64) error {
	_, err := tx.ExecContext(ctx, `
UPDATE supplier_bank SET is_default = FALSE, updated_at = CURRENT_TIMESTAMP
WHERE supplier_user_id = $1 AND deleted_at IS NULL AND ($2 = 0 OR id <> $2)`, supplierID, exceptID)
	return err
}

func upsertInformationTx(ctx context.Context, tx *sql.Tx, supplierID int64, typ string, in InformationInput, requireName bool) error {
	_, err := tx.ExecContext(ctx, `
INSERT INTO supplier_information (
  supplier_user_id, type, setting_prefix_id, name, branch, branch_name, tax_number, address,
  website_province_id, website_district_id, website_sub_district_id, postcode, tel, email, is_same_information
) VALUES ($1, $2::supplier_information_type, $3, $4, $5::entity_branch, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
ON CONFLICT (supplier_user_id, type) DO UPDATE SET
  setting_prefix_id = EXCLUDED.setting_prefix_id,
  name = EXCLUDED.name,
  branch = EXCLUDED.branch,
  branch_name = EXCLUDED.branch_name,
  tax_number = EXCLUDED.tax_number,
  address = EXCLUDED.address,
  website_province_id = EXCLUDED.website_province_id,
  website_district_id = EXCLUDED.website_district_id,
  website_sub_district_id = EXCLUDED.website_sub_district_id,
  postcode = EXCLUDED.postcode,
  tel = EXCLUDED.tel,
  email = EXCLUDED.email,
  is_same_information = EXCLUDED.is_same_information`,
		supplierID, typ,
		nullInt64Ptr(in.SettingPrefixID), nullStringPtr(in.Name), nullBranch(in.Branch), nullStringPtr(in.BranchName),
		nullStringPtr(in.TaxNumber), nullStringPtr(in.Address),
		nullInt64Ptr(in.WebsiteProvinceID), nullInt64Ptr(in.WebsiteDistrictID), nullInt64Ptr(in.WebsiteSubDistrictID),
		nullStringPtr(in.Postcode), nullStringPtr(in.Tel), nullStringPtr(in.Email), boolDefault(in.IsSameInformation, false))
	return err
}

func insertContactTx(ctx context.Context, tx *sql.Tx, supplierID int64, in ContactInput, sortOrder int, actorID int64) error {
	_, err := tx.ExecContext(ctx, `
INSERT INTO supplier_contact (supplier_user_id, name, email, tel, position, sort_order, created_by, updated_by)
VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
		supplierID, strings.TrimSpace(in.Name), nullStringPtr(in.Email), nullStringPtr(in.Tel), nullStringPtr(in.Position), sortOrder, actorID)
	return err
}

func insertBankTx(ctx context.Context, tx *sql.Tx, supplierID int64, in BankInput, sortOrder int, actorID int64) error {
	isActive := true
	if in.IsActive != nil {
		isActive = *in.IsActive
	}
	isDefault := false
	if in.IsDefault != nil {
		isDefault = *in.IsDefault
	}
	if isDefault {
		if err := clearBankDefaultsTx(ctx, tx, supplierID, 0); err != nil {
			return err
		}
	}
	_, err := tx.ExecContext(ctx, `
INSERT INTO supplier_bank (supplier_user_id, setting_bank_id, name, number, branch, is_active, is_default, sort_order, created_by, updated_by)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)`,
		supplierID, in.SettingBankID, strings.TrimSpace(in.Name), strings.TrimSpace(in.Number), nullStringPtr(in.Branch), isActive, isDefault, sortOrder, actorID)
	return err
}

func (r *Repository) PrefixIsCompany(ctx context.Context, id int64) (bool, error) {
	var ok bool
	err := r.db.QueryRowContext(ctx, `
SELECT is_company FROM setting_prefix WHERE id = $1 AND deleted_at IS NULL AND is_active = TRUE`, id).Scan(&ok)
	if err == sql.ErrNoRows {
		return false, nil
	}
	return ok, err
}

func (r *Repository) BankActive(ctx context.Context, id int64) (bool, error) {
	var ok bool
	err := r.db.QueryRowContext(ctx, `
SELECT is_active FROM setting_bank WHERE id = $1 AND deleted_at IS NULL`, id).Scan(&ok)
	if err == sql.ErrNoRows {
		return false, nil
	}
	return ok, err
}

func (r *Repository) GeoChainValid(ctx context.Context, provinceID, districtID, subDistrictID *int64) error {
	if provinceID == nil && districtID == nil && subDistrictID == nil {
		return nil
	}
	if subDistrictID != nil {
		var dID, pID int64
		err := r.db.QueryRowContext(ctx, `
SELECT sd.system_district_id, d.system_province_id
FROM system_sub_district sd
JOIN system_district d ON d.id = sd.system_district_id
WHERE sd.id = $1 AND sd.deleted_at IS NULL`, *subDistrictID).Scan(&dID, &pID)
		if err == sql.ErrNoRows {
			return errors.New("invalid sub_district")
		}
		if err != nil {
			return err
		}
		if districtID != nil && *districtID != dID {
			return errors.New("district mismatch")
		}
		if provinceID != nil && *provinceID != pID {
			return errors.New("province mismatch")
		}
		return nil
	}
	if districtID != nil {
		var pID int64
		err := r.db.QueryRowContext(ctx, `
SELECT system_province_id FROM system_district WHERE id = $1 AND deleted_at IS NULL`, *districtID).Scan(&pID)
		if err == sql.ErrNoRows {
			return errors.New("invalid district")
		}
		if err != nil {
			return err
		}
		if provinceID != nil && *provinceID != pID {
			return errors.New("province mismatch")
		}
	}
	return nil
}

func nullInt32(v *int32) sql.NullInt32 {
	if v == nil {
		return sql.NullInt32{}
	}
	return sql.NullInt32{Int32: *v, Valid: true}
}

func nullInt32Ptr(v *int32) any {
	if v == nil {
		return nil
	}
	return *v
}

func nullInt64Ptr(v *int64) any {
	if v == nil {
		return nil
	}
	return *v
}

func nullString(v *string) sql.NullString {
	if v == nil {
		return sql.NullString{}
	}
	return sql.NullString{String: *v, Valid: true}
}

func nullStringPtr(v *string) any {
	if v == nil {
		return nil
	}
	s := strings.TrimSpace(*v)
	if s == "" {
		return nil
	}
	return s
}

func nullBranch(v *string) any {
	if v == nil {
		return nil
	}
	s := strings.TrimSpace(*v)
	if s == "" {
		return nil
	}
	return s
}

func boolDefault(v *bool, def bool) bool {
	if v == nil {
		return def
	}
	return *v
}
