package warehouse

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/lMikadal/warehouse/backend/internal/tree"
)

type flatNode struct {
	id             int64
	sort, cap      int
	typ, sku, name string
	parent         *int64
	active         bool
}

type Row struct {
	ID        int64
	Type      string
	SKU       string
	ParentID  *int64
	SortOrder int
	Capacity  int
	IsActive  bool
	Name      string
	UpdatedAt time.Time
	Names     map[string]string
	Barcode   *string
	QRCode    *string
	RFID      *string
}

type ConditionRow struct {
	Type         string `json:"type"`
	Amount       int    `json:"amount"`
	AmountActive int    `json:"amount_active"`
}

type Stats struct {
	SKUCount  int     `json:"sku_count"`
	RemainQty float64 `json:"remain_qty"`
	ZoneCount int     `json:"zone_count"`
}

type TreeNode struct {
	ID          int64          `json:"id"`
	Type        string         `json:"type"`
	SKU         string         `json:"sku"`
	ParentID    *int64         `json:"parent_id"`
	SortOrder   int            `json:"sort_order"`
	Capacity    int            `json:"capacity"`
	IsActive    bool           `json:"is_active"`
	Name        string         `json:"name"`
	Used        float64        `json:"used"`
	CapacityPct int            `json:"capacity_pct"`
	ChildCounts map[string]int `json:"child_counts,omitempty"`
	Conditions  []ConditionRow `json:"conditions,omitempty"`
}

type ListFilter struct {
	Page, Limit    int
	Locale, Search string
	Type           string
	ParentID       *int64
	RootID         *int64
	IsActive       *bool
	IncludeStats   bool
}

type CreateInput struct {
	Type       string
	SKU        string
	ParentID   *int64
	Capacity   int
	IsActive   bool
	Names      map[string]string
	Conditions *ConditionsPatch
	ActorID    int64
}

type Patch struct {
	SKU      *string
	Barcode  *string
	QRCode   *string
	RFID     *string
	Capacity *int
	IsActive *bool
	Names    map[string]string
	ActorID  int64
}

type ConditionsPatch struct {
	Shelf *conditionAmounts
	Rack  *conditionAmounts
	Bin   *conditionAmounts
}

type conditionAmounts struct {
	Amount       int
	AmountActive int
}

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) List(ctx context.Context, f ListFilter) ([]Row, int, error) {
	locale := f.Locale
	if locale == "" {
		locale = "th"
	}
	args := []any{locale}
	clauses := []string{"t.deleted_at IS NULL"}
	n := 2
	if f.Type != "" {
		clauses = append(clauses, fmt.Sprintf("t.type = $%d", n))
		args = append(args, f.Type)
		n++
	}
	if f.ParentID != nil {
		clauses = append(clauses, fmt.Sprintf("t.parent_id = $%d", n))
		args = append(args, *f.ParentID)
		n++
	} else if f.Type == "warehouse" {
		clauses = append(clauses, "t.parent_id IS NULL")
	}
	if f.RootID != nil {
		clauses = append(clauses, fmt.Sprintf("t.tree_path <@ (SELECT tree_path FROM warehouse_list WHERE id = $%d AND deleted_at IS NULL)", n))
		args = append(args, *f.RootID)
		n++
	}
	if f.IsActive != nil {
		clauses = append(clauses, fmt.Sprintf("t.is_active = $%d", n))
		args = append(args, *f.IsActive)
		n++
	}
	if f.Search != "" {
		clauses = append(clauses, fmt.Sprintf("(l.name ILIKE $%d OR t.sku ILIKE $%d)", n, n))
		args = append(args, "%"+f.Search+"%")
		n++
	}
	where := strings.Join(clauses, " AND ")

	var total int
	countQ := `SELECT COUNT(*) FROM warehouse_list t
LEFT JOIN warehouse_list_language l ON l.warehouse_list_id = t.id AND l.locale = $1
WHERE ` + where
	if err := r.db.QueryRowContext(ctx, countQ, args...).Scan(&total); err != nil {
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

	q := fmt.Sprintf(`SELECT t.id, t.type, t.sku, t.parent_id, t.sort_order, t.capacity, t.is_active, COALESCE(l.name, ''), t.updated_at
FROM warehouse_list t
LEFT JOIN warehouse_list_language l ON l.warehouse_list_id = t.id AND l.locale = $1
WHERE %s ORDER BY t.sort_order ASC, t.id ASC LIMIT $%d OFFSET $%d`, where, n, n+1)
	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var out []Row
	for rows.Next() {
		var row Row
		if err := rows.Scan(&row.ID, &row.Type, &row.SKU, &row.ParentID, &row.SortOrder, &row.Capacity, &row.IsActive, &row.Name, &row.UpdatedAt); err != nil {
			return nil, 0, err
		}
		out = append(out, row)
	}
	return out, total, rows.Err()
}

func (r *Repository) Get(ctx context.Context, id int64, locale string) (*Row, error) {
	if locale == "" {
		locale = "th"
	}
	q := `SELECT t.id, t.type, t.sku, t.parent_id, t.sort_order, t.capacity, t.is_active,
COALESCE(l.name, ''), t.updated_at, t.barcode, t.qrcode, t.rfid
FROM warehouse_list t
LEFT JOIN warehouse_list_language l ON l.warehouse_list_id = t.id AND l.locale = $2
WHERE t.id = $1 AND t.deleted_at IS NULL`
	var row Row
	err := r.db.QueryRowContext(ctx, q, id, locale).Scan(
		&row.ID, &row.Type, &row.SKU, &row.ParentID, &row.SortOrder, &row.Capacity, &row.IsActive,
		&row.Name, &row.UpdatedAt, &row.Barcode, &row.QRCode, &row.RFID,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	names, err := r.loadNames(ctx, id)
	if err != nil {
		return nil, err
	}
	row.Names = names
	return &row, nil
}

func (r *Repository) LoadConditions(ctx context.Context, zoneID int64) ([]ConditionRow, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT type, amount, amount_active FROM warehouse_condition WHERE warehouse_list_id = $1 ORDER BY type`, zoneID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []ConditionRow
	for rows.Next() {
		var c ConditionRow
		if err := rows.Scan(&c.Type, &c.Amount, &c.AmountActive); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (r *Repository) Stats(ctx context.Context, warehouseID int64) (*Stats, error) {
	var rootType string
	err := r.db.QueryRowContext(ctx,
		`SELECT type FROM warehouse_list WHERE id = $1 AND deleted_at IS NULL`, warehouseID).Scan(&rootType)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if rootType != "warehouse" {
		return nil, ErrValidation
	}
	var st Stats
	err = r.db.QueryRowContext(ctx, `
SELECT
  (SELECT COUNT(*) FROM warehouse_list z WHERE z.parent_id = $1 AND z.type = 'zone' AND z.deleted_at IS NULL),
  COALESCE((
    SELECT COUNT(DISTINCT piw.product_item_id)
    FROM warehouse_list bin
    JOIN product_item_warehouse piw ON piw.bin_id = bin.id AND piw.deleted_at IS NULL
    WHERE bin.type = 'bin' AND bin.deleted_at IS NULL
      AND bin.tree_path <@ (SELECT tree_path FROM warehouse_list WHERE id = $1)
  ), 0),
  COALESCE((
    SELECT SUM(s.remain_quantity)
    FROM warehouse_list bin
    JOIN product_item_warehouse piw ON piw.bin_id = bin.id AND piw.deleted_at IS NULL
    JOIN product_item_stock s ON s.product_item_warehouse_id = piw.id AND s.deleted_at IS NULL
    WHERE bin.type = 'bin' AND bin.deleted_at IS NULL
      AND bin.tree_path <@ (SELECT tree_path FROM warehouse_list WHERE id = $1)
  ), 0)`, warehouseID).Scan(&st.ZoneCount, &st.SKUCount, &st.RemainQty)
	if err != nil {
		return nil, err
	}
	return &st, nil
}

func (r *Repository) Tree(ctx context.Context, warehouseID int64, locale string) ([]TreeNode, error) {
	if locale == "" {
		locale = "th"
	}
	var rootPath string
	var rootType string
	err := r.db.QueryRowContext(ctx,
		`SELECT tree_path::text, type FROM warehouse_list WHERE id = $1 AND deleted_at IS NULL`, warehouseID).
		Scan(&rootPath, &rootType)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if rootType != "warehouse" {
		return nil, ErrValidation
	}

	q := `SELECT t.id, t.type, t.sku, t.parent_id, t.sort_order, t.capacity, t.is_active, COALESCE(l.name, '')
FROM warehouse_list t
LEFT JOIN warehouse_list_language l ON l.warehouse_list_id = t.id AND l.locale = $2
WHERE t.deleted_at IS NULL AND t.id != $1 AND t.tree_path <@ $3::ltree
ORDER BY t.sort_order ASC, t.id ASC`
	rows, err := r.db.QueryContext(ctx, q, warehouseID, locale, rootPath)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var flats []flatNode
	for rows.Next() {
		var f flatNode
		if err := rows.Scan(&f.id, &f.typ, &f.sku, &f.parent, &f.sort, &f.cap, &f.active, &f.name); err != nil {
			return nil, err
		}
		flats = append(flats, f)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	binUsed, err := r.binRemainByID(ctx, warehouseID)
	if err != nil {
		return nil, err
	}

	out := make([]TreeNode, 0, len(flats))
	for _, f := range flats {
		tn := TreeNode{
			ID: f.id, Type: f.typ, SKU: f.sku, ParentID: f.parent,
			SortOrder: f.sort, Capacity: f.cap, IsActive: f.active, Name: f.name,
			ChildCounts: map[string]int{},
		}
		if f.typ == "zone" {
			conds, err := r.LoadConditions(ctx, f.id)
			if err != nil {
				return nil, err
			}
			tn.Conditions = conds
		}
		used := nodeUsed(f.id, f.typ, flats, binUsed)
		tn.Used = used
		if f.cap > 0 {
			tn.CapacityPct = int(min(100, (used/float64(f.cap))*100))
		} else if used > 0 {
			tn.CapacityPct = 100
		}
		for _, c := range allowedChildTypes(f.typ) {
			cnt := 0
			for _, ch := range flats {
				if ch.parent != nil && *ch.parent == f.id && ch.typ == c {
					cnt++
				}
			}
			if cnt > 0 {
				tn.ChildCounts[c] = cnt
			}
		}
		out = append(out, tn)
	}
	return out, nil
}

func nodeUsed(id int64, typ string, flats []flatNode, binUsed map[int64]float64) float64 {
	if typ == "bin" {
		return binUsed[id]
	}
	allowed := allowedChildTypes(typ)
	var used float64
	for _, ch := range flats {
		if ch.parent != nil && *ch.parent == id {
			for _, t := range allowed {
				if ch.typ == t {
					used++
					break
				}
			}
		}
	}
	return used
}

func (r *Repository) binRemainByID(ctx context.Context, warehouseID int64) (map[int64]float64, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT bin.id, COALESCE(SUM(s.remain_quantity), 0)
FROM warehouse_list bin
LEFT JOIN product_item_warehouse piw ON piw.bin_id = bin.id AND piw.deleted_at IS NULL
LEFT JOIN product_item_stock s ON s.product_item_warehouse_id = piw.id AND s.deleted_at IS NULL
WHERE bin.type = 'bin' AND bin.deleted_at IS NULL
  AND bin.tree_path <@ (SELECT tree_path FROM warehouse_list WHERE id = $1)
GROUP BY bin.id`, warehouseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[int64]float64{}
	for rows.Next() {
		var id int64
		var qty float64
		if err := rows.Scan(&id, &qty); err != nil {
			return nil, err
		}
		out[id] = qty
	}
	return out, rows.Err()
}

func (r *Repository) Create(ctx context.Context, in CreateInput) (int64, error) {
	if err := validateNames(in.Names); err != nil {
		return 0, err
	}
	if strings.TrimSpace(in.SKU) == "" {
		return 0, ErrValidation
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	if in.ParentID != nil {
		var pType string
		if err := tx.QueryRowContext(ctx,
			`SELECT type FROM warehouse_list WHERE id = $1 AND deleted_at IS NULL`, *in.ParentID).Scan(&pType); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return 0, ErrValidation
			}
			return 0, err
		}
		if !validParent(in.Type, pType) {
			return 0, ErrValidation
		}
		if err := r.checkZoneQuotaCreate(ctx, tx, in, pType); err != nil {
			return 0, err
		}
	} else if in.Type != "warehouse" {
		return 0, ErrValidation
	}

	var maxSort int
	parentClause := "parent_id IS NULL"
	args := []any{}
	if in.ParentID != nil {
		parentClause = "parent_id = $1"
		args = append(args, *in.ParentID)
	}
	qMax := fmt.Sprintf(`SELECT COALESCE(MAX(sort_order), 0) FROM warehouse_list WHERE deleted_at IS NULL AND %s`, parentClause)
	if err := tx.QueryRowContext(ctx, qMax, args...).Scan(&maxSort); err != nil {
		return 0, err
	}

	var id int64
	act := nullActor(in.ActorID)
	cap := in.Capacity
	err = tx.QueryRowContext(ctx, `
INSERT INTO warehouse_list (type, sku, parent_id, tree_path, sort_order, capacity, is_active, created_by, updated_by)
VALUES ($1, $2, $3, 'n0'::ltree, $4, $5, $6, $7, $7) RETURNING id`,
		in.Type, strings.TrimSpace(in.SKU), in.ParentID, maxSort+100, cap, in.IsActive, act).Scan(&id)
	if err != nil {
		if isUniqueViolation(err) {
			return 0, ErrConflict
		}
		return 0, err
	}
	path := fmt.Sprintf("n%d", id)
	if in.ParentID != nil {
		var parentPath string
		if err := tx.QueryRowContext(ctx,
			`SELECT tree_path::text FROM warehouse_list WHERE id = $1`, *in.ParentID).Scan(&parentPath); err != nil {
			return 0, err
		}
		path = parentPath + ".n" + fmt.Sprintf("%d", id)
	}
	if _, err := tx.ExecContext(ctx,
		`UPDATE warehouse_list SET tree_path = $2::ltree WHERE id = $1`, id, path); err != nil {
		return 0, err
	}
	if err := upsertNames(ctx, tx, id, in.Names); err != nil {
		return 0, err
	}
	if in.Type == "zone" {
		for _, ct := range conditionTypes() {
			if _, err := tx.ExecContext(ctx,
				`INSERT INTO warehouse_condition (warehouse_list_id, type, amount, amount_active) VALUES ($1, $2, 0, 0) ON CONFLICT DO NOTHING`,
				id, ct); err != nil {
				return 0, err
			}
		}
		if in.Conditions != nil {
			if err := applyConditionsPatch(ctx, tx, id, *in.Conditions); err != nil {
				return 0, err
			}
			if _, err := tx.ExecContext(ctx,
				`UPDATE warehouse_list SET updated_at = NOW(), updated_by = $2 WHERE id = $1`, id, act); err != nil {
				return 0, err
			}
		}
	}
	return id, tx.Commit()
}

func (r *Repository) checkZoneQuotaCreate(ctx context.Context, tx *sql.Tx, in CreateInput, parentType string) error {
	if in.Type == "warehouse" || in.Type == "zone" {
		return nil
	}
	zoneID, err := r.ancestorZoneID(ctx, tx, *in.ParentID)
	if err != nil || zoneID == 0 {
		return nil
	}
	return r.checkZoneQuota(ctx, tx, zoneID, in.Type, in.IsActive, 1)
}

func (r *Repository) ancestorZoneID(ctx context.Context, tx *sql.Tx, nodeID int64) (int64, error) {
	var id int64
	var typ string
	var parent sql.NullInt64
	err := tx.QueryRowContext(ctx,
		`SELECT id, type, parent_id FROM warehouse_list WHERE id = $1 AND deleted_at IS NULL`, nodeID).
		Scan(&id, &typ, &parent)
	if err != nil {
		return 0, err
	}
	if typ == "zone" {
		return id, nil
	}
	if !parent.Valid {
		return 0, nil
	}
	return r.ancestorZoneID(ctx, tx, parent.Int64)
}

func (r *Repository) Update(ctx context.Context, id int64, p Patch) error {
	row, err := r.Get(ctx, id, "th")
	if err != nil {
		return err
	}
	if row == nil {
		return ErrNotFound
	}
	if p.Names != nil {
		if err := validateNames(p.Names); err != nil {
			return ErrValidation
		}
	}
	if p.IsActive != nil && *p.IsActive && !row.IsActive {
		if err := r.checkActiveQuota(ctx, id, row.Type); err != nil {
			return err
		}
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	act := nullActor(p.ActorID)

	sets := []string{"updated_at = NOW()", "updated_by = $2"}
	args := []any{id, act}
	n := 3
	if p.IsActive != nil {
		sets = append(sets, fmt.Sprintf("is_active = $%d", n))
		args = append(args, *p.IsActive)
		n++
	}
	if p.SKU != nil {
		sets = append(sets, fmt.Sprintf("sku = $%d", n))
		args = append(args, strings.TrimSpace(*p.SKU))
		n++
	}
	if p.Capacity != nil {
		sets = append(sets, fmt.Sprintf("capacity = $%d", n))
		args = append(args, *p.Capacity)
		n++
	}
	if p.Barcode != nil {
		sets = append(sets, fmt.Sprintf("barcode = $%d", n))
		args = append(args, nullStr(p.Barcode))
		n++
	}
	if p.QRCode != nil {
		sets = append(sets, fmt.Sprintf("qrcode = $%d", n))
		args = append(args, nullStr(p.QRCode))
		n++
	}
	if p.RFID != nil {
		sets = append(sets, fmt.Sprintf("rfid = $%d", n))
		args = append(args, nullStr(p.RFID))
		n++
	}
	q := fmt.Sprintf(`UPDATE warehouse_list SET %s WHERE id = $1 AND deleted_at IS NULL`, strings.Join(sets, ", "))
	if _, err := tx.ExecContext(ctx, q, args...); err != nil {
		if isUniqueViolation(err) {
			return ErrConflict
		}
		return err
	}
	if p.Names != nil {
		if err := upsertNames(ctx, tx, id, p.Names); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (r *Repository) checkActiveQuota(ctx context.Context, nodeID int64, nodeType string) error {
	if nodeType == "warehouse" || nodeType == "zone" {
		return nil
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var parentID sql.NullInt64
	if err := tx.QueryRowContext(ctx,
		`SELECT parent_id FROM warehouse_list WHERE id = $1`, nodeID).Scan(&parentID); err != nil {
		return err
	}
	if !parentID.Valid {
		return nil
	}
	zoneID, err := r.ancestorZoneID(ctx, tx, parentID.Int64)
	if err != nil || zoneID == 0 {
		return nil
	}
	if err := r.checkZoneQuota(ctx, tx, zoneID, nodeType, true, 1); err != nil {
		return err
	}
	return tx.Commit()
}

type conditionExec interface {
	ExecContext(context.Context, string, ...any) (sql.Result, error)
}

func applyConditionsPatch(ctx context.Context, exec conditionExec, zoneID int64, cp ConditionsPatch) error {
	upsert := func(t string, ca *conditionAmounts) error {
		if ca == nil {
			return nil
		}
		active := ca.AmountActive
		if active > ca.Amount {
			active = ca.Amount
		}
		_, err := exec.ExecContext(ctx, `
INSERT INTO warehouse_condition (warehouse_list_id, type, amount, amount_active)
VALUES ($1, $2, $3, $4)
ON CONFLICT (warehouse_list_id, type) DO UPDATE SET amount = EXCLUDED.amount, amount_active = EXCLUDED.amount_active`,
			zoneID, t, ca.Amount, active)
		return err
	}
	if err := upsert("shelf", cp.Shelf); err != nil {
		return err
	}
	if err := upsert("rack", cp.Rack); err != nil {
		return err
	}
	return upsert("bin", cp.Bin)
}

func (r *Repository) PatchConditions(ctx context.Context, zoneID int64, cp ConditionsPatch, actorID int64) error {
	var typ string
	if err := r.db.QueryRowContext(ctx,
		`SELECT type FROM warehouse_list WHERE id = $1 AND deleted_at IS NULL`, zoneID).Scan(&typ); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	if typ != "zone" {
		return ErrValidation
	}
	if err := applyConditionsPatch(ctx, r.db, zoneID, cp); err != nil {
		return err
	}
	_, err := r.db.ExecContext(ctx,
		`UPDATE warehouse_list SET updated_at = NOW(), updated_by = $2 WHERE id = $1`, zoneID, nullActor(actorID))
	return err
}

func (r *Repository) SoftDelete(ctx context.Context, id int64, actorID int64) error {
	if err := r.checkDeleteStock(ctx, id); err != nil {
		return err
	}
	all, err := r.loadAllNodes(ctx)
	if err != nil {
		return err
	}
	ids := subtreeIDs(all, id)
	if len(ids) == 0 {
		return ErrNotFound
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	act := nullActor(actorID)
	for _, nid := range ids {
		if _, err := tx.ExecContext(ctx,
			`UPDATE warehouse_list SET deleted_at = NOW(), updated_at = NOW(), updated_by = $2 WHERE id = $1`, nid, act); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (r *Repository) checkDeleteStock(ctx context.Context, id int64) error {
	var hasStock bool
	err := r.db.QueryRowContext(ctx, `
SELECT EXISTS (
  SELECT 1 FROM warehouse_list bin
  JOIN product_item_warehouse piw ON piw.bin_id = bin.id AND piw.deleted_at IS NULL
  JOIN product_item_stock s ON s.product_item_warehouse_id = piw.id AND s.deleted_at IS NULL AND s.remain_quantity > 0
  WHERE bin.deleted_at IS NULL AND bin.type = 'bin'
    AND (bin.id = $1 OR bin.tree_path <@ (SELECT tree_path FROM warehouse_list WHERE id = $1))
)`, id).Scan(&hasStock)
	if err != nil {
		return err
	}
	if hasStock {
		return ErrConflict
	}
	return nil
}

func (r *Repository) Reorder(ctx context.Context, dragID, targetID int64, actorID int64) error {
	var dragParent, targetParent sql.NullInt64
	if err := r.db.QueryRowContext(ctx,
		`SELECT parent_id FROM warehouse_list WHERE id = $1 AND deleted_at IS NULL`, dragID).Scan(&dragParent); err != nil {
		return ErrInvalidReorder
	}
	if err := r.db.QueryRowContext(ctx,
		`SELECT parent_id FROM warehouse_list WHERE id = $1 AND deleted_at IS NULL`, targetID).Scan(&targetParent); err != nil {
		return ErrInvalidReorder
	}
	if dragParent != targetParent {
		return ErrInvalidReorder
	}
	var parentID *int64
	if dragParent.Valid {
		parentID = &dragParent.Int64
	}
	nodes, err := r.siblingNodes(ctx, parentID)
	if err != nil {
		return err
	}
	next, err := tree.ReorderSiblings(nodes, dragID, targetID)
	if err != nil {
		return ErrInvalidReorder
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
	act := nullActor(actorID)
	for id, so := range orderByID {
		if _, err := tx.ExecContext(ctx,
			`UPDATE warehouse_list SET sort_order = $2, updated_at = NOW(), updated_by = $3 WHERE id = $1`, id, so, act); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (r *Repository) Move(ctx context.Context, dragID, targetID int64, zone string, actorID int64) error {
	allWH, err := r.loadAllWHNodes(ctx)
	if err != nil {
		return err
	}
	all := make([]tree.Node, len(allWH))
	typeByID := map[int64]whNode{}
	for i, n := range allWH {
		all[i] = n.Node
		typeByID[n.ID] = n
	}
	dragWH, ok := typeByID[dragID]
	if !ok {
		return ErrValidation
	}
	if _, ok := typeByID[targetID]; !ok || dragID == targetID {
		return ErrValidation
	}
	if dragWH.Type == "zone" || dragWH.Type == "warehouse" {
		return ErrValidation
	}
	oldParent := dragWH.ParentID
	next, err := tree.ApplyDrop(all, dragID, targetID, zone)
	if err != nil {
		return ErrValidation
	}
	updated := tree.Find(next, dragID)
	if updated == nil || updated.ParentID == nil {
		return ErrValidation
	}
	parentWH, ok := typeByID[*updated.ParentID]
	if !ok {
		// parent may be unchanged id from next slice — reload type from DB
		parentRow, err := r.Get(ctx, *updated.ParentID, "th")
		if err != nil || parentRow == nil {
			return ErrValidation
		}
		if !validParent(dragWH.Type, parentRow.Type) {
			return ErrValidation
		}
	} else if !validParent(dragWH.Type, parentWH.Type) {
		return ErrValidation
	}
	zoneID, _ := r.ancestorZoneIDCtx(ctx, *updated.ParentID)
	if zoneID > 0 && oldParent != nil {
		oldZone, _ := r.ancestorZoneIDCtx(ctx, *oldParent)
		if oldZone != zoneID {
			if err := r.checkZoneQuotaMove(ctx, zoneID, dragWH.Type, dragWH.IsActive); err != nil {
				return err
			}
		}
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	act := nullActor(actorID)
	for _, row := range next {
		var parent any
		if row.ParentID != nil {
			parent = *row.ParentID
		}
		if _, err := tx.ExecContext(ctx, `
UPDATE warehouse_list SET parent_id = $2, sort_order = $3, tree_path = $4::ltree, updated_at = NOW(), updated_by = $5
WHERE id = $1`, row.ID, parent, row.SortOrder, row.TreePath, act); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (r *Repository) ancestorZoneIDCtx(ctx context.Context, nodeID int64) (int64, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()
	return r.ancestorZoneID(ctx, tx, nodeID)
}

func (r *Repository) checkZoneQuotaMove(ctx context.Context, zoneID int64, childType string, isActive bool) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	return r.checkZoneQuota(ctx, tx, zoneID, childType, isActive, 1)
}

func (r *Repository) checkZoneQuota(ctx context.Context, tx *sql.Tx, zoneID int64, childType string, isActive bool, add int) error {
	var amount, amountActive int
	err := tx.QueryRowContext(ctx,
		`SELECT amount, amount_active FROM warehouse_condition WHERE warehouse_list_id = $1 AND type = $2`,
		zoneID, childType).Scan(&amount, &amountActive)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrZoneQuota
		}
		return err
	}
	var total, active int
	if err := tx.QueryRowContext(ctx, `
SELECT COUNT(*), COUNT(*) FILTER (WHERE is_active)
FROM warehouse_list
WHERE deleted_at IS NULL AND type = $2
  AND tree_path <@ (SELECT tree_path FROM warehouse_list WHERE id = $1)
  AND id != $1`, zoneID, childType).Scan(&total, &active); err != nil {
		return err
	}
	if total+add > amount {
		return ErrZoneQuota
	}
	if isActive && active+add > amountActive {
		return ErrZoneQuota
	}
	return nil
}

func (r *Repository) loadAllNodes(ctx context.Context) ([]tree.Node, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, parent_id, sort_order, tree_path::text FROM warehouse_list WHERE deleted_at IS NULL`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []tree.Node
	for rows.Next() {
		var n tree.Node
		var parent sql.NullInt64
		if err := rows.Scan(&n.ID, &parent, &n.SortOrder, &n.TreePath); err != nil {
			return nil, err
		}
		if parent.Valid {
			n.ParentID = &parent.Int64
		}
		out = append(out, n)
	}
	return out, rows.Err()
}

type whNode struct {
	tree.Node
	Type     string
	IsActive bool
}

func (r *Repository) loadAllWHNodes(ctx context.Context) ([]whNode, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, parent_id, sort_order, tree_path::text, type, is_active FROM warehouse_list WHERE deleted_at IS NULL`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []whNode
	for rows.Next() {
		var n whNode
		var parent sql.NullInt64
		if err := rows.Scan(&n.ID, &parent, &n.SortOrder, &n.TreePath, &n.Type, &n.IsActive); err != nil {
			return nil, err
		}
		if parent.Valid {
			n.ParentID = &parent.Int64
		}
		out = append(out, n)
	}
	return out, rows.Err()
}

func findNode(nodes []tree.Node, id int64) *tree.Node {
	return tree.Find(nodes, id)
}

func subtreeIDs(all []tree.Node, rootID int64) []int64 {
	root := tree.Find(all, rootID)
	if root == nil {
		return nil
	}
	prefix := root.TreePath + "."
	var ids []int64
	for _, n := range all {
		if n.ID == rootID || strings.HasPrefix(n.TreePath, prefix) {
			ids = append(ids, n.ID)
		}
	}
	return ids
}

func (r *Repository) siblingNodes(ctx context.Context, parentID *int64) ([]tree.Node, error) {
	var rows *sql.Rows
	var err error
	if parentID == nil {
		rows, err = r.db.QueryContext(ctx,
			`SELECT id, parent_id, sort_order, tree_path::text FROM warehouse_list WHERE deleted_at IS NULL AND parent_id IS NULL`)
	} else {
		rows, err = r.db.QueryContext(ctx,
			`SELECT id, parent_id, sort_order, tree_path::text FROM warehouse_list WHERE deleted_at IS NULL AND parent_id = $1`, *parentID)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []tree.Node
	for rows.Next() {
		var n tree.Node
		var parent sql.NullInt64
		if err := rows.Scan(&n.ID, &parent, &n.SortOrder, &n.TreePath); err != nil {
			return nil, err
		}
		if parent.Valid {
			n.ParentID = &parent.Int64
		}
		out = append(out, n)
	}
	return out, rows.Err()
}

func (r *Repository) loadNames(ctx context.Context, id int64) (map[string]string, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT locale, name FROM warehouse_list_language WHERE warehouse_list_id = $1`, id)
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

func upsertNames(ctx context.Context, tx *sql.Tx, id int64, names map[string]string) error {
	for _, locale := range []string{"th", "en"} {
		name := strings.TrimSpace(names[locale])
		_, err := tx.ExecContext(ctx, `
INSERT INTO warehouse_list_language (warehouse_list_id, locale, name)
VALUES ($1, $2, $3)
ON CONFLICT (warehouse_list_id, locale) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()`,
			id, locale, name)
		if err != nil {
			return err
		}
	}
	return nil
}

func validateNames(names map[string]string) error {
	if strings.TrimSpace(names["th"]) == "" || strings.TrimSpace(names["en"]) == "" {
		return ErrValidation
	}
	return nil
}

func nullActor(id int64) sql.NullInt64 {
	if id <= 0 {
		return sql.NullInt64{}
	}
	return sql.NullInt64{Int64: id, Valid: true}
}

func nullStr(p *string) sql.NullString {
	if p == nil {
		return sql.NullString{}
	}
	s := strings.TrimSpace(*p)
	if s == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: s, Valid: true}
}

func isUniqueViolation(err error) bool {
	return err != nil && strings.Contains(err.Error(), "unique")
}
