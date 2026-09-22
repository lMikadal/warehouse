/**
 * Draft-side money math for the PO form, mirroring computePurchaseTotals in
 * `backend/internal/module/order/purchase_repository.go`. The form needs live totals before it
 * saves, so the same rules live on both sides: line discounts come off the subtotal first, then the
 * order and special discounts, and VAT applies to whatever is left.
 */

export type PurchaseDraftLine = {
  qty: number;
  price_per_unit: number;
  discount: number;
};

export type PurchaseDraftTotals = {
  total_price: number;
  total_discount: number;
  total_price_discount: number;
  total_vat: number;
  total_price_vat: number;
  total_grand_price: number;
};

export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

export function lineNet(line: PurchaseDraftLine): number {
  return roundMoney(line.qty * line.price_per_unit - Math.max(0, line.discount));
}

export function computePurchaseDraftTotals(
  lines: PurchaseDraftLine[],
  opts: { discount: number; specialDiscount: number; vatRate: number }
): PurchaseDraftTotals {
  let subtotal = 0;
  let lineDiscount = 0;
  for (const line of lines) {
    subtotal += line.qty * line.price_per_unit;
    lineDiscount += Math.max(0, line.discount);
  }
  subtotal = roundMoney(subtotal);
  let discounts = roundMoney(
    lineDiscount +
      Math.max(0, opts.discount) +
      Math.max(0, opts.specialDiscount)
  );
  if (discounts > subtotal) discounts = subtotal;
  const afterDiscount = roundMoney(subtotal - discounts);
  const rate = Math.min(100, Math.max(0, opts.vatRate)) / 100;
  const vat = roundMoney(afterDiscount * rate);
  return {
    total_price: subtotal,
    total_discount: discounts,
    total_price_discount: afterDiscount,
    total_vat: vat,
    total_price_vat: roundMoney(subtotal + roundMoney(subtotal * rate)),
    total_grand_price: roundMoney(afterDiscount + vat),
  };
}

/**
 * v1 purchaseDetailSummaryProductTotalExVat: the list/summary "total" column shows the
 * after-discount amount, falling back to the grand total when the backend omitted it.
 */
export function purchaseSummaryTotalExVat(
  totalPriceDiscount: number | undefined,
  totalGrandPrice: number | undefined
): number {
  if (totalPriceDiscount !== undefined && Number.isFinite(totalPriceDiscount)) {
    return roundMoney(totalPriceDiscount);
  }
  if (totalGrandPrice !== undefined && Number.isFinite(totalGrandPrice)) {
    return roundMoney(totalGrandPrice);
  }
  return 0;
}

/** Converted packs consumed from the parent line: v1 round(qty × to_ratio ÷ from_ratio). */
export function convertedUnitQty(
  qtyToConvert: number,
  fromRatio: number,
  toRatio: number
): number {
  if (fromRatio < 1 || toRatio < 1 || qtyToConvert < 1) return 0;
  return Math.round((qtyToConvert * toRatio) / fromRatio);
}

/**
 * v1 clampDiscountExToLineSubtotal: a line discount can never exceed what the line is worth,
 * otherwise the order subtotal would go negative once the backend re-totals.
 */
export function clampLineDiscount(
  qty: number,
  pricePerUnit: number,
  discount: number
): number {
  const subtotal = roundMoney(Math.max(0, qty) * Math.max(0, pricePerUnit));
  return roundMoney(Math.min(Math.max(0, discount), subtotal));
}

/** ex-VAT price ↔ inc-VAT price, the pair the v1 line editor keeps in sync. */
export function priceIncVat(priceExVat: number, vatRate: number): number {
  return roundMoney(priceExVat * (1 + Math.max(0, vatRate) / 100));
}

export function priceExVat(priceIncVat: number, vatRate: number): number {
  return roundMoney(priceIncVat / (1 + Math.max(0, vatRate) / 100));
}
