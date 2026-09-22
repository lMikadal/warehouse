import { describe, expect, test } from "bun:test";

import {
  clampQtySell,
  preliminaryQtyReorder,
  sumLineDeposits,
  toDepositReceiptNo,
} from "./ticket-line-helpers";

describe("clampQtySell", () => {
  test("floors and never goes below zero", () => {
    expect(clampQtySell(3.9)).toBe(3);
    expect(clampQtySell(-4)).toBe(0);
    expect(clampQtySell(Number.NaN)).toBe(0);
  });
});

describe("preliminaryQtyReorder", () => {
  test("reorders only the shortfall against stock", () => {
    expect(preliminaryQtyReorder(5, 2)).toBe(3);
    expect(preliminaryQtyReorder(2, 5)).toBe(0);
  });

  test("treats missing stock as zero on hand", () => {
    expect(preliminaryQtyReorder(4)).toBe(4);
    expect(preliminaryQtyReorder(4, Number.NaN)).toBe(4);
  });
});

describe("sumLineDeposits", () => {
  test("skips unparsable amounts instead of returning NaN", () => {
    expect(
      sumLineDeposits([{ deposit: "100.50" }, { deposit: "" }, { deposit: "x" }])
    ).toBe(100.5);
  });
});

describe("toDepositReceiptNo", () => {
  test("swaps the TK prefix for BP and leaves other numbers alone", () => {
    expect(toDepositReceiptNo("TK-202609-00012")).toBe("BP-202609-00012");
    expect(toDepositReceiptNo("tk-202609-00012")).toBe("BP-202609-00012");
    expect(toDepositReceiptNo("PO-202609-00012")).toBe("PO-202609-00012");
    expect(toDepositReceiptNo("")).toBe("");
  });
});
