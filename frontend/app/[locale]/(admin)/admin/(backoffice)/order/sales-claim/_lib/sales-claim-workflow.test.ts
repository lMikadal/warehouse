import { describe, expect, test } from "bun:test";

import {
  SALES_CLAIM_STEPS,
  salesClaimActions,
  salesClaimAllReviewed,
  salesClaimReviewOpen,
  salesClaimTimeline,
} from "./sales-claim-workflow";

const items = (...statuses: string[]) =>
  statuses.map((status) => ({ status })) as { status: never }[];

describe("salesClaimActions", () => {
  test("a filed claim can only be picked up or killed", () => {
    expect(
      salesClaimActions("pending", items("pending")).map((a) => a.status),
    ).toEqual(["acknowledged", "rejected", "cancelled"]);
  });

  test("closing is blocked while a line is unreviewed", () => {
    const blocked = salesClaimActions(
      "acknowledged",
      items("success", "pending"),
    );
    expect(blocked.find((a) => a.status === "success")?.blocked).toBe(true);

    const clear = salesClaimActions(
      "acknowledged",
      items("success", "rejected"),
    );
    expect(clear.find((a) => a.status === "success")?.blocked).toBe(false);
  });

  test("a closed claim offers nothing", () => {
    expect(salesClaimActions("success", items("success"))).toEqual([]);
    expect(salesClaimActions("cancelled", items("rejected"))).toEqual([]);
  });
});

test("salesClaimAllReviewed needs at least one reviewed line", () => {
  expect(salesClaimAllReviewed([])).toBe(false);
  expect(salesClaimAllReviewed(items("success"))).toBe(true);
  expect(salesClaimAllReviewed(items("success", "pending"))).toBe(false);
});

test("line verdicts are only taken while under review", () => {
  expect(salesClaimReviewOpen("acknowledged")).toBe(true);
  expect(salesClaimReviewOpen("waiting_supplier")).toBe(true);
  expect(salesClaimReviewOpen("pending")).toBe(false);
  expect(salesClaimReviewOpen("success")).toBe(false);
});

describe("salesClaimTimeline", () => {
  test("the current status is the live step", () => {
    expect(salesClaimTimeline("pending")).toEqual({ done: 0, current: 0 });
    expect(salesClaimTimeline("waiting_supplier")).toEqual({
      done: 2,
      current: 2,
    });
  });

  test("a finished or killed claim lights every step", () => {
    const all = { done: SALES_CLAIM_STEPS.length, current: -1 };
    expect(salesClaimTimeline("success")).toEqual(all);
    expect(salesClaimTimeline("cancelled")).toEqual(all);
    expect(salesClaimTimeline("rejected")).toEqual(all);
  });
});
