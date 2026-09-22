/**
 * Picking-desk rules, ported from v1's `from-detail.ts` and `flatten-delivery-rows.ts`. They decide
 * what a scan matches, how much of a line is still outstanding, which lines belong on the order panel,
 * and how the list interleaves a slip's payment documents under it.
 */

import type {
  PickingItemDetail,
  PickingItemStatus,
  PickingListItem,
  PickingPaymentDetail,
  PickingPaymentItemInput,
} from "@/lib/order-picking-api";
import type { ProductItemBrowseRow } from "@/lib/product-list-api";
import type { StoreSalesPriceSummaryLine } from "@/lib/store-sales-cart-pricing";

/** Whole pieces only: a picker counts items, and v1 truncated every quantity the same way. */
export function wholeQty(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.trunc(value);
}

export function remainingQty(ordered: number, checked: number): number {
  const left = wholeQty(ordered) - wholeQty(checked);
  return left > 0 ? left : 0;
}

export function hasRemainingItems(items: PickingItemDetail[]): boolean {
  return items.some((i) => remainingQty(i.amount, i.amount_checked) > 0);
}

/**
 * A partly verified line stays waiting; only a fully verified one is done. v1 kept `in_progress` for
 * the manual store-check toggle, so the verify step never lands there.
 */
export function statusFromChecked(
  ordered: number,
  checked: number
): PickingItemStatus {
  const o = wholeQty(ordered);
  const c = wholeQty(checked);
  return c >= o && c > 0 ? "success" : "pending";
}

/** The status toggle only flips between waiting and store-check, and only for catalogue lines. */
export function nextStoreCheckStatus(
  item: Pick<PickingItemDetail, "type" | "status">
): PickingItemStatus | null {
  if (item.type !== "item") return null;
  if (item.status === "pending") return "in_progress";
  if (item.status === "in_progress") return "pending";
  return null;
}

/** A line shows up on the order panel once any of it has been verified. */
export function showsOnOrderPanel(
  item: Pick<PickingItemDetail, "amount_checked">
): boolean {
  return wholeQty(item.amount_checked) > 0;
}

/**
 * A scan matches a line by its SKU, its barcode or its raw product id, case-insensitively. An empty
 * scan never matches, which is what makes the mismatch toast fire on a blank field.
 */
export function matchesProductScan(
  scan: string,
  product: { sku?: string | null; barcode?: string | null; id?: number | null }
): boolean {
  const needle = scan.trim().toLowerCase();
  if (!needle) return false;
  const candidates = [
    product.sku?.trim().toLowerCase(),
    product.barcode?.trim().toLowerCase(),
    product.id != null && product.id > 0 ? String(product.id) : undefined,
  ];
  return candidates.some((c) => c && c === needle);
}

/** Compare lines wait for a real product; a catalogue line always has one. */
export function isMappedLine(item: PickingItemDetail): boolean {
  return (item.product_item_id ?? 0) > 0;
}

/** Catalogue lines come before compare lines, as v1 sorted them. */
export function sortPickingItems(items: PickingItemDetail[]): PickingItemDetail[] {
  return [...items].sort((a, b) => {
    if (a.type === b.type) return a.id - b.id;
    return a.type === "item" ? -1 : 1;
  });
}

/** Settling is blocked while any line of the family is still under store-check. */
export function hasStoreCheckInProgress(items: PickingItemDetail[]): boolean {
  return items.some((i) => i.status === "in_progress");
}

export type PickingRow =
  | ({ kind: "order"; parentIndex: number } & PickingListItem)
  | ({ kind: "payment"; parentIndex: number; orderId: number } & PickingPaymentDetail);

/**
 * Interleaves the payment documents of every expanded slip right under it, so one flat array drives
 * the table. A slip with a single document is not expandable, so nothing is inserted for it.
 */
export function flattenPickingRows(
  orders: PickingListItem[],
  expandedIds: ReadonlySet<number>,
  paymentsByOrder: Record<number, PickingPaymentDetail[]>
): PickingRow[] {
  const out: PickingRow[] = [];
  orders.forEach((order, parentIndex) => {
    out.push({ ...order, kind: "order", parentIndex });
    if (!expandedIds.has(order.id)) return;
    for (const payment of paymentsByOrder[order.id] ?? []) {
      out.push({ ...payment, kind: "payment", parentIndex, orderId: order.id });
    }
  });
  return out;
}

/** v1 showed the family number, not the split suffix, on the list. */
export function familySku(sku: string | null | undefined): string {
  const s = (sku ?? "").trim();
  const m = /^(PJB-\d{6}-\d+)(?:-\d+)?$/.exec(s);
  return m ? m[1] : s;
}

/**
 * Which flow the payment screen opens in: a slip that already has a settled receipt goes to the pay
 * screen, everything else to the loan document.
 */
export function paymentFlowFor(
  payments: PickingPaymentDetail[]
): "credit" | "payment" {
  return payments.some((p) => p.payment_category === "payment" && p.is_paid)
    ? "payment"
    : "credit";
}

/** One row of the order panel: what the picker verified, priced as the sale document priced it. */
export type PickingOrderLine = {
  itemId: number;
  orderId: number;
  type: "item" | "compare";
  product?: ProductItemBrowseRow;
  detail: string;
  qty: number;
  pricePerUnit: number;
  discount: number;
};

export function lineTotal(qty: number, pricePerUnit: number, discount: number): number {
  const total = qty * pricePerUnit - discount;
  return total > 0 ? Math.round(total * 100) / 100 : 0;
}

/**
 * The line discount on a sale document covers the whole ordered quantity, so billing a part of it bills
 * the same share of the discount. v1 re-ran catalogue pricing for the partial quantity instead; the
 * saved unit price and its discount are the agreed ones, and prorating keeps them consistent.
 */
export function proratedDiscount(
  item: Pick<PickingItemDetail, "amount" | "discount">,
  qty: number
): number {
  const ordered = wholeQty(item.amount);
  if (ordered <= 0 || item.discount <= 0) return 0;
  if (qty >= ordered) return Math.round(item.discount * 100) / 100;
  return Math.round(((item.discount * qty) / ordered) * 100) / 100;
}

export function orderLineFromItem(
  orderId: number,
  item: PickingItemDetail,
  productsById: Map<number, ProductItemBrowseRow>,
  qty = wholeQty(item.amount_checked)
): PickingOrderLine {
  return {
    itemId: item.id,
    orderId,
    type: item.type,
    product: item.product_item_id
      ? productsById.get(item.product_item_id)
      : undefined,
    detail: item.detail?.trim() ?? "",
    qty,
    pricePerUnit: item.price_per_unit,
    discount: proratedDiscount(item, qty),
  };
}

/** The order panel mirrors what has been verified, so the lines follow `amount_checked`. */
export function orderLinesFromItems(
  orderId: number,
  items: PickingItemDetail[],
  productsById: Map<number, ProductItemBrowseRow>
): PickingOrderLine[] {
  return sortPickingItems(items)
    .filter(showsOnOrderPanel)
    .map((item) => orderLineFromItem(orderId, item, productsById));
}

export function summaryLinesFromOrderLines(
  lines: PickingOrderLine[]
): StoreSalesPriceSummaryLine[] {
  return lines.map((l) => ({
    qty: l.qty,
    listPrice: l.pricePerUnit,
    discount: l.discount,
  }));
}

export function paymentItemsFromOrderLines(
  lines: PickingOrderLine[]
): PickingPaymentItemInput[] {
  return lines.map((l) => ({
    order_list_item_id: l.itemId,
    amount: l.qty,
    price_per_unit: l.pricePerUnit,
    discount: l.discount,
    total_price: lineTotal(l.qty, l.pricePerUnit, l.discount),
  }));
}

/** Rebuilds the lines of a saved document from its priced snapshot, for the read-only tabs. */
export function orderLinesFromPaymentItems(
  payment: PickingPaymentDetail,
  itemsById: Map<number, { orderId: number; item: PickingItemDetail }>,
  productsById: Map<number, ProductItemBrowseRow>
): PickingOrderLine[] {
  return payment.items.map((snap) => {
    const hit = itemsById.get(snap.order_list_item_id);
    return {
      itemId: snap.order_list_item_id,
      orderId: hit?.orderId ?? payment.order_list_id,
      type: hit?.item.type ?? "item",
      product: hit?.item.product_item_id
        ? productsById.get(hit.item.product_item_id)
        : undefined,
      detail: hit?.item.detail?.trim() ?? "",
      qty: snap.amount,
      pricePerUnit: snap.price_per_unit,
      discount: snap.discount,
    };
  });
}

/** What the till owes and what it hands back, from the channels the clerk keyed in. */
export function paySettleMath(
  net: number,
  methods: { enabled: boolean; amount: number }[]
) {
  const paid =
    Math.round(
      methods.reduce(
        (sum, m) => sum + (m.enabled && m.amount > 0 ? m.amount : 0),
        0
      ) * 100
    ) / 100;
  return {
    paid,
    remaining: Math.max(0, Math.round((net - paid) * 100) / 100),
    change: Math.max(0, Math.round((paid - net) * 100) / 100),
  };
}
