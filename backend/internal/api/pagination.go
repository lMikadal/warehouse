package api

import (
	"strconv"

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
