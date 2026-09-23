import { describe, expect, it } from "bun:test";

import { claimActions, claimTimeline, CLAIM_TIMELINE_STEPS } from "./claim-workflow";

describe("claimTimeline", () => {
  it("lights every step when settled or cancelled", () => {
    expect(claimTimeline("completed")).toEqual({
      done: CLAIM_TIMELINE_STEPS.length,
      current: -1,
    });
    expect(claimTimeline("cancelled")).toEqual({
      done: CLAIM_TIMELINE_STEPS.length,
      current: -1,
    });
  });

  it("marks filing for pending and waiting for in_progress", () => {
    expect(claimTimeline("pending")).toEqual({ done: 1, current: 1 });
    expect(claimTimeline("in_progress")).toEqual({ done: 2, current: 2 });
  });
});

describe("claimActions", () => {
  it("allows cancel while open", () => {
    expect(claimActions("pending").map((a) => a.status)).toEqual(["cancelled"]);
    expect(claimActions("in_progress").map((a) => a.status)).toEqual([
      "cancelled",
    ]);
  });

  it("offers nothing when closed", () => {
    expect(claimActions("completed")).toEqual([]);
    expect(claimActions("cancelled")).toEqual([]);
  });
});
