package order

import "testing"

func TestSalesClaimTransitionPendingToWaitingSupplier(t *testing.T) {
	if !containsString(salesClaimTransitions["pending"], "waiting_supplier") {
		t.Fatal("pending must allow waiting_supplier when sending with a supplier assigned")
	}
}
