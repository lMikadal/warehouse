package product

import "testing"

func TestValidateListAggregate(t *testing.T) {
	if validateListAggregate(listAggregateBody{}) == nil {
		t.Fatal("empty body should fail")
	}
	err := validateListAggregate(listAggregateBody{
		SKU: "SKU-1",
		Languages: listLangBody{
			Th: localeBlock{Name: "th"},
			En: localeBlock{Name: "en"},
		},
		Items: []listItemBody{{Price: 1}},
	})
	if err != nil {
		t.Fatalf("valid body: %v", err)
	}
}
