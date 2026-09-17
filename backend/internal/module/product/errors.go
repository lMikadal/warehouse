package product

import "errors"

var (
	ErrNotFound        = errors.New("not found")
	ErrValidation      = errors.New("validation")
	ErrInvalidReorder  = errors.New("invalid reorder")
	ErrDragSiblingOnly = errors.New("drag sibling only")
)
