package product

import "testing"

func TestValidateCategoryParent_depthAndChildren(t *testing.T) {
	rows := []Row{
		{ID: 1, ParentID: nil},
		{ID: 2, ParentID: int64Ptr(1)},
		{ID: 3, ParentID: int64Ptr(2)},
	}
	if err := validateCategoryParent(rows, 1, int64Ptr(2)); err == nil {
		t.Fatal("expected error when parent is not root")
	}
	if err := validateCategoryParent(rows, 1, int64Ptr(3)); err == nil {
		t.Fatal("expected error when parent has depth > 0")
	}
	if err := validateCategoryParent(rows, 1, int64Ptr(2)); err == nil {
		t.Fatal("expected error when row has children and new parent set")
	}
	if err := validateCategoryParent(rows, 3, nil); err != nil {
		t.Fatalf("leaf promote to root: %v", err)
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
