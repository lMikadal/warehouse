package tree

import "testing"

func TestPersistParentScopedSiblingReorder_unknownTarget(t *testing.T) {
	err := PersistParentScopedSiblingReorder(
		t.Context(),
		nil,
		ParentScopedReorderTarget(99),
		1,
		1,
		2,
		1,
	)
	if err != errUnknownReorderTarget {
		t.Fatalf("got %v want errUnknownReorderTarget", err)
	}
}
