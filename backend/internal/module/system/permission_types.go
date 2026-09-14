package system

import "time"

type PermissionRow struct {
	ID       int64
	Code     string
	Module   string
	Type     string
	Action   string
	Resource string
	Method   string
	IsActive bool
	UpdatedAt time.Time
}

type PermissionListItem struct {
	ID       int64  `json:"id"`
	Code     string `json:"code"`
	Module   string `json:"module"`
	Type     string `json:"type"`
	Action   string `json:"action"`
	Resource string `json:"resource"`
	Method   string `json:"method"`
	IsActive bool   `json:"is_active"`
	UpdatedAt time.Time `json:"updated_at"`
}
