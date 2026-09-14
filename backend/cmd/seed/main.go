package main

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/lMikadal/warehouse/backend/internal/config"
	"github.com/lMikadal/warehouse/backend/internal/infra/postgres"
	applog "github.com/lMikadal/warehouse/backend/internal/log"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "usage: seed <init|test>")
		os.Exit(2)
	}
	mode := os.Args[1]
	if mode != "init" && mode != "test" {
		fmt.Fprintln(os.Stderr, "usage: seed <init|test>")
		os.Exit(2)
	}

	cfg, err := config.Load()
	if err != nil {
		slog.Error("config", "error", err)
		os.Exit(1)
	}
	applog.Setup(cfg)

	db, err := postgres.Open(cfg.DatabaseURL)
	if err != nil {
		slog.Error("postgres", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	dir := filepath.Join("internal", "infra", "postgres", "seeds", mode)
	if err := runSQLDir(context.Background(), db, dir); err != nil {
		slog.Error("seed failed", "mode", mode, "error", err)
		os.Exit(1)
	}
	slog.Info("seed complete", "mode", mode)
}

func runSQLDir(ctx context.Context, db *sql.DB, dir string) error {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return err
	}
	var files []string
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".sql") {
			continue
		}
		files = append(files, filepath.Join(dir, e.Name()))
	}
	sort.Strings(files)
	for _, f := range files {
		body, err := os.ReadFile(f)
		if err != nil {
			return err
		}
		if _, err := db.ExecContext(ctx, string(body)); err != nil {
			return fmt.Errorf("%s: %w", f, err)
		}
	}
	return nil
}
