package api

import (
	"database/sql"
	"time"
)

type Audit struct {
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt sql.NullTime
	CreatedBy sql.NullInt64
	UpdatedBy sql.NullInt64
}

type LanguageTimestamps struct {
	CreatedAt time.Time
	UpdatedAt time.Time
}
