package system

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

type CodePrefixRepository struct {
	db *sql.DB
}

func NewCodePrefixRepository(db *sql.DB) *CodePrefixRepository {
	return &CodePrefixRepository{db: db}
}

type codePrefixRow struct {
	id          int64
	prefix      string
	resetPeriod string
	formatStyle string
	seqWidth    int16
	timezone    string
	periodKey   string
	lastSeq     int64
}

// NextCode allocates the next document code for codeKey inside tx (FOR UPDATE).
func (r *CodePrefixRepository) NextCode(ctx context.Context, tx *sql.Tx, codeKey string, at time.Time) (string, error) {
	if tx == nil {
		return "", errors.New("code prefix requires transaction")
	}
	row, err := r.lockRow(ctx, tx, codeKey)
	if err != nil {
		return "", err
	}
	loc, err := time.LoadLocation(row.timezone)
	if err != nil {
		loc = time.UTC
	}
	bucket := CodeResetBucket(row.resetPeriod, at, loc)
	periodKey := row.periodKey
	lastSeq := row.lastSeq
	if bucket != periodKey {
		periodKey = bucket
		lastSeq = 0
	}
	lastSeq++
	yyyymm := CodeFormatYYYYMM(row.resetPeriod, periodKey, at, loc)
	code, err := FormatPrefixCode(row.prefix, yyyymm, lastSeq, row.seqWidth, row.formatStyle)
	if err != nil {
		return "", err
	}
	_, err = tx.ExecContext(ctx, `
UPDATE system_code_prefix
SET period_key = $1, last_seq = $2, updated_at = NOW()
WHERE id = $3`, periodKey, lastSeq, row.id)
	if err != nil {
		return "", err
	}
	return code, nil
}

func (r *CodePrefixRepository) lockRow(ctx context.Context, tx *sql.Tx, codeKey string) (*codePrefixRow, error) {
	var row codePrefixRow
	var isActive bool
	err := tx.QueryRowContext(ctx, `
SELECT id, prefix, reset_period::text, format_style::text, seq_width, timezone, period_key, last_seq, is_active
FROM system_code_prefix
WHERE code_key = $1 AND deleted_at IS NULL
FOR UPDATE`, codeKey).Scan(
		&row.id, &row.prefix, &row.resetPeriod, &row.formatStyle, &row.seqWidth,
		&row.timezone, &row.periodKey, &row.lastSeq, &isActive,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrCodePrefixNotFound
	}
	if err != nil {
		return nil, err
	}
	if !isActive {
		return nil, ErrCodePrefixInactive
	}
	return &row, nil
}
