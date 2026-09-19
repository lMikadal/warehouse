package member

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestUserStatsResponseFor_omitsSalesUnlessSuperadmin(t *testing.T) {
	row := UserStats{
		TotalCustomers: 8,
		ActiveMembers:  7,
		NewThisMonth:   5,
		SalesThisMonth: 999.5,
	}
	staffBody, err := json.Marshal(userStatsResponseFor(row, "staff"))
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(staffBody), "sales_this_month") {
		t.Fatalf("staff response must omit sales_this_month: %s", staffBody)
	}
	superBody, err := json.Marshal(userStatsResponseFor(row, "superadmin"))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(superBody), `"sales_this_month":999.5`) {
		t.Fatalf("superadmin response must include sales_this_month: %s", superBody)
	}
}
