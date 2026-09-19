package system

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"path/filepath"
	"strings"
	"time"

	"github.com/lMikadal/warehouse/backend/internal/config"
	"github.com/lMikadal/warehouse/backend/internal/infra/s3"
)

var ErrValidation = errors.New("validation")

const maxUploadBytes = 5 << 20 // 5MB
const maxDocumentUploadBytes = 10 << 20 // 10MB — member_document, purchase_order_attachment

var allowedImageTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
	"image/gif":  ".gif",
}

var allowedDocumentTypes = map[string]string{
	"application/pdf": ".pdf",
	"image/jpeg":      ".jpg",
	"image/png":       ".png",
}

func uploadTypeAndMaxBytes(purpose string) (allowed map[string]string, maxBytes int64) {
	switch purpose {
	case "member_document", "purchase_order_attachment":
		return allowedDocumentTypes, maxDocumentUploadBytes
	default:
		return allowedImageTypes, maxUploadBytes
	}
}

type FileService struct {
	repo   *FileRepository
	store  s3.ObjectStore
	cfg    config.Config
}

func NewFileService(repo *FileRepository, store s3.ObjectStore, cfg config.Config) *FileService {
	return &FileService{repo: repo, store: store, cfg: cfg}
}

type UploadedFile struct {
	ID           int64     `json:"id"`
	Bucket       string    `json:"bucket"`
	ObjectKey    string    `json:"object_key"`
	ContentType  string    `json:"content_type"`
	SizeBytes    int64     `json:"size_bytes"`
	Purpose      string    `json:"purpose"`
	OriginalName string    `json:"original_name"`
	URL          string    `json:"url"`
	CreatedAt    time.Time `json:"created_at"`
}

func (s *FileService) Upload(ctx context.Context, purpose, originalName, contentType string, size int64, body io.Reader, actorID int64) (*UploadedFile, error) {
	purpose = strings.TrimSpace(purpose)
	if !ValidPurpose(purpose) {
		return nil, ErrValidation
	}
	allowedTypes, maxBytes := uploadTypeAndMaxBytes(purpose)
	ext, ok := allowedTypes[strings.ToLower(strings.TrimSpace(contentType))]
	if !ok {
		return nil, ErrValidation
	}
	if size <= 0 || size > maxBytes {
		return nil, ErrValidation
	}

	objectKey := buildObjectKey(purpose, ext)
	if err := s.store.Put(ctx, objectKey, contentType, size, body); err != nil {
		return nil, err
	}

	id, err := s.repo.Create(ctx, FileCreateInput{
		Bucket:       s.cfg.S3Bucket,
		ObjectKey:    objectKey,
		ContentType:  contentType,
		SizeBytes:    size,
		Purpose:      purpose,
		OriginalName: sanitizeFilename(originalName),
		ActorID:      actorID,
	})
	if err != nil {
		_ = s.store.Remove(ctx, objectKey)
		return nil, err
	}

	row, err := s.repo.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	return rowToUploaded(row, s.cfg), nil
}

func (s *FileService) Get(ctx context.Context, id int64) (*UploadedFile, error) {
	row, err := s.repo.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	return rowToUploaded(row, s.cfg), nil
}

func (s *FileService) Delete(ctx context.Context, id, actorID int64) error {
	row, err := s.repo.Get(ctx, id)
	if err != nil {
		return err
	}
	if err := s.repo.SoftDelete(ctx, id, actorID); err != nil {
		return err
	}
	_ = s.store.Remove(ctx, row.ObjectKey)
	return nil
}

// DeleteIfUnreferenced soft-deletes the file and removes storage when no parent row references it.
func (s *FileService) DeleteIfUnreferenced(ctx context.Context, id, actorID int64) error {
	if id <= 0 {
		return nil
	}
	return s.Delete(ctx, id, actorID)
}

// CleanupOrphans removes unreferenced files older than grace (relative to now).
func (s *FileService) CleanupOrphans(ctx context.Context, grace time.Duration, actorID int64) (int, error) {
	if grace <= 0 {
		grace = time.Hour
	}
	cutoff := time.Now().UTC().Add(-grace)
	ids, err := s.repo.ListUnreferenced(ctx, cutoff)
	if err != nil {
		return 0, err
	}
	var n int
	for _, id := range ids {
		if err := s.DeleteIfUnreferenced(ctx, id, actorID); err != nil {
			if errors.Is(err, ErrFileInUse) {
				continue
			}
			return n, err
		}
		n++
	}
	return n, nil
}

func rowToUploaded(row *FileRow, cfg config.Config) *UploadedFile {
	return &UploadedFile{
		ID:           row.ID,
		Bucket:       row.Bucket,
		ObjectKey:    row.ObjectKey,
		ContentType:  row.ContentType,
		SizeBytes:    row.SizeBytes,
		Purpose:      row.Purpose,
		OriginalName: row.OriginalName,
		URL:          cfg.PublicObjectURL(row.ObjectKey),
		CreatedAt:    row.CreatedAt,
	}
}

func buildObjectKey(purpose, ext string) string {
	now := time.Now().UTC()
	var b [16]byte
	_, _ = rand.Read(b[:])
	hexID := hex.EncodeToString(b[:])
	return fmt.Sprintf("%s/%04d/%02d/%s%s", purpose, now.Year(), int(now.Month()), hexID, ext)
}

func sanitizeFilename(name string) string {
	base := filepath.Base(strings.TrimSpace(name))
	if base == "" || base == "." {
		return "upload"
	}
	return base
}
