package system

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

var ErrFileNotFound = errors.New("file not found")
var ErrFileInUse = errors.New("file in use")

type FileRow struct {
	ID           int64
	Bucket       string
	ObjectKey    string
	ContentType  string
	SizeBytes    int64
	Purpose      string
	OriginalName string
	CreatedAt    time.Time
}

type FileRepository struct {
	db *sql.DB
}

func NewFileRepository(db *sql.DB) *FileRepository {
	return &FileRepository{db: db}
}

type FileCreateInput struct {
	Bucket       string
	ObjectKey    string
	ContentType  string
	SizeBytes    int64
	Purpose      string
	OriginalName string
	ActorID      int64
}

func (r *FileRepository) Create(ctx context.Context, in FileCreateInput) (int64, error) {
	var id int64
	err := r.db.QueryRowContext(ctx, `
INSERT INTO system_file (bucket, object_key, content_type, size_bytes, purpose, original_name, created_by, updated_by)
VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
RETURNING id`,
		in.Bucket, in.ObjectKey, in.ContentType, in.SizeBytes, in.Purpose, in.OriginalName,
		nullActor(in.ActorID),
	).Scan(&id)
	return id, err
}

func (r *FileRepository) Get(ctx context.Context, id int64) (*FileRow, error) {
	var row FileRow
	err := r.db.QueryRowContext(ctx, `
SELECT id, bucket, object_key, content_type, size_bytes, purpose, original_name, created_at
FROM system_file
WHERE id = $1 AND deleted_at IS NULL`, id).Scan(
		&row.ID, &row.Bucket, &row.ObjectKey, &row.ContentType, &row.SizeBytes,
		&row.Purpose, &row.OriginalName, &row.CreatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrFileNotFound
	}
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func (r *FileRepository) SoftDelete(ctx context.Context, id, actorID int64) error {
	inUse, err := r.IsReferenced(ctx, id)
	if err != nil {
		return err
	}
	if inUse {
		return ErrFileInUse
	}
	res, err := r.db.ExecContext(ctx, `
UPDATE system_file SET deleted_at = NOW(), updated_at = NOW(), updated_by = $2
WHERE id = $1 AND deleted_at IS NULL`, id, nullActor(actorID))
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrFileNotFound
	}
	return nil
}

// fileParentTables lists every table with a system_file_id FK. Extend it when a new one is added;
// both the in-use guard and the cleanup sweep read from here so they can never disagree.
var fileParentTables = []string{
	"setting_bank",
	"setting_sale_channel",
	"member_tier",
	"member_user",
	"member_user_file",
	"product_attribute",
	"product_item_file",
	"order_quotation_file",
	"purchase_request_item_file",
	"purchase_order_file",
	"purchase_order_item_file",
	"purchase_order_item_reject_file",
	"purchase_order_payment",
}

// fileReferencedUnion builds the UNION ALL body matching rows that still point at fileRef.
func fileReferencedUnion(fileRef string) string {
	parts := make([]string, len(fileParentTables))
	for i, t := range fileParentTables {
		parts[i] = fmt.Sprintf("SELECT 1 FROM %s WHERE system_file_id = %s AND deleted_at IS NULL", t, fileRef)
	}
	return strings.Join(parts, "\n  UNION ALL\n  ")
}

// IsReferenced reports whether an active parent row still points at this file.
func (r *FileRepository) IsReferenced(ctx context.Context, fileID int64) (bool, error) {
	q := "SELECT EXISTS (\n  " + fileReferencedUnion("$1") + "\n)"
	var exists bool
	if err := r.db.QueryRowContext(ctx, q, fileID).Scan(&exists); err != nil {
		return false, err
	}
	return exists, nil
}

// ListUnreferenced returns active system_file ids not referenced by any parent row, created before cutoff.
func (r *FileRepository) ListUnreferenced(ctx context.Context, createdBefore time.Time) ([]int64, error) {
	q := `
SELECT sf.id
FROM system_file sf
WHERE sf.deleted_at IS NULL AND sf.created_at < $1
  AND NOT EXISTS (
  ` + fileReferencedUnion("sf.id") + `
)
ORDER BY sf.id`
	rows, err := r.db.QueryContext(ctx, q, createdBefore)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

func nullActor(id int64) sql.NullInt64 {
	if id <= 0 {
		return sql.NullInt64{}
	}
	return sql.NullInt64{Int64: id, Valid: true}
}
