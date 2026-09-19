package api

import (
	"strconv"
	"strings"

	"github.com/labstack/echo/v5"
)

const (
	DefaultPage  = 1
	DefaultLimit = 10
	MaxLimit     = 100
)

type PageQuery struct {
	Page  int
	Limit int
}

type ListMeta struct {
	Total int64 `json:"total"`
	Page  int   `json:"page"`
	Limit int   `json:"limit"`
}

func ParsePageQuery(c *echo.Context) PageQuery {
	page := intQuery(c, "page", DefaultPage)
	limit := intQuery(c, "limit", DefaultLimit)
	if page < 1 {
		page = DefaultPage
	}
	if limit < 1 {
		limit = DefaultLimit
	}
	if limit > MaxLimit {
		limit = MaxLimit
	}
	return PageQuery{Page: page, Limit: limit}
}

func intQuery(c *echo.Context, key string, def int) int {
	raw := c.QueryParam(key)
	if raw == "" {
		return def
	}
	n, err := strconv.Atoi(raw)
	if err != nil {
		return def
	}
	return n
}

func Offset(p PageQuery) int {
	return (p.Page - 1) * p.Limit
}

// QueryInt64 returns a positive int64 query param when present and valid.
func QueryInt64(c *echo.Context, key string) (int64, bool) {
	v := strings.TrimSpace(c.QueryParam(key))
	if v == "" {
		return 0, false
	}
	id, err := strconv.ParseInt(v, 10, 64)
	if err != nil || id <= 0 {
		return 0, false
	}
	return id, true
}

// QueryOptionalInt64 returns nil when the query param is absent or invalid.
func QueryOptionalInt64(c *echo.Context, key string) *int64 {
	id, ok := QueryInt64(c, key)
	if !ok {
		return nil
	}
	return &id
}
