package product

import "testing"

func TestValidateCategoryParent_cycleOnly(t *testing.T) {
	rows := []Row{
		{ID: 1, ParentID: nil, TreePath: "1"},
		{ID: 2, ParentID: int64Ptr(1), TreePath: "1.2"},
		{ID: 3, ParentID: int64Ptr(2), TreePath: "1.2.3"},
		{ID: 4, ParentID: nil, TreePath: "4"},
	}
	if err := validateCategoryParent(rows, 3, int64Ptr(2)); err != nil {
		t.Fatalf("nest leaf under parent: %v", err)
	}
	if err := validateCategoryParent(rows, 2, int64Ptr(4)); err != nil {
		t.Fatalf("branch with children under another root: %v", err)
	}
	if err := validateCategoryParent(rows, 1, int64Ptr(2)); err == nil {
		t.Fatal("expected error when nesting under descendant")
	}
	if err := validateCategoryParent(rows, 1, int64Ptr(1)); err == nil {
		t.Fatal("expected error for self-parent")
	}
	if err := validateCategoryParent(rows, 3, nil); err != nil {
		t.Fatalf("promote leaf to root: %v", err)
	}
}

func int64Ptr(v int64) *int64 { return &v }

func strPtr(s string) *string { return &s }

func TestValidateCarParent_levels(t *testing.T) {
	brand, model, engine := "brand", "model", "engine"
	rows := []Row{
		{ID: 1, Type: "car", TypeCar: strPtr(brand), ParentID: nil},
		{ID: 2, Type: "car", TypeCar: strPtr(model), ParentID: int64Ptr(1)},
		{ID: 3, Type: "car", TypeCar: strPtr(engine), ParentID: int64Ptr(2)},
	}
	if err := validateCarParent(rows, brand, nil); err != nil {
		t.Fatalf("brand root: %v", err)
	}
	if err := validateCarParent(rows, model, int64Ptr(1)); err != nil {
		t.Fatalf("model under brand: %v", err)
	}
	if err := validateCarParent(rows, engine, int64Ptr(2)); err != nil {
		t.Fatalf("engine under model: %v", err)
	}
	if err := validateCarParent(rows, engine, int64Ptr(1)); err == nil {
		t.Fatal("expected error for engine under brand")
	}
	if err := validateCarParent(rows, brand, int64Ptr(1)); err == nil {
		t.Fatal("expected error for brand with parent")
	}
}
