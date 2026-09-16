package s3

import (
	"context"
	"fmt"
	"io"
	"strings"

	"github.com/lMikadal/warehouse/backend/internal/config"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

// ObjectStore uploads and removes blobs in S3-compatible storage.
type ObjectStore interface {
	Put(ctx context.Context, objectKey, contentType string, size int64, body io.Reader) error
	Remove(ctx context.Context, objectKey string) error
}

type MinioStore struct {
	client *minio.Client
	bucket string
}

func NewMinioStore(cfg config.Config) (*MinioStore, error) {
	endpoint := strings.TrimPrefix(strings.TrimPrefix(cfg.S3Endpoint, "https://"), "http://")
	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.S3AccessKey, cfg.S3SecretKey, ""),
		Secure: cfg.S3UseSSL,
		Region: cfg.S3Region,
	})
	if err != nil {
		return nil, fmt.Errorf("minio client: %w", err)
	}
	return &MinioStore{client: client, bucket: cfg.S3Bucket}, nil
}

func (s *MinioStore) Put(ctx context.Context, objectKey, contentType string, size int64, body io.Reader) error {
	_, err := s.client.PutObject(ctx, s.bucket, objectKey, body, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	return err
}

func (s *MinioStore) Remove(ctx context.Context, objectKey string) error {
	return s.client.RemoveObject(ctx, s.bucket, objectKey, minio.RemoveObjectOptions{})
}
