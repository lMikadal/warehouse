package system

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/lMikadal/warehouse/backend/internal/tree"
)

var (
	ErrGeoNotFound        = errors.New("geo row not found")
	ErrGeoInvalidReorder  = errors.New("invalid reorder")
	ErrGeoValidation      = errors.New("validation")
)

type GeoRow struct {
	ID               int64
	SKU              sql.NullString
	Name             string
	Postcode         sql.NullString
	SortOrder        int
	IsActive         bool
	UpdatedAt        time.Time
	SystemCountryID  sql.NullInt64
	SystemProvinceID sql.NullInt64
	SystemDistrictID sql.NullInt64
	ParentLabel      string
	Names            map[string]string
}

type GeoListFilter struct {
	Page, Limit      int
	Locale, Search   string
	IsActive         *bool
	Sort, Order      string
	SystemCountryID  *int64
	SystemProvinceID *int64
	SystemDistrictID *int64
}

type GeoCreateInput struct {
	SKU              *string
	Postcode         *string
	IsActive         bool
	Names            map[string]string
	SystemCountryID  int64
	SystemProvinceID int64
	SystemDistrictID int64
	ActorID          int64
}

type GeoPatch struct {
	SKU              *string
	Postcode         *string
	IsActive         *bool
	Names            map[string]string
	SystemCountryID  *int64
	SystemProvinceID *int64
	SystemDistrictID *int64
	ActorID          int64
}

type AddressGeoRepository struct {
	db *sql.DB
}

func NewAddressGeoRepository(db *sql.DB) *AddressGeoRepository {
	return &AddressGeoRepository{db: db}
}

func (r *AddressGeoRepository) List(ctx context.Context, level GeoLevel, f GeoListFilter) ([]GeoRow, int, error) {
	spec := geoSpecFor(level)
	locale := f.Locale
	if locale == "" {
		locale = "th"
	}
	w := "t.deleted_at IS NULL"
	args := []any{locale}
	n := 2

	if f.IsActive != nil {
		w += fmt.Sprintf(" AND t.is_active = $%d", n)
		args = append(args, *f.IsActive)
		n++
	}
	if f.SystemCountryID != nil && spec.parentCol != "" {
		switch level {
		case GeoProvince:
			w += fmt.Sprintf(" AND t.system_country_id = $%d", n)
			args = append(args, *f.SystemCountryID)
			n++
		case GeoDistrict:
			w += fmt.Sprintf(" AND EXISTS (SELECT 1 FROM system_province p WHERE p.id = t.system_province_id AND p.system_country_id = $%d AND p.deleted_at IS NULL)", n)
			args = append(args, *f.SystemCountryID)
			n++
		case GeoSubDistrict:
			w += fmt.Sprintf(` AND EXISTS (
				SELECT 1 FROM system_district d
				JOIN system_province p ON p.id = d.system_province_id AND p.deleted_at IS NULL
				WHERE d.id = t.system_district_id AND d.deleted_at IS NULL AND p.system_country_id = $%d)`, n)
			args = append(args, *f.SystemCountryID)
			n++
		}
	}
	if f.SystemProvinceID != nil && (level == GeoDistrict || level == GeoSubDistrict) {
		col := "t.system_province_id"
		if level == GeoSubDistrict {
			w += fmt.Sprintf(" AND EXISTS (SELECT 1 FROM system_district d WHERE d.id = t.system_district_id AND d.system_province_id = $%d AND d.deleted_at IS NULL)", n)
		} else {
			w += fmt.Sprintf(" AND %s = $%d", col, n)
		}
		args = append(args, *f.SystemProvinceID)
		n++
	}
	if f.SystemDistrictID != nil && level == GeoSubDistrict {
		w += fmt.Sprintf(" AND t.system_district_id = $%d", n)
		args = append(args, *f.SystemDistrictID)
		n++
	}
	if q := strings.TrimSpace(f.Search); q != "" {
		like := "%" + strings.ToLower(q) + "%"
		w += fmt.Sprintf(` AND (
			LOWER(COALESCE(l.name, '')) LIKE $%d OR LOWER(COALESCE(t.sku, '')) LIKE $%d
			OR EXISTS (SELECT 1 FROM %s lx WHERE lx.%s = t.id AND LOWER(lx.name) LIKE $%d)
		)`, n, n, spec.langTable, spec.langFK, n)
		if spec.hasPostcode {
			w += fmt.Sprintf(" OR LOWER(COALESCE(t.postcode, '')) LIKE $%d", n)
		}
		args = append(args, like)
		n++
	}

	var total int
	if err := r.db.QueryRowContext(ctx, fmt.Sprintf("SELECT COUNT(*) FROM %s t LEFT JOIN %s l ON l.%s = t.id AND l.locale = $1 WHERE %s",
		spec.table, spec.langTable, spec.langFK, w), args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	orderBy := geoOrderBy(f.Sort, f.Order, level)
	limit := f.Limit
	if limit <= 0 {
		limit = 10
	}
	page := f.Page
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * limit

	extraCols := ""
	if spec.hasPostcode {
		extraCols = ", t.postcode"
	}
	parentCols := geoListParentSelect(level, 1)
	q := fmt.Sprintf(`SELECT t.id, t.sku%s, COALESCE(l.name, ''), t.sort_order, t.is_active, t.updated_at%s%s
FROM %s t
LEFT JOIN %s l ON l.%s = t.id AND l.locale = $1
WHERE %s ORDER BY %s LIMIT $%d OFFSET $%d`,
		extraCols, parentCols.selectSQL, parentCols.labelSQL, spec.table, spec.langTable, spec.langFK, w, orderBy, n, n+1)
	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var out []GeoRow
	for rows.Next() {
		row, err := scanGeoListRow(rows, level, spec.hasPostcode, parentCols.scanExtra)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, row)
	}
	return out, total, rows.Err()
}

func (r *AddressGeoRepository) Get(ctx context.Context, level GeoLevel, id int64, locale string) (*GeoRow, error) {
	spec := geoSpecFor(level)
	if locale == "" {
		locale = "th"
	}
	extraCols := ""
	if spec.hasPostcode {
		extraCols = ", t.postcode"
	}
	parentCols := geoListParentSelect(level, 2)
	q := fmt.Sprintf(`SELECT t.id, t.sku%s, COALESCE(l.name, ''), t.sort_order, t.is_active, t.updated_at%s%s
FROM %s t
LEFT JOIN %s l ON l.%s = t.id AND l.locale = $2
WHERE t.id = $1 AND t.deleted_at IS NULL`, extraCols, parentCols.selectSQL, parentCols.labelSQL, spec.table, spec.langTable, spec.langFK)
	row, err := scanGeoListRowSingle(r.db.QueryRowContext(ctx, q, id, locale), level, spec.hasPostcode, parentCols.scanExtra)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	names, err := r.loadNames(ctx, spec, id)
	if err != nil {
		return nil, err
	}
	row.Names = names
	return &row, nil
}

func (r *AddressGeoRepository) Create(ctx context.Context, level GeoLevel, in GeoCreateInput) (int64, error) {
	spec := geoSpecFor(level)
	if err := validateGeoNames(in.Names); err != nil {
		return 0, err
	}
	if err := validateGeoParent(level, in); err != nil {
		return 0, err
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	var maxSort int
	parentID := geoParentIDForCreate(level, in)
	parentCol := spec.parentCol
	countQ := fmt.Sprintf("SELECT COALESCE(MAX(sort_order), 0) FROM %s WHERE deleted_at IS NULL", spec.table)
	if parentCol != "" {
		countQ += fmt.Sprintf(" AND %s = $1", parentCol)
		if err := tx.QueryRowContext(ctx, countQ, parentID).Scan(&maxSort); err != nil {
			return 0, err
		}
	} else if err := tx.QueryRowContext(ctx, countQ).Scan(&maxSort); err != nil {
		return 0, err
	}

	var id int64
	sku := geoNullString(in.SKU)
	switch level {
	case GeoCountry:
		err = tx.QueryRowContext(ctx, `
INSERT INTO system_country (sku, sort_order, is_active, created_by, updated_by)
VALUES ($1, $2, $3, $4, $4) RETURNING id`, sku, maxSort+10, in.IsActive, geoNullInt64(in.ActorID)).Scan(&id)
	case GeoProvince:
		err = tx.QueryRowContext(ctx, `
INSERT INTO system_province (system_country_id, sku, sort_order, is_active, created_by, updated_by)
VALUES ($1, $2, $3, $4, $5, $5) RETURNING id`, in.SystemCountryID, sku, maxSort+10, in.IsActive, geoNullInt64(in.ActorID)).Scan(&id)
	case GeoDistrict:
		err = tx.QueryRowContext(ctx, `
INSERT INTO system_district (system_province_id, sku, sort_order, is_active, created_by, updated_by)
VALUES ($1, $2, $3, $4, $5, $5) RETURNING id`, in.SystemProvinceID, sku, maxSort+10, in.IsActive, geoNullInt64(in.ActorID)).Scan(&id)
	case GeoSubDistrict:
		err = tx.QueryRowContext(ctx, `
INSERT INTO system_sub_district (system_district_id, sku, postcode, sort_order, is_active, created_by, updated_by)
VALUES ($1, $2, $3, $4, $5, $6, $6) RETURNING id`,
			in.SystemDistrictID, sku, geoNullString(in.Postcode), maxSort+10, in.IsActive, geoNullInt64(in.ActorID)).Scan(&id)
	}
	if err != nil {
		return 0, err
	}
	if err := upsertGeoNames(ctx, tx, spec, id, in.Names); err != nil {
		return 0, err
	}
	return id, tx.Commit()
}

func (r *AddressGeoRepository) Update(ctx context.Context, level GeoLevel, id int64, patch GeoPatch) error {
	spec := geoSpecFor(level)
	cur, err := r.Get(ctx, level, id, "th")
	if err != nil || cur == nil {
		return ErrGeoNotFound
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	sets := []string{"updated_at = NOW()", "updated_by = $2"}
	args := []any{id, geoNullInt64(patch.ActorID)}
	idx := 3
	if patch.SKU != nil {
		sets = append(sets, fmt.Sprintf("sku = $%d", idx))
		args = append(args, geoNullString(patch.SKU))
		idx++
	}
	if patch.IsActive != nil {
		sets = append(sets, fmt.Sprintf("is_active = $%d", idx))
		args = append(args, *patch.IsActive)
		idx++
	}
	if patch.Postcode != nil && spec.hasPostcode {
		sets = append(sets, fmt.Sprintf("postcode = $%d", idx))
		args = append(args, geoNullString(patch.Postcode))
		idx++
	}
	if patch.SystemCountryID != nil && level == GeoProvince {
		sets = append(sets, fmt.Sprintf("system_country_id = $%d", idx))
		args = append(args, *patch.SystemCountryID)
		idx++
	}
	if patch.SystemProvinceID != nil && level == GeoDistrict {
		sets = append(sets, fmt.Sprintf("system_province_id = $%d", idx))
		args = append(args, *patch.SystemProvinceID)
		idx++
	}
	if patch.SystemDistrictID != nil && level == GeoSubDistrict {
		sets = append(sets, fmt.Sprintf("system_district_id = $%d", idx))
		args = append(args, *patch.SystemDistrictID)
		idx++
	}
	if len(sets) > 2 || patch.Names != nil {
		q := fmt.Sprintf("UPDATE %s SET %s WHERE id = $1 AND deleted_at IS NULL", spec.table, strings.Join(sets, ", "))
		res, err := tx.ExecContext(ctx, q, args...)
		if err != nil {
			return err
		}
		if n, _ := res.RowsAffected(); n == 0 {
			return ErrGeoNotFound
		}
	}
	if patch.Names != nil {
		if err := validateGeoNames(patch.Names); err != nil {
			return err
		}
		if err := upsertGeoNames(ctx, tx, spec, id, patch.Names); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (r *AddressGeoRepository) SoftDelete(ctx context.Context, level GeoLevel, id int64, actorID int64) error {
	spec := geoSpecFor(level)
	res, err := r.db.ExecContext(ctx, fmt.Sprintf(`
UPDATE %s SET deleted_at = NOW(), updated_at = NOW(), updated_by = $2 WHERE id = $1 AND deleted_at IS NULL`, spec.table), id, geoNullInt64(actorID))
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrGeoNotFound
	}
	return nil
}

func (r *AddressGeoRepository) Reorder(ctx context.Context, level GeoLevel, dragID, targetID int64, actorID int64) error {
	spec := geoSpecFor(level)
	nodes, err := r.loadReorderNodes(ctx, level, spec)
	if err != nil {
		return err
	}
	next, err := tree.ReorderSiblings(nodes, dragID, targetID)
	if err != nil {
		return ErrGeoInvalidReorder
	}
	orderByID := map[int64]int{}
	for _, n := range next {
		orderByID[n.ID] = n.SortOrder
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	for id, so := range orderByID {
		if _, err := tx.ExecContext(ctx, fmt.Sprintf(`
UPDATE %s SET sort_order = $2, updated_at = NOW(), updated_by = $3 WHERE id = $1 AND deleted_at IS NULL`, spec.table),
			id, so, geoNullInt64(actorID)); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (r *AddressGeoRepository) loadReorderNodes(ctx context.Context, level GeoLevel, spec geoSpec) ([]tree.Node, error) {
	var q string
	if spec.parentCol == "" {
		q = fmt.Sprintf("SELECT id, sort_order FROM %s WHERE deleted_at IS NULL ORDER BY sort_order ASC, id ASC", spec.table)
		rows, err := r.db.QueryContext(ctx, q)
		if err != nil {
			return nil, err
		}
		defer rows.Close()
		var out []tree.Node
		for rows.Next() {
			var n tree.Node
			if err := rows.Scan(&n.ID, &n.SortOrder); err != nil {
				return nil, err
			}
			out = append(out, n)
		}
		return out, rows.Err()
	}
	q = fmt.Sprintf("SELECT id, %s, sort_order FROM %s WHERE deleted_at IS NULL ORDER BY sort_order ASC, id ASC", spec.parentCol, spec.table)
	rows, err := r.db.QueryContext(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []tree.Node
	for rows.Next() {
		var n tree.Node
		var parent int64
		if err := rows.Scan(&n.ID, &parent, &n.SortOrder); err != nil {
			return nil, err
		}
		n.ParentID = &parent
		out = append(out, n)
	}
	return out, rows.Err()
}

func (r *AddressGeoRepository) loadNames(ctx context.Context, spec geoSpec, id int64) (map[string]string, error) {
	q := fmt.Sprintf("SELECT locale, name FROM %s WHERE %s = $1", spec.langTable, spec.langFK)
	rows, err := r.db.QueryContext(ctx, q, id)
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

type geoParentSelect struct {
	selectSQL string
	labelSQL  string
	scanExtra int // extra ints to scan besides base
}

func geoListParentSelect(level GeoLevel, localeParam int) geoParentSelect {
	localePh := fmt.Sprintf("$%d", localeParam)
	switch level {
	case GeoProvince:
		return geoParentSelect{
			selectSQL: ", t.system_country_id",
			labelSQL: fmt.Sprintf(
				", (SELECT COALESCE(cl.name, '') FROM system_country_language cl WHERE cl.system_country_id = t.system_country_id AND cl.locale = %s LIMIT 1)",
				localePh,
			),
			scanExtra: 1,
		}
	case GeoDistrict:
		return geoParentSelect{
			selectSQL: ", t.system_province_id",
			labelSQL: fmt.Sprintf(
				", (SELECT COALESCE(pl.name, '') FROM system_province_language pl WHERE pl.system_province_id = t.system_province_id AND pl.locale = %s LIMIT 1)",
				localePh,
			),
			scanExtra: 1,
		}
	case GeoSubDistrict:
		return geoParentSelect{
			selectSQL: ", t.system_district_id",
			labelSQL: fmt.Sprintf(
				", (SELECT COALESCE(dl.name, '') FROM system_district_language dl WHERE dl.system_district_id = t.system_district_id AND dl.locale = %s LIMIT 1)",
				localePh,
			),
			scanExtra: 1,
		}
	default:
		return geoParentSelect{}
	}
}

func geoOrderBy(sort, order string, level GeoLevel) string {
	col := strings.TrimSpace(sort)
	ord := strings.ToLower(strings.TrimSpace(order))
	if col == "" || (ord != "asc" && ord != "desc") {
		return "t.sort_order ASC, t.created_at ASC, t.id ASC"
	}
	switch col {
	case "sku":
		return fmt.Sprintf("t.sku %s NULLS LAST, t.id ASC", strings.ToUpper(ord))
	case "name":
		return fmt.Sprintf("l.name %s NULLS LAST, t.id ASC", strings.ToUpper(ord))
	case "is_active":
		return fmt.Sprintf("t.is_active %s, t.id ASC", strings.ToUpper(ord))
	case "updated_at":
		return fmt.Sprintf("t.updated_at %s, t.id ASC", strings.ToUpper(ord))
	case "postcode":
		if level == GeoSubDistrict {
			return fmt.Sprintf("t.postcode %s NULLS LAST, t.id ASC", strings.ToUpper(ord))
		}
	}
	return "t.sort_order ASC, t.created_at ASC, t.id ASC"
}

func validateGeoNames(names map[string]string) error {
	if strings.TrimSpace(names["th"]) == "" || strings.TrimSpace(names["en"]) == "" {
		return ErrGeoValidation
	}
	return nil
}

func validateGeoParent(level GeoLevel, in GeoCreateInput) error {
	switch level {
	case GeoProvince:
		if in.SystemCountryID <= 0 {
			return ErrGeoValidation
		}
	case GeoDistrict:
		if in.SystemProvinceID <= 0 {
			return ErrGeoValidation
		}
	case GeoSubDistrict:
		if in.SystemDistrictID <= 0 {
			return ErrGeoValidation
		}
	}
	return nil
}

func geoParentIDForCreate(level GeoLevel, in GeoCreateInput) int64 {
	switch level {
	case GeoProvince:
		return in.SystemCountryID
	case GeoDistrict:
		return in.SystemProvinceID
	case GeoSubDistrict:
		return in.SystemDistrictID
	default:
		return 0
	}
}

func upsertGeoNames(ctx context.Context, tx *sql.Tx, spec geoSpec, id int64, names map[string]string) error {
	for _, locale := range []string{"th", "en"} {
		name := strings.TrimSpace(names[locale])
		if name == "" {
			continue
		}
		q := fmt.Sprintf(`
INSERT INTO %s (%s, locale, name) VALUES ($1, $2, $3)
ON CONFLICT (%s, locale) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()`, spec.langTable, spec.langFK, spec.langFK)
		if _, err := tx.ExecContext(ctx, q, id, locale, name); err != nil {
			return err
		}
	}
	return nil
}

func geoNullString(s *string) sql.NullString {
	if s == nil || strings.TrimSpace(*s) == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: strings.TrimSpace(*s), Valid: true}
}

func geoNullInt64(id int64) sql.NullInt64 {
	if id == 0 {
		return sql.NullInt64{}
	}
	return sql.NullInt64{Int64: id, Valid: true}
}

func scanGeoListRow(rows *sql.Rows, level GeoLevel, hasPostcode bool, parentExtra int) (GeoRow, error) {
	var row GeoRow
	dest := []any{&row.ID, &row.SKU, &row.Name, &row.SortOrder, &row.IsActive, &row.UpdatedAt}
	if hasPostcode {
		dest = append(dest, &row.Postcode)
	}
	var parentID sql.NullInt64
	var parentLabel sql.NullString
	if parentExtra > 0 {
		dest = append(dest, &parentID, &parentLabel)
	}
	if err := rows.Scan(dest...); err != nil {
		return GeoRow{}, err
	}
	if parentID.Valid {
		switch level {
		case GeoProvince:
			row.SystemCountryID = parentID
		case GeoDistrict:
			row.SystemProvinceID = parentID
		case GeoSubDistrict:
			row.SystemDistrictID = parentID
		}
	}
	if parentLabel.Valid {
		row.ParentLabel = parentLabel.String
	}
	return row, nil
}

func scanGeoListRowSingle(row scanner, level GeoLevel, hasPostcode bool, parentExtra int) (GeoRow, error) {
	var g GeoRow
	dest := []any{&g.ID, &g.SKU, &g.Name, &g.SortOrder, &g.IsActive, &g.UpdatedAt}
	if hasPostcode {
		dest = append(dest, &g.Postcode)
	}
	var parentID sql.NullInt64
	var parentLabel sql.NullString
	if parentExtra > 0 {
		dest = append(dest, &parentID, &parentLabel)
	}
	if err := row.Scan(dest...); err != nil {
		return GeoRow{}, err
	}
	if parentID.Valid {
		switch level {
		case GeoProvince:
			g.SystemCountryID = parentID
		case GeoDistrict:
			g.SystemProvinceID = parentID
		case GeoSubDistrict:
			g.SystemDistrictID = parentID
		}
	}
	if parentLabel.Valid {
		g.ParentLabel = parentLabel.String
	}
	return g, nil
}

type scanner interface {
	Scan(dest ...any) error
}
