package main

import (
	"context"
	"flag"
	"log/slog"
	"os"
	"time"

	"github.com/lMikadal/warehouse/backend/internal/config"
	"github.com/lMikadal/warehouse/backend/internal/infra/postgres"
	"github.com/lMikadal/warehouse/backend/internal/infra/s3"
	applog "github.com/lMikadal/warehouse/backend/internal/log"
	"github.com/lMikadal/warehouse/backend/internal/module/system"
)

func main() {
	grace := flag.Duration("grace", time.Hour, "only delete unreferenced files older than this duration")
	flag.Parse()

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

	store, err := s3.NewMinioStore(cfg)
	if err != nil {
		slog.Error("object storage", "error", err)
		os.Exit(1)
	}

	repo := system.NewFileRepository(db)
	svc := system.NewFileService(repo, store, cfg)
	n, err := svc.CleanupOrphans(context.Background(), *grace, 0)
	if err != nil {
		slog.Error("file cleanup failed", "error", err)
		os.Exit(1)
	}
	slog.Info("file cleanup complete", "removed", n, "grace", grace.String())
}
