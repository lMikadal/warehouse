import type { ClaimStatus } from "@/lib/order-claim-api";

/**
 * Six visual steps for a purchase-side claim/return. Richer than the four backend statuses;
 * progress is derived from header status only (line review lives in the items table).
 */
export const CLAIM_TIMELINE_STEPS = [
  "createDoc",
  "sendToPartner",
  "waitPartnerReview",
  "partnerReply",
  "confirmAll",
  "close",
] as const;

export type ClaimTimelineStep = (typeof CLAIM_TIMELINE_STEPS)[number];

/** Header-level actions the desk may take outside the pending document panel. */
const TRANSITIONS: Record<ClaimStatus, ClaimStatus[]> = {
  pending: ["cancelled"],
  in_progress: ["cancelled"],
  completed: [],
  cancelled: [],
};

export type ClaimWorkflowAction = {
  status: ClaimStatus;
};

export function claimActions(status: ClaimStatus): ClaimWorkflowAction[] {
  return TRANSITIONS[status].map((next) => ({ status: next }));
}

/**
 * How far the document has travelled. Filing is done once a resolution is chosen; in_progress means
 * the desk is waiting on the partner; settled or dead lines light every step.
 */
export function claimTimeline(status: ClaimStatus): {
  done: number;
  current: number;
} {
  if (status === "completed" || status === "cancelled") {
    return { done: CLAIM_TIMELINE_STEPS.length, current: -1 };
  }
  if (status === "pending") return { done: 1, current: 1 };
  return { done: 2, current: 2 };
}
