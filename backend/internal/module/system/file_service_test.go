package system

import (
	"context"
	"errors"
	"io"
	"strings"
	"testing"

	"github.com/lMikadal/warehouse/backend/internal/config"
)

type fakeStore struct {
	keys []string
}

func (f *fakeStore) Put(_ context.Context, objectKey, _ string, _ int64, _ io.Reader) error {
	f.keys = append(f.keys, objectKey)
	return nil
}

func (f *fakeStore) Remove(_ context.Context, objectKey string) error {
	return nil
}

func TestFileServiceUploadValidation(t *testing.T) {
	store := &fakeStore{}
	svc := NewFileService(nil, store, config.Config{S3Bucket: "b", S3PublicBaseURL: "http://localhost:9002"})

	_, err := svc.Upload(context.Background(), "bad", "x.png", "image/png", 100, strings.NewReader("x"), 1)
	if !errors.Is(err, ErrValidation) {
		t.Fatalf("expected validation error, got %v", err)
	}

	_, err = svc.Upload(context.Background(), "setting_bank_logo", "x.png", "application/pdf", 100, strings.NewReader("x"), 1)
	if err == nil {
		t.Fatal("expected validation for content type")
	}

	_, err = svc.Upload(context.Background(), "setting_bank_logo", "x.png", "image/png", maxUploadBytes+1, strings.NewReader("x"), 1)
	if err == nil {
		t.Fatal("expected validation for size")
	}

	allowed, maxDoc := uploadTypeAndMaxBytes("member_document")
	if _, ok := allowed["application/pdf"]; !ok {
		t.Fatal("member_document must allow PDF")
	}
	if maxDoc != maxDocumentUploadBytes {
		t.Fatalf("member_document max bytes = %d, want %d", maxDoc, maxDocumentUploadBytes)
	}
}

func TestDeleteIfUnreferencedSkipsZeroID(t *testing.T) {
	svc := NewFileService(nil, &fakeStore{}, config.Config{})
	if err := svc.DeleteIfUnreferenced(context.Background(), 0, 1); err != nil {
		t.Fatalf("expected nil, got %v", err)
	}
}
