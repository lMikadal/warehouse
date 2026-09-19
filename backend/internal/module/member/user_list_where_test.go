package member

import (
	"strings"
	"testing"
)

func TestUserListFilterWhere_countQueryParamCount(t *testing.T) {
	w, args := userListFilterWhere(UserListFilter{}, 1)
	if strings.Contains(w, "$1") {
		t.Fatalf("empty filter WHERE should not reference $1, got %q args=%d", w, len(args))
	}
	if len(args) != 0 {
		t.Fatalf("empty filter args want 0, got %d", len(args))
	}
}

func TestUserListFilterWhere_listUsesLocaleAsDollarOne(t *testing.T) {
	_, filterArgs := userListFilterWhere(UserListFilter{}, 2)
	listArgs := append([]any{"th"}, filterArgs...)
	if len(listArgs) != 1 || listArgs[0] != "th" {
		t.Fatalf("list args prefix locale, got %v", listArgs)
	}
}

func TestUserListFilterWhere_dateAndBusiness(t *testing.T) {
	bizID := int64(2)
	w, args := userListFilterWhere(UserListFilter{
		BusinessID:  &bizID,
		CreatedFrom: "2026-09-01",
		CreatedTo:   "2026-09-16",
	}, 1)
	if !strings.HasPrefix(w, "WHERE ") {
		t.Fatalf("expected WHERE prefix, got %q", w)
	}
	if !strings.Contains(w, " AND msr.business_id = $1") {
		t.Fatalf("expected AND between clauses, got %q", w)
	}
	if !strings.Contains(w, "u.created_at >= $2::date") {
		t.Fatalf("expected created_from clause, got %q", w)
	}
	if !strings.Contains(w, "u.created_at < ($3::date + interval '1 day')") {
		t.Fatalf("expected created_to clause, got %q", w)
	}
	if len(args) != 3 {
		t.Fatalf("want 3 args, got %d %v", len(args), args)
	}
	if args[0] != int64(2) || args[1] != "2026-09-01" || args[2] != "2026-09-16" {
		t.Fatalf("unexpected args %v", args)
	}
}
