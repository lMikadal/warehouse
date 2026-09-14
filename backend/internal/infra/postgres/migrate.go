package postgres

import (
	"context"
	"database/sql"
	"log/slog"

	"github.com/pressly/goose/v3"
)

const MigrationsDir = "internal/infra/postgres/migrations"

func MigrateUp(ctx context.Context, db *sql.DB) error {
	if err := goose.SetDialect("postgres"); err != nil {
		return err
	}
	slog.Info("running database migrations", "dir", MigrationsDir)
	if err := goose.UpContext(ctx, db, MigrationsDir); err != nil {
		return err
	}
	slog.Info("database migrations complete")
	return nil
}
