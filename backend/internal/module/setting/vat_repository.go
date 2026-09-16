package setting

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

type VatRow struct {
	ID        int64
	VatType   string
	Rate      float64
	UpdatedAt time.Time
}

type VatRepository struct {
	db *sql.DB
}

func NewVatRepository(db *sql.DB) *VatRepository {
	return &VatRepository{db: db}
}

func (r *VatRepository) GetSingleton(ctx context.Context) (*VatRow, error) {
	var row VatRow
	err := r.db.QueryRowContext(ctx, `
SELECT id, vat_type::text, rate, updated_at FROM setting_vat WHERE deleted_at IS NULL ORDER BY id ASC LIMIT 1`).
		Scan(&row.ID, &row.VatType, &row.Rate, &row.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func (r *VatRepository) Update(ctx context.Context, id int64, vatType *string, rate *float64, actorID int64) error {
	var exists bool
	if err := r.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM setting_vat WHERE id = $1 AND deleted_at IS NULL)`, id).Scan(&exists); err != nil {
		return err
	}
	if !exists {
		return ErrNotFound
	}
	if vatType != nil && *vatType != "exclude" && *vatType != "include" {
		return ErrValidation
	}
	if rate != nil && *rate < 0 {
		return ErrValidation
	}
	if vatType == nil && rate == nil {
		return ErrValidation
	}
	if vatType != nil && rate != nil {
		_, err := r.db.ExecContext(ctx, `
UPDATE setting_vat SET vat_type = $2::setting_vat_type, rate = $3, updated_at = NOW(), updated_by = $4 WHERE id = $1`,
			id, *vatType, *rate, nullActor(actorID))
		return err
	}
	if vatType != nil {
		_, err := r.db.ExecContext(ctx, `
UPDATE setting_vat SET vat_type = $2::setting_vat_type, updated_at = NOW(), updated_by = $3 WHERE id = $1`,
			id, *vatType, nullActor(actorID))
		return err
	}
	_, err := r.db.ExecContext(ctx, `
UPDATE setting_vat SET rate = $2, updated_at = NOW(), updated_by = $3 WHERE id = $1`, id, *rate, nullActor(actorID))
	return err
}
