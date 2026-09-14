package infra

import (
	"database/sql"

	"github.com/lMikadal/warehouse/backend/internal/config"
	"github.com/lMikadal/warehouse/backend/internal/infra/postgres"
	"github.com/lMikadal/warehouse/backend/internal/infra/redis"
)

type Deps struct {
	DB    *sql.DB
	Redis *redis.Client
}

func NewDeps(cfg config.Config) (Deps, error) {
	db, err := postgres.Open(cfg.DatabaseURL)
	if err != nil {
		return Deps{}, err
	}
	rc, err := redis.New(cfg.RedisURL)
	if err != nil {
		_ = db.Close()
		return Deps{}, err
	}
	return Deps{DB: db, Redis: rc}, nil
}

func (d Deps) Close() {
	if d.DB != nil {
		_ = d.DB.Close()
	}
}
