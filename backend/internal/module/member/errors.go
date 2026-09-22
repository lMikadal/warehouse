package member

import "errors"

var (
	ErrNotFound       = errors.New("not found")
	ErrValidation     = errors.New("validation")
	ErrInvalidReorder = errors.New("invalid reorder")
	ErrConflict       = errors.New("conflict")
)
