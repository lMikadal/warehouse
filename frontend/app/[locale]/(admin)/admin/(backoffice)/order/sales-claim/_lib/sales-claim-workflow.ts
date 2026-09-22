import type { SalesClaimItemDetail } from "@/lib/order-sales-claim-api";
import type { StoreClaimStatus } from "@/lib/order-store-claim-api";

/**
 * The six visual steps of a claim's life. They are richer than the four backend statuses: the middle
 * ones (`waiting` → `replied` → `reviewed`) are derived from how many lines the supplier has answered.
 */
export const SALES_CLAIM_STEPS = [
  "created",
  "sent",
  "waiting",
  "replied",
  "reviewed",
  "closed",
] as const;

/** Mirror of the backend's transition table, so a disallowed button never reaches the API. */
const TRANSITIONS: Record<StoreClaimStatus, StoreClaimStatus[]> = {
  pending: ["acknowledged", "waiting_supplier", "rejected", "cancelled"],
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
 * How far the document has travelled across the six steps, derived from the status plus how many
 * lines the supplier has answered. A finished or killed claim lights the lot since it goes no further.
 */
export function salesClaimTimeline(
  status: StoreClaimStatus,
  items: Pick<SalesClaimItemDetail, "status">[],
): {
  done: number;
  current: number;
} {
  if (status === "success" || status === "cancelled" || status === "rejected") {
    return { done: SALES_CLAIM_STEPS.length, current: -1 };
  }
  if (status === "pending" || status === "acknowledged") {
    return { done: 0, current: 0 };
  }
  // waiting_supplier: split "sent → waiting → replied → reviewed" by line verdicts.
  const reviewed = items.filter(
    (it) => it.status === "success" || it.status === "rejected",
  ).length;
  if (reviewed === 0) return { done: 2, current: 2 };
  if (!salesClaimAllReviewed(items)) return { done: 3, current: 3 };
  return { done: 4, current: 4 };
}
