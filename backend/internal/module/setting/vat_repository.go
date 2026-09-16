package setting

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

type VatRow struct {
	ID        int64
	VatType   string
	Rate      float64
	IsActive  bool
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
SELECT id, vat_type::text, rate, is_active, updated_at FROM setting_vat WHERE deleted_at IS NULL ORDER BY id ASC LIMIT 1`).
		Scan(&row.ID, &row.VatType, &row.Rate, &row.IsActive, &row.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func (r *VatRepository) Update(ctx context.Context, id int64, vatType *string, rate *float64, isActive *bool, actorID int64) error {
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
	if vatType == nil && rate == nil && isActive == nil {
		return ErrValidation
	}
	sets := []string{"updated_at = NOW()", "updated_by = $2"}
	args := []any{id, nullActor(actorID)}
	n := 3
	if vatType != nil {
		sets = append(sets, fmt.Sprintf("vat_type = $%d::setting_vat_type", n))
		args = append(args, *vatType)
		n++
	}
	if rate != nil {
		sets = append(sets, fmt.Sprintf("rate = $%d", n))
		args = append(args, *rate)
		n++
	}
	if isActive != nil {
		sets = append(sets, fmt.Sprintf("is_active = $%d", n))
		args = append(args, *isActive)
		n++
	}
	_, err := r.db.ExecContext(ctx, "UPDATE setting_vat SET "+strings.Join(sets, ", ")+" WHERE id = $1 AND deleted_at IS NULL", args...)
	return err
}
