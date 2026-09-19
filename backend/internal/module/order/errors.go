package order

import "errors"

var (
	ErrValidation = errors.New("validation")
	ErrNotFound   = errors.New("not found")
)
