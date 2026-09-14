package config

import (
	"strings"
	"time"

	"github.com/caarlos0/env/v11"
)

type Config struct {
	Port          string `env:"PORT" envDefault:"1323"`
	AppEnv        string `env:"APP_ENV" envDefault:"development"`
	DatabaseURL   string `env:"DATABASE_URL,required"`
	RedisURL      string `env:"REDIS_URL"`
	DefaultLocale string `env:"DEFAULT_LOCALE" envDefault:"th"`
	LogLevel      string `env:"LOG_LEVEL" envDefault:"info"`
	// AutoMigrate: empty = derive from AppEnv; true/false overrides.
	AutoMigrate string `env:"AUTO_MIGRATE"`
	JWTSecret   string        `env:"JWT_SECRET,required"`
	JWTAccessTTL  time.Duration `env:"JWT_ACCESS_TTL" envDefault:"15m"`
	JWTRefreshTTL time.Duration `env:"JWT_REFRESH_TTL" envDefault:"168h"`
}

func Load() (Config, error) {
	var cfg Config
	if err := env.Parse(&cfg); err != nil {
		return Config{}, err
	}
	return cfg, nil
}

func (c Config) ShouldAutoMigrate() bool {
	switch strings.ToLower(strings.TrimSpace(c.AutoMigrate)) {
	case "true", "1", "yes":
		return true
	case "false", "0", "no":
		return false
	default:
		return c.AppEnv == "development"
	}
}
