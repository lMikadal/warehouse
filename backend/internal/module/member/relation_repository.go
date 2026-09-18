package member

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"
)

type RelationRow struct {
	ID         int64  `json:"id"`
	CreditID   int64  `json:"credit_id"`
	GroupID    int64  `json:"group_id"`
	BusinessID int64  `json:"business_id"`
	IsActive   bool   `json:"is_active"`
	CreditName string `json:"credit_name,omitempty"`
	GroupName  string `json:"group_name,omitempty"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type RelationRepository struct {
	db *sql.DB
}

func NewRelationRepository(db *sql.DB) *RelationRepository {
	return &RelationRepository{db: db}
}

func (r *RelationRepository) ListByBusiness(ctx context.Context, businessID int64, locale string) ([]RelationRow, error) {
	if locale == "" {
		locale = "th"
	}
	q := `
SELECT r.id, r.credit_id, r.group_id, r.business_id, r.is_active, r.updated_at,
       COALESCE(cl.name, ''), COALESCE(gl.name, '')
FROM member_setting_relation r
LEFT JOIN member_setting_credit_language cl ON cl.member_setting_credit_id = r.credit_id AND cl.locale = $2
LEFT JOIN member_setting_group_language gl ON gl.member_setting_group_id = r.group_id AND gl.locale = $2
WHERE r.business_id = $1 AND r.deleted_at IS NULL
ORDER BY r.id ASC`
	rows, err := r.db.QueryContext(ctx, q, businessID, locale)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []RelationRow
	for rows.Next() {
		var row RelationRow
		if err := rows.Scan(&row.ID, &row.CreditID, &row.GroupID, &row.BusinessID, &row.IsActive, &row.UpdatedAt, &row.CreditName, &row.GroupName); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

func (r *RelationRepository) SyncBusinessRelations(ctx context.Context, businessID int64, creditIDs, groupIDs []int64, actorID int64) error {
	if len(creditIDs) == 0 || len(groupIDs) == 0 {
		return nil
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	act := nullActor(actorID)
	want := map[string]struct{}{}
	for _, cID := range creditIDs {
		for _, gID := range groupIDs {
			if cID <= 0 || gID <= 0 {
				continue
			}
			key := fmt.Sprintf("%d:%d", cID, gID)
			want[key] = struct{}{}
			var existing int64
			err2 := tx.QueryRowContext(ctx, `
SELECT id FROM member_setting_relation
WHERE credit_id = $1 AND group_id = $2 AND business_id = $3 AND deleted_at IS NULL`, cID, gID, businessID).Scan(&existing)
			if errors.Is(err2, sql.ErrNoRows) {
				if _, err := tx.ExecContext(ctx, `
INSERT INTO member_setting_relation (credit_id, group_id, business_id, is_active, created_by, updated_by)
VALUES ($1, $2, $3, TRUE, $4, $4)`, cID, gID, businessID, act); err != nil {
					return err
				}
			} else if err2 != nil {
				return err2
			}
		}
	}
	// soft-delete relations not in cartesian set
	rows, err := tx.QueryContext(ctx, `
SELECT id, credit_id, group_id FROM member_setting_relation
WHERE business_id = $1 AND deleted_at IS NULL`, businessID)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var id, cID, gID int64
		if err := rows.Scan(&id, &cID, &gID); err != nil {
			return err
		}
		key := fmt.Sprintf("%d:%d", cID, gID)
		if _, ok := want[key]; !ok {
			if _, err := tx.ExecContext(ctx, `
UPDATE member_setting_relation SET deleted_at = NOW(), updated_at = NOW(), updated_by = $2 WHERE id = $1`, id, act); err != nil {
				return err
			}
		}
	}
	return tx.Commit()
}

func (r *RelationRepository) Patch(ctx context.Context, id int64, isActive *bool, actorID int64) error {
	if isActive == nil {
		return ErrValidation
	}
	res, err := r.db.ExecContext(ctx, `
UPDATE member_setting_relation SET is_active = $2, updated_at = NOW(), updated_by = $3
WHERE id = $1 AND deleted_at IS NULL`, id, *isActive, nullActor(actorID))
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *RelationRepository) SoftDelete(ctx context.Context, id int64, actorID int64) error {
	var ref int
	err := r.db.QueryRowContext(ctx, `
SELECT 1 FROM setting_sale_channel WHERE member_setting_relation_id = $1 AND deleted_at IS NULL LIMIT 1`, id).Scan(&ref)
	if err == nil {
		return ErrConflict
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return err
	}
	res, err := r.db.ExecContext(ctx, `
UPDATE member_setting_relation SET deleted_at = NOW(), updated_at = NOW(), updated_by = $2 WHERE id = $1 AND deleted_at IS NULL`, id, nullActor(actorID))
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}
