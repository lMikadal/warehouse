import type { SalesClaimItemDetail } from "@/lib/order-sales-claim-api";
import type { StoreClaimStatus } from "@/lib/order-store-claim-api";

/** The happy path of `order_claim_status`, in the order the timeline draws it. */
export const SALES_CLAIM_STEPS = [
  "pending",
  "acknowledged",
  "waiting_supplier",
  "success",
] as const;

/** Mirror of the backend's transition table, so a disallowed button never reaches the API. */
const TRANSITIONS: Record<StoreClaimStatus, StoreClaimStatus[]> = {
  pending: ["acknowledged", "rejected", "cancelled"],
  acknowledged: ["waiting_supplier", "success", "rejected", "cancelled"],
  waiting_supplier: ["success", "rejected", "cancelled"],
  success: [],
  cancelled: [],
  rejected: [],
};

/** Only a claim under review takes line-level verdicts, same as the backend's guard. */
export function salesClaimReviewOpen(status: StoreClaimStatus): boolean {
  return status === "acknowledged" || status === "waiting_supplier";
}

export function salesClaimAllReviewed(
  items: Pick<SalesClaimItemDetail, "status">[],
): boolean {
  return (
    items.length > 0 &&
    items.every((it) => it.status === "success" || it.status === "rejected")
  );
}

export type SalesClaimAction = {
  status: StoreClaimStatus;
  /** True while the desk still owes the claim something — closing needs every line reviewed. */
  blocked: boolean;
};

/** What purchasing may do next, and whether closing is still gated on unreviewed lines. */
export function salesClaimActions(
  status: StoreClaimStatus,
  items: Pick<SalesClaimItemDetail, "status">[],
): SalesClaimAction[] {
  const reviewed = salesClaimAllReviewed(items);
  return TRANSITIONS[status].map((next) => ({
    status: next,
    blocked: next === "success" && !reviewed,
  }));
}

/**
 * How far the document has travelled: steps before the current status are done, the status itself is
 * the live one. A closed claim lights the lot, and a killed one does too since it goes no further.
 */
export function salesClaimTimeline(status: StoreClaimStatus): {
  done: number;
  current: number;
} {
  const index = SALES_CLAIM_STEPS.indexOf(
    status as (typeof SALES_CLAIM_STEPS)[number],
  );
  if (index < 0 || status === "success") {
    return { done: SALES_CLAIM_STEPS.length, current: -1 };
  }
  return { done: index, current: index };
}
