package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestTryLoadDotEnvFile_setsUnsetKeys(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, ".env")
	if err := os.WriteFile(path, []byte("JWT_SECRET=from-file-min-32-characters-long\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	t.Setenv("JWT_SECRET", "")
	tryLoadDotEnvFile(path)
	if got := os.Getenv("JWT_SECRET"); got != "from-file-min-32-characters-long" {
		t.Fatalf("JWT_SECRET = %q", got)
	}
}

func TestTryLoadDotEnvFile_doesNotOverrideExisting(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, ".env")
	if err := os.WriteFile(path, []byte("JWT_SECRET=from-file-min-32-characters-long\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	t.Setenv("JWT_SECRET", "already-set-min-32-characters-long")
	tryLoadDotEnvFile(path)
	if got := os.Getenv("JWT_SECRET"); got != "already-set-min-32-characters-long" {
		t.Fatalf("JWT_SECRET = %q", got)
	}
}
