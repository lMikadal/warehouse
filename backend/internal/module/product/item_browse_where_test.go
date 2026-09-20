package product

import (
	"strings"
	"testing"
)

func TestItemBrowseWhereModelYearOem(t *testing.T) {
	modelID := int64(42)
	year := 2020
	where, args := itemBrowseWhere(ItemListFilter{
		ModelID: &modelID,
		CarYear: &year,
		OEM:     "ABC-123",
	}, 3)
	if !strings.Contains(where, "product_list_car") {
		t.Fatalf("expected car filter in where: %s", where)
	}
	if !strings.Contains(where, "product_attribute_model_id") {
		t.Fatalf("expected model in unified car exists: %s", where)
	}
	if !strings.Contains(where, "product_list_code") {
		t.Fatalf("expected oem code filter in where: %s", where)
	}
	if len(args) != 3 {
		t.Fatalf("expected 3 args, got %d", len(args))
	}
	if args[0] != modelID || args[1] != year {
		t.Fatalf("unexpected args: %v", args)
	}
}

func TestItemBrowseWhereCarFitmentUnified(t *testing.T) {
	carBrand := int64(5)
	modelID := int64(6)
	year := 2019
	where, args := itemBrowseWhere(ItemListFilter{
		CarBrandID: &carBrand,
		ModelID:    &modelID,
		CarYear:    &year,
	}, 3)
	if strings.Count(where, "EXISTS") != 1 {
		t.Fatalf("expected single EXISTS for car fitment, got: %s", where)
	}
	if !strings.Contains(where, "product_attribute_brand_id") {
		t.Fatalf("expected car brand in where: %s", where)
	}
	if len(args) != 3 || args[0] != carBrand || args[1] != modelID || args[2] != year {
		t.Fatalf("unexpected args: %v", args)
	}
}

func TestItemBrowseWhereProductBrandUnchanged(t *testing.T) {
	brandID := int64(1)
	where, args := itemBrowseWhere(ItemListFilter{BrandID: &brandID}, 3)
	if !strings.Contains(where, "pl.product_brand_id") {
		t.Fatalf("expected product list brand filter: %s", where)
	}
	if strings.Contains(where, "product_list_car") {
		t.Fatalf("product brand filter must not use product_list_car: %s", where)
	}
	if len(args) != 1 || args[0] != brandID {
		t.Fatalf("unexpected args: %v", args)
	}
}
