package product

import (
	"context"
	"database/sql"
)

// SettingVatSnapshot is copied from active setting_vat onto transactional rows at save time.
type SettingVatSnapshot struct {
	Rate    float64
	VatType string // exclude | include
}

type vatQueryer interface {
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}

func activeSettingVatSnapshot(ctx context.Context, q vatQueryer) (SettingVatSnapshot, error) {
	var snap SettingVatSnapshot
	snap.VatType = "exclude"
	var rate sql.NullFloat64
	var vatType sql.NullString
	err := q.QueryRowContext(ctx, `
SELECT rate, vat_type::text
FROM setting_vat
WHERE deleted_at IS NULL AND is_active = TRUE
ORDER BY id ASC
LIMIT 1`).Scan(&rate, &vatType)
	if err == sql.ErrNoRows {
		return snap, nil
	}
	if err != nil {
		return snap, err
	}
	if rate.Valid {
		snap.Rate = rate.Float64
	}
	if vatType.Valid && (vatType.String == "exclude" || vatType.String == "include") {
		snap.VatType = vatType.String
	}
	return snap, nil
}
