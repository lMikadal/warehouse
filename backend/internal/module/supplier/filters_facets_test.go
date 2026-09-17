package supplier

import (
	"testing"

	"github.com/lMikadal/warehouse/backend/internal/module/setting"
)

func TestSupplierFilterFacet(t *testing.T) {
	if _, ok := supplierFilterFacet(""); ok {
		t.Fatal("empty facet")
	}
	if k, ok := supplierFilterFacet("prefixes"); !ok || k != setting.LangPrefix {
		t.Fatalf("prefixes: %v %v", k, ok)
	}
	if k, ok := supplierFilterFacet("banks"); !ok || k != setting.LangBank {
		t.Fatalf("banks: %v %v", k, ok)
	}
}
