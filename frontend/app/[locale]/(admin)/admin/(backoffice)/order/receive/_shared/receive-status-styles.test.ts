import { describe, expect, test } from "bun:test";

import { receiveDisplayStatus } from "./receive-status-styles";

const row = (over: Partial<Parameters<typeof receiveDisplayStatus>[0]> = {}) => ({
  status: "completed",
  approved_item_count: 0,
  total_qty: 3,
  item_reject_count: 0,
  ...over,
});

describe("receiveDisplayStatus", () => {
  test("a paid order with nothing received is still waiting", () => {
    expect(receiveDisplayStatus(row())).toBe("completed");
  });

  test("some lines received reads as partial even while the order status lags", () => {
    expect(receiveDisplayStatus(row({ approved_item_count: 1 }))).toBe(
      "receive_partial"
    );
  });

  test("every line received is not partial", () => {
    expect(receiveDisplayStatus(row({ approved_item_count: 3 }))).toBe("completed");
  });

  test("rejected lines count towards the denominator, so the rest is partial", () => {
    expect(
      receiveDisplayStatus(
        row({ approved_item_count: 3, total_qty: 3, item_reject_count: 1 })
      )
    ).toBe("receive_partial");
  });

  test("the order status wins once the backend has moved it on", () => {
    expect(receiveDisplayStatus(row({ status: "receive_completed" }))).toBe(
      "receive_completed"
    );
    expect(
      receiveDisplayStatus(row({ status: "receive_partial", approved_item_count: 3 }))
    ).toBe("receive_partial");
  });
});
