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
  test("a filed claim can be acknowledged, sent to supplier, or killed", () => {
    expect(
      salesClaimActions("pending", items("pending")).map((a) => a.status),
    ).toEqual(["acknowledged", "waiting_supplier", "rejected", "cancelled"]);
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
  test("before send the claim sits on the first step", () => {
    expect(salesClaimTimeline("pending", items("pending"))).toEqual({
      done: 0,
      current: 0,
    });
    expect(salesClaimTimeline("acknowledged", items("pending"))).toEqual({
      done: 0,
      current: 0,
    });
  });

  test("waiting_supplier advances as the supplier answers lines", () => {
    // Sent, nothing answered yet.
    expect(
      salesClaimTimeline("waiting_supplier", items("pending", "pending")),
    ).toEqual({ done: 2, current: 2 });
    // At least one line answered → supplier replied.
    expect(
      salesClaimTimeline("waiting_supplier", items("success", "pending")),
    ).toEqual({ done: 3, current: 3 });
    // Every line answered → all reviewed, waiting to close.
    expect(
      salesClaimTimeline("waiting_supplier", items("success", "rejected")),
    ).toEqual({ done: 4, current: 4 });
  });

  test("a finished or killed claim lights every step", () => {
    const all = { done: SALES_CLAIM_STEPS.length, current: -1 };
    expect(salesClaimTimeline("success", items("success"))).toEqual(all);
    expect(salesClaimTimeline("cancelled", items("pending"))).toEqual(all);
    expect(salesClaimTimeline("rejected", items("pending"))).toEqual(all);
  });
});
