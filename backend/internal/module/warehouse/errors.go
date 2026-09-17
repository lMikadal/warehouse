package warehouse

import "errors"

var (
	ErrNotFound       = errors.New("not found")
	ErrValidation     = errors.New("validation")
	ErrZoneQuota      = errors.New("zone quota")
	ErrInvalidReorder = errors.New("invalid reorder")
	ErrConflict       = errors.New("conflict")
)
