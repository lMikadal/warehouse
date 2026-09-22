import { describe, expect, test } from "bun:test";

import type { StoreClaimPaymentLine } from "@/lib/order-store-claim-api";

import {
  addStoreClaimItem,
  BLANK_STORE_CLAIM_DRAFT,
  canAddStoreClaimItem,
  canSubmitStoreClaim,
  clampStoreClaimQty,
  proportionalLineTotal,
  remainingClaimAmount,
  removeStoreClaimItem,
  type StoreClaimDraftItem,
} from "./store-claim-draft";

function draftItem(over: Partial<StoreClaimDraftItem> = {}): StoreClaimDraftItem {
  return {
    paymentItemId: 1,
    type: "return",
    reasonId: 5,
    reasonName: "ชำรุด",
    amount: 1,
    note: "",
    detail: "",
    lineTotalPrice: 100,
    ...over,
  };
}

function line(over: Partial<StoreClaimPaymentLine> = {}): StoreClaimPaymentLine {
  return {
    id: 1,
    order_list_item_id: 11,
    amount: 5,
    price_per_unit: 100,
    discount: 0,
    total_price: 500,
    claimed_amount: 0,
    ...over,
  };
}

describe("canAddStoreClaimItem", () => {
  test("a claim takes one line, a return takes many", () => {
    const claim = addStoreClaimItem(BLANK_STORE_CLAIM_DRAFT, draftItem({ type: "claim" }));
    expect(canAddStoreClaimItem(claim, "claim", 2)).toBe(false);

    const ret = addStoreClaimItem(BLANK_STORE_CLAIM_DRAFT, draftItem());
    expect(canAddStoreClaimItem(ret, "return", 2)).toBe(true);
  });

  test("topics may not be mixed and a line may not be added twice", () => {
    const ret = addStoreClaimItem(BLANK_STORE_CLAIM_DRAFT, draftItem());
    expect(canAddStoreClaimItem(ret, "claim", 2)).toBe(false);
    expect(canAddStoreClaimItem(ret, "return", 1)).toBe(false);
  });
});

test("the quantity is clamped to what the line still has", () => {
  expect(clampStoreClaimQty("9", 3)).toBe(3);
  expect(clampStoreClaimQty("0", 3)).toBe(0);
  expect(clampStoreClaimQty("abc", 3)).toBe(0);
  expect(clampStoreClaimQty("2", 3)).toBe(2);
});

test("the refund follows the claimed share of the paid line", () => {
  expect(proportionalLineTotal(500, 5, 2)).toBe(200);
  expect(proportionalLineTotal(500, 5, 0)).toBe(0);
  expect(proportionalLineTotal(333.33, 3, 1)).toBe(111.11);
});

test("claims already on file take quantity off the line", () => {
  expect(remainingClaimAmount(line())).toBe(5);
  expect(remainingClaimAmount(line({ claimed_amount: 5 }))).toBe(0);
  expect(remainingClaimAmount(line({ claimed_amount: 7 }))).toBe(0);
});

test("the running total tracks the lines and resets when the last one goes", () => {
  const two = addStoreClaimItem(
    addStoreClaimItem(BLANK_STORE_CLAIM_DRAFT, draftItem()),
    draftItem({ paymentItemId: 2, lineTotalPrice: 50.5 })
  );
  expect(two.totalPrice).toBe("150.5");
  expect(two.type).toBe("return");

  const one = removeStoreClaimItem(two, 2);
  expect(one.totalPrice).toBe("100");
  expect(removeStoreClaimItem(one, 1)).toEqual(BLANK_STORE_CLAIM_DRAFT);
});

describe("canSubmitStoreClaim", () => {
  const filled = {
    ...addStoreClaimItem(BLANK_STORE_CLAIM_DRAFT, draftItem()),
    paymentType: "cash" as const,
  };

  test("a filled return document may be filed", () => {
    expect(canSubmitStoreClaim(filled)).toBe(true);
  });

  test("an other refund needs its reason, and a blank amount blocks", () => {
    expect(canSubmitStoreClaim({ ...filled, paymentType: "other" })).toBe(false);
    expect(
      canSubmitStoreClaim({ ...filled, paymentType: "other", otherReason: "เงินคืนหน้าร้าน" })
    ).toBe(true);
    expect(canSubmitStoreClaim({ ...filled, totalPrice: "" })).toBe(false);
    expect(canSubmitStoreClaim(BLANK_STORE_CLAIM_DRAFT)).toBe(false);
  });
});
