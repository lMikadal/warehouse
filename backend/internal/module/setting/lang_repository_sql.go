package setting

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
)

func langListExtraSelect(k LangKind) string {
	switch k {
	case LangBank:
		return ", t.system_file_id"
	case LangPaymentMethod:
		return ", t.is_sale, t.is_purchase"
	case LangSaleChannel:
		return ", t.is_default, t.system_file_id, t.member_setting_relation_id"
	case LangClaimReason:
		return ", t.is_claim, t.is_return"
	case LangPrefix:
		return ", t.type::text, t.code"
	default:
		return ""
	}
}

func langListWhere(k LangKind, f LangListFilter, locale string) (string, []any) {
	args := []any{locale}
	clauses := []string{"t.deleted_at IS NULL"}
	n := 2
	if f.IsActive != nil {
		clauses = append(clauses, fmt.Sprintf("t.is_active = $%d", n))
		args = append(args, *f.IsActive)
		n++
	}
	if f.Search != "" {
		clauses = append(clauses, fmt.Sprintf("(l.name ILIKE $%d OR CAST(t.id AS TEXT) = $%d)", n, n))
		args = append(args, "%"+f.Search+"%")
		n++
	}
	if k == LangPaymentMethod {
		if f.IsSale != nil {
			clauses = append(clauses, fmt.Sprintf("t.is_sale = $%d", n))
			args = append(args, *f.IsSale)
			n++
		}
		if f.IsPurchase != nil {
			clauses = append(clauses, fmt.Sprintf("t.is_purchase = $%d", n))
			args = append(args, *f.IsPurchase)
			n++
		}
	}
	if k == LangPrefix && f.PrefixType != "" {
		clauses = append(clauses, fmt.Sprintf("t.type = $%d::setting_prefix_type", n))
		args = append(args, f.PrefixType)
		n++
	}
	return strings.Join(clauses, " AND "), args
}

func langOrderBy(sort, order string) string {
	col := "t.sort_order"
	dir := "ASC"
	switch strings.ToLower(sort) {
	case "name":
		col = "l.name"
	case "updated_at":
		col = "t.updated_at"
	case "code":
		col = "t.code"
	}
	if strings.ToLower(order) == "desc" {
		dir = "DESC"
	}
	return fmt.Sprintf("%s %s, t.id ASC", col, dir)
}

func scanLangListRow(rows *sql.Rows, k LangKind) (LangRow, error) {
	var row LangRow
	var err error
	switch k {
	case LangBank:
		var fileID sql.NullInt64
		err = rows.Scan(&row.ID, &row.Name, &row.SortOrder, &row.IsActive, &row.UpdatedAt, &fileID)
		if fileID.Valid {
			v := fileID.Int64
			row.SystemFileID = &v
		}
	case LangPaymentMethod:
		err = rows.Scan(&row.ID, &row.Name, &row.SortOrder, &row.IsActive, &row.UpdatedAt, &row.IsSale, &row.IsPurchase)
	case LangSaleChannel:
		var fileID, relID sql.NullInt64
		err = rows.Scan(&row.ID, &row.Name, &row.SortOrder, &row.IsActive, &row.UpdatedAt, &row.IsDefault, &fileID, &relID)
		if fileID.Valid {
			v := fileID.Int64
			row.SystemFileID = &v
		}
		if relID.Valid {
			v := relID.Int64
			row.MemberSettingRelationID = &v
		}
	case LangClaimReason:
		err = rows.Scan(&row.ID, &row.Name, &row.SortOrder, &row.IsActive, &row.UpdatedAt, &row.IsClaim, &row.IsReturn)
	case LangPrefix:
		err = rows.Scan(&row.ID, &row.Name, &row.SortOrder, &row.IsActive, &row.UpdatedAt, &row.PrefixType, &row.Code)
	default:
		err = rows.Scan(&row.ID, &row.Name, &row.SortOrder, &row.IsActive, &row.UpdatedAt)
	}
	return row, err
}

func scanLangListRowSingle(row *sql.Row, k LangKind) (LangRow, error) {
	var r LangRow
	var err error
	switch k {
	case LangBank:
		var fileID sql.NullInt64
		err = row.Scan(&r.ID, &r.Name, &r.SortOrder, &r.IsActive, &r.UpdatedAt, &fileID)
		if fileID.Valid {
			v := fileID.Int64
			r.SystemFileID = &v
		}
	case LangPaymentMethod:
		err = row.Scan(&r.ID, &r.Name, &r.SortOrder, &r.IsActive, &r.UpdatedAt, &r.IsSale, &r.IsPurchase)
	case LangSaleChannel:
		var fileID, relID sql.NullInt64
		err = row.Scan(&r.ID, &r.Name, &r.SortOrder, &r.IsActive, &r.UpdatedAt, &r.IsDefault, &fileID, &relID)
		if fileID.Valid {
			v := fileID.Int64
			r.SystemFileID = &v
		}
		if relID.Valid {
			v := relID.Int64
			r.MemberSettingRelationID = &v
		}
	case LangClaimReason:
		err = row.Scan(&r.ID, &r.Name, &r.SortOrder, &r.IsActive, &r.UpdatedAt, &r.IsClaim, &r.IsReturn)
	case LangPrefix:
		err = row.Scan(&r.ID, &r.Name, &r.SortOrder, &r.IsActive, &r.UpdatedAt, &r.PrefixType, &r.Code)
	default:
		err = row.Scan(&r.ID, &r.Name, &r.SortOrder, &r.IsActive, &r.UpdatedAt)
	}
	return r, err
}

func langReorderScopeSQL(k LangKind, prefixType string) string {
	if k == LangPrefix && prefixType != "" {
		return fmt.Sprintf(" AND type = '%s'::setting_prefix_type", prefixType)
	}
	return ""
}

func langValidateCreate(k LangKind, in LangCreateInput) error {
	if k == LangClaimReason && !in.IsClaim && !in.IsReturn {
		return ErrValidation
	}
	if k == LangPrefix {
		if in.PrefixType != "person" && in.PrefixType != "company" {
			return ErrValidation
		}
		if strings.TrimSpace(in.Code) == "" {
			return ErrValidation
		}
	}
	return nil
}

func langValidatePatch(k LangKind, p LangPatch) error {
	if k != LangClaimReason {
		return nil
	}
	// Load current if toggles omitted — ponytail: require both flags in full patch; partial toggle via explicit values
	claim := false
	ret := false
	if p.IsClaim != nil {
		claim = *p.IsClaim
	}
	if p.IsReturn != nil {
		ret = *p.IsReturn
	}
	if p.IsClaim == nil && p.IsReturn == nil {
		return nil
	}
	if !claim && !ret {
		return ErrValidation
	}
	return nil
}

func langInsert(ctx context.Context, tx *sql.Tx, k LangKind, sortOrder int, in LangCreateInput) (int64, error) {
	act := nullActor(in.ActorID)
	var id int64
	var err error
	switch k {
	case LangBank:
		err = tx.QueryRowContext(ctx, `
INSERT INTO setting_bank (sort_order, is_active, system_file_id, created_by, updated_by)
VALUES ($1, $2, $3, $4, $4) RETURNING id`, sortOrder, in.IsActive, nullInt64Ptr(in.SystemFileID), act).Scan(&id)
	case LangPaymentMethod:
		err = tx.QueryRowContext(ctx, `
INSERT INTO setting_payment_method (is_sale, is_purchase, sort_order, is_active, created_by, updated_by)
VALUES ($1, $2, $3, $4, $5, $5) RETURNING id`, in.IsSale, in.IsPurchase, sortOrder, in.IsActive, act).Scan(&id)
	case LangSaleChannel:
		err = tx.QueryRowContext(ctx, `
INSERT INTO setting_sale_channel (is_default, sort_order, is_active, system_file_id, member_setting_relation_id, created_by, updated_by)
VALUES ($1, $2, $3, $4, $5, $6, $6) RETURNING id`,
			in.IsDefault, sortOrder, in.IsActive, nullInt64Ptr(in.SystemFileID), nullInt64Ptr(in.MemberSettingRelationID), act).Scan(&id)
	case LangClaimReason:
		err = tx.QueryRowContext(ctx, `
INSERT INTO setting_claim_reason (is_claim, is_return, sort_order, is_active, created_by, updated_by)
VALUES ($1, $2, $3, $4, $5, $5) RETURNING id`, in.IsClaim, in.IsReturn, sortOrder, in.IsActive, act).Scan(&id)
	case LangPrefix:
		err = tx.QueryRowContext(ctx, `
INSERT INTO setting_prefix (type, code, sort_order, is_active, created_by, updated_by)
VALUES ($1::setting_prefix_type, $2, $3, $4, $5, $5) RETURNING id`,
			in.PrefixType, strings.TrimSpace(in.Code), sortOrder, in.IsActive, act).Scan(&id)
	default:
		err = fmt.Errorf("unknown kind")
	}
	return id, err
}

func langUpdateBase(ctx context.Context, tx *sql.Tx, k LangKind, id int64, p LangPatch) error {
	spec := langSpecFor(k)
	sets := []string{"updated_at = NOW()", "updated_by = $2"}
	args := []any{id, nullActor(p.ActorID)}
	n := 3
	if p.IsActive != nil {
		sets = append(sets, fmt.Sprintf("is_active = $%d", n))
		args = append(args, *p.IsActive)
		n++
	}
	switch k {
	case LangPaymentMethod:
		if p.IsSale != nil {
			sets = append(sets, fmt.Sprintf("is_sale = $%d", n))
			args = append(args, *p.IsSale)
			n++
		}
		if p.IsPurchase != nil {
			sets = append(sets, fmt.Sprintf("is_purchase = $%d", n))
			args = append(args, *p.IsPurchase)
			n++
		}
	case LangSaleChannel:
		if p.IsDefault != nil {
			sets = append(sets, fmt.Sprintf("is_default = $%d", n))
			args = append(args, *p.IsDefault)
			n++
		}
		if p.SystemFileIDSet {
			sets = append(sets, fmt.Sprintf("system_file_id = $%d", n))
			args = append(args, nullInt64Ptr(p.SystemFileID))
			n++
		}
		if p.MemberSettingRelationID != nil {
			sets = append(sets, fmt.Sprintf("member_setting_relation_id = $%d", n))
			args = append(args, nullInt64Ptr(p.MemberSettingRelationID))
			n++
		}
	case LangClaimReason:
		if p.IsClaim != nil || p.IsReturn != nil {
			// merge with current row for CHECK constraint
			var curClaim, curReturn bool
			if err := tx.QueryRowContext(ctx, "SELECT is_claim, is_return FROM setting_claim_reason WHERE id = $1", id).Scan(&curClaim, &curReturn); err != nil {
				return err
			}
			claim, ret := curClaim, curReturn
			if p.IsClaim != nil {
				claim = *p.IsClaim
			}
			if p.IsReturn != nil {
				ret = *p.IsReturn
			}
			if !claim && !ret {
				return ErrValidation
			}
			if p.IsClaim != nil {
				sets = append(sets, fmt.Sprintf("is_claim = $%d", n))
				args = append(args, claim)
				n++
			}
			if p.IsReturn != nil {
				sets = append(sets, fmt.Sprintf("is_return = $%d", n))
				args = append(args, ret)
				n++
			}
		}
	case LangPrefix:
		if p.Code != nil {
			sets = append(sets, fmt.Sprintf("code = $%d", n))
			args = append(args, strings.TrimSpace(*p.Code))
			n++
		}
	case LangBank:
		if p.SystemFileIDSet {
			sets = append(sets, fmt.Sprintf("system_file_id = $%d", n))
			args = append(args, nullInt64Ptr(p.SystemFileID))
			n++
		}
	}
	q := fmt.Sprintf("UPDATE %s SET %s WHERE id = $1 AND deleted_at IS NULL", spec.table, strings.Join(sets, ", "))
	_, err := tx.ExecContext(ctx, q, args...)
	return err
}

func nullInt64Ptr(p *int64) sql.NullInt64 {
	if p == nil {
		return sql.NullInt64{}
	}
	return sql.NullInt64{Int64: *p, Valid: true}
}
