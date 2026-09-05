package config

import "github.com/caarlos0/env/v11"

type Config struct {
	Port   string `env:"PORT" envDefault:"1323"`
	AppEnv string `env:"APP_ENV" envDefault:"development"`
}

func Load() (Config, error) {
	var cfg Config
	if err := env.Parse(&cfg); err != nil {
		return Config{}, err
	}
	return cfg, nil
}
