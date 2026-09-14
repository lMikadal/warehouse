package log

import (
	"io"
	"log/slog"
	"os"
	"strings"

	"github.com/lMikadal/warehouse/backend/internal/config"
)

// Setup configures the default logger from app config (text in dev, JSON in production).
func Setup(cfg config.Config) *slog.Logger {
	level := parseLevel(cfg.LogLevel)
	opts := &slog.HandlerOptions{Level: level}
	var h slog.Handler
	if isProduction(cfg.AppEnv) {
		h = slog.NewJSONHandler(os.Stdout, opts)
	} else {
		h = slog.NewTextHandler(os.Stdout, opts)
	}
	l := slog.New(h)
	slog.SetDefault(l)
	return l
}

// NewTestLogger returns a logger writing to w (for unit tests).
func NewTestLogger(w io.Writer, level slog.Level, json bool) *slog.Logger {
	opts := &slog.HandlerOptions{Level: level}
	var h slog.Handler
	if json {
		h = slog.NewJSONHandler(w, opts)
	} else {
		h = slog.NewTextHandler(w, opts)
	}
	return slog.New(h)
}

func parseLevel(s string) slog.Level {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "debug":
		return slog.LevelDebug
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

func isProduction(appEnv string) bool {
	return strings.EqualFold(strings.TrimSpace(appEnv), "production")
}
