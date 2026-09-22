package system

import (
	"database/sql"
	"testing"
)

func TestRootMenuID(t *testing.T) {
	parentByID := map[int64]sql.NullInt64{
		1: {Valid: false},
		2: {Int64: 1, Valid: true},
		3: {Int64: 2, Valid: true},
	}
	if got := rootMenuID(3, parentByID); got != 1 {
		t.Fatalf("rootMenuID(3) = %d, want 1", got)
	}
}

func TestIsMatrixMenuRow(t *testing.T) {
	ok := &matrixMenuRow{
		path:  sql.NullString{String: "/admin/foo", Valid: true},
		perms: map[string]int64{"view": 1},
	}
	if !isMatrixMenuRow(ok) {
		t.Fatal("expected matrix menu")
	}
	dialog := &matrixMenuRow{isDialog: true, path: sql.NullString{String: "/x", Valid: true}, perms: map[string]int64{"view": 1}}
	if isMatrixMenuRow(dialog) {
		t.Fatal("dialog excluded")
	}
}
