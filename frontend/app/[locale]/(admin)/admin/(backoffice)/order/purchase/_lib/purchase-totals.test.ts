import { describe, expect, test } from "bun:test";

import {
  clampLineDiscount,
  computePurchaseDraftTotals,
  convertedUnitQty,
  lineNet,
  priceExVat,
  priceIncVat,
  purchaseSummaryTotalExVat,
} from "./purchase-totals";

describe("computePurchaseDraftTotals", () => {
  test("matches the backend: line discounts, then order discounts, then VAT", () => {
    expect(
      computePurchaseDraftTotals(
        [{ qty: 10, price_per_unit: 100, discount: 50 }],
        { discount: 100, specialDiscount: 50, vatRate: 7 }
      )
    ).toEqual({
      total_price: 1000,
      total_discount: 200,
      total_price_discount: 800,
      total_vat: 56,
      total_price_vat: 1070,
      total_grand_price: 856,
    });
  });

  test("clamps discounts at the subtotal so the payable never goes negative", () => {
    const t = computePurchaseDraftTotals(
      [{ qty: 1, price_per_unit: 100, discount: 90 }],
      { discount: 90, specialDiscount: 0, vatRate: 7 }
    );
    expect(t.total_discount).toBe(100);
    expect(t.total_price_discount).toBe(0);
    expect(t.total_grand_price).toBe(0);
  });

  test("keeps the VAT rate inside 0–100", () => {
    expect(
      computePurchaseDraftTotals([{ qty: 1, price_per_unit: 100, discount: 0 }], {
        discount: 0,
        specialDiscount: 0,
        vatRate: -5,
      }).total_vat
    ).toBe(0);
    expect(
      computePurchaseDraftTotals([{ qty: 1, price_per_unit: 100, discount: 0 }], {
        discount: 0,
        specialDiscount: 0,
        vatRate: 500,
      }).total_vat
    ).toBe(100);
  });

  test("an empty draft is all zeroes, not NaN", () => {
    const t = computePurchaseDraftTotals([], {
      discount: 0,
      specialDiscount: 0,
      vatRate: 7,
    });
    expect(t.total_grand_price).toBe(0);
    expect(Number.isNaN(t.total_vat)).toBe(false);
  });
});

test("lineNet subtracts the line discount and ignores a negative one", () => {
  expect(lineNet({ qty: 3, price_per_unit: 10, discount: 5 })).toBe(25);
  expect(lineNet({ qty: 3, price_per_unit: 10, discount: -5 })).toBe(30);
});

test("purchaseSummaryTotalExVat falls back to the grand total", () => {
  expect(purchaseSummaryTotalExVat(800, 856)).toBe(800);
  expect(purchaseSummaryTotalExVat(undefined, 856)).toBe(856);
  expect(purchaseSummaryTotalExVat(undefined, undefined)).toBe(0);
});

test("convertedUnitQty rounds and rejects ratios below one", () => {
  // 6 pieces at 3 pieces per box = 2 boxes.
  expect(convertedUnitQty(6, 3, 1)).toBe(2);
  // 5 pieces at 3 per box rounds to 2 boxes, the way v1 did.
  expect(convertedUnitQty(5, 3, 1)).toBe(2);
  expect(convertedUnitQty(1, 1, 12)).toBe(12);
  expect(convertedUnitQty(0, 3, 1)).toBe(0);
  expect(convertedUnitQty(6, 0, 1)).toBe(0);
});

test("clampLineDiscount caps the discount at the line subtotal", () => {
  expect(clampLineDiscount(3, 100, 50)).toBe(50);
  expect(clampLineDiscount(3, 100, 400)).toBe(300);
  expect(clampLineDiscount(3, 100, -5)).toBe(0);
});

test("priceIncVat and priceExVat round-trip through the VAT rate", () => {
  expect(priceIncVat(100, 7)).toBe(107);
  expect(priceExVat(107, 7)).toBe(100);
  expect(priceIncVat(100, 0)).toBe(100);
});
