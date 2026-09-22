import { describe, expect, test } from "bun:test";

import type {
  PickingItemDetail,
  PickingListItem,
  PickingPaymentDetail,
} from "@/lib/order-picking-api";

import {
  familySku,
  flattenPickingRows,
  hasRemainingItems,
  hasStoreCheckInProgress,
  lineTotal,
  matchesProductScan,
  nextStoreCheckStatus,
  orderLinesFromItems,
  orderLinesFromPaymentItems,
  paymentFlowFor,
  paymentItemsFromOrderLines,
  paySettleMath,
  proratedDiscount,
  remainingQty,
  showsOnOrderPanel,
  sortPickingItems,
  statusFromChecked,
} from "./picking-lines";

function item(over: Partial<PickingItemDetail> = {}): PickingItemDetail {
  return {
    id: 1,
    product_item_id: 10,
    type: "item",
    amount: 4,
    amount_picked: 0,
    amount_checked: 0,
    status: "pending",
    price_per_unit: 100,
    discount: 0,
    vat_type: "exclude",
    vat_rate: 7,
    total_price: 400,
    ...over,
  };
}

describe("remaining quantities", () => {
  test("never goes negative when more was checked than ordered", () => {
    expect(remainingQty(4, 9)).toBe(0);
    expect(remainingQty(4, 1)).toBe(3);
    expect(remainingQty(Number.NaN, 1)).toBe(0);
  });

  test("a slip with anything unchecked still has remainder", () => {
    expect(hasRemainingItems([item({ amount_checked: 4 })])).toBe(false);
    expect(hasRemainingItems([item({ amount_checked: 3 })])).toBe(true);
  });
});

describe("statusFromChecked", () => {
  test("a partial check stays waiting, a full one succeeds", () => {
    expect(statusFromChecked(4, 0)).toBe("pending");
    expect(statusFromChecked(4, 3)).toBe("pending");
    expect(statusFromChecked(4, 4)).toBe("success");
    expect(statusFromChecked(4, 5)).toBe("success");
  });
});

describe("nextStoreCheckStatus", () => {
  test("mapped catalogue and compare lines toggle; unmapped compare and success do not", () => {
    expect(
      nextStoreCheckStatus({
        type: "item",
        status: "pending",
        product_item_id: 1,
      })
    ).toBe("in_progress");
    expect(
      nextStoreCheckStatus({
        type: "item",
        status: "in_progress",
        product_item_id: 1,
      })
    ).toBe("pending");
    expect(
      nextStoreCheckStatus({
        type: "item",
        status: "success",
        product_item_id: 1,
      })
    ).toBeNull();
    expect(
      nextStoreCheckStatus({
        type: "compare",
        status: "pending",
        product_item_id: null,
      })
    ).toBeNull();
    expect(
      nextStoreCheckStatus({
        type: "compare",
        status: "pending",
        product_item_id: 2,
      })
    ).toBe("in_progress");
  });
});

describe("matchesProductScan", () => {
  const product = { sku: "SKU-1", barcode: "8850000", id: 42 };

  test("matches sku, barcode or id, ignoring case and spaces", () => {
    expect(matchesProductScan(" sku-1 ", product)).toBe(true);
    expect(matchesProductScan("8850000", product)).toBe(true);
    expect(matchesProductScan("42", product)).toBe(true);
  });

  test("an empty or wrong scan never matches", () => {
    expect(matchesProductScan("   ", product)).toBe(false);
    expect(matchesProductScan("SKU-2", product)).toBe(false);
    expect(matchesProductScan("0", { sku: null, barcode: null, id: 0 })).toBe(false);
  });
});

describe("order panel membership", () => {
  test("a line joins once part of it is verified", () => {
    expect(showsOnOrderPanel({ amount_checked: 0 })).toBe(false);
    expect(showsOnOrderPanel({ amount_checked: 0.4 })).toBe(false);
    expect(showsOnOrderPanel({ amount_checked: 1 })).toBe(true);
  });

  test("store-check anywhere blocks settling", () => {
    expect(hasStoreCheckInProgress([item(), item({ id: 2 })])).toBe(false);
    expect(hasStoreCheckInProgress([item({ status: "in_progress" })])).toBe(true);
  });
});

describe("sortPickingItems", () => {
  test("catalogue lines come before compare lines", () => {
    const rows = sortPickingItems([
      item({ id: 3, type: "compare", product_item_id: null }),
      item({ id: 2 }),
    ]);
    expect(rows.map((r) => r.id)).toEqual([2, 3]);
  });
});

function order(over: Partial<PickingListItem> = {}): PickingListItem {
  return {
    id: 1,
    sku: "PJB-202609-00001-01",
    status: "pending",
    doc_status: "pending",
    item_count: 1,
    piece_count: 4,
    total_price: 400,
    payment_count: 2,
    created_at: "2026-09-01T00:00:00Z",
    ...over,
  };
}

function payment(over: Partial<PickingPaymentDetail> = {}): PickingPaymentDetail {
  return {
    id: 40,
    order_list_id: 1,
    sku: "REV-202609-00001",
    payment_category: "payment",
    ordered_at: "2026-09-01T00:00:00Z",
    vat_rate: 7,
    discount: 0,
    special_discount: 0,
    total_price: 400,
    amount_paid: 400,
    is_full: true,
    is_paid: true,
    methods: [],
    items: [],
    created_at: "2026-09-01T00:00:00Z",
    ...over,
  };
}

describe("flattenPickingRows", () => {
  test("collapsed slips yield only themselves", () => {
    const rows = flattenPickingRows(
      [order(), order({ id: 2, payment_count: 0 })],
      new Set(),
      { 1: [payment(), payment({ id: 41 })] }
    );
    expect(rows.map((r) => [r.kind, r.id])).toEqual([
      ["order", 1],
      ["order", 2],
    ]);
  });

  test("an expanded slip gets its documents right underneath", () => {
    const rows = flattenPickingRows([order()], new Set([1]), {
      1: [payment(), payment({ id: 41 })],
    });
    expect(rows.map((r) => r.kind)).toEqual(["order", "payment", "payment"]);
    expect(rows[1]).toMatchObject({ kind: "payment", id: 40, orderId: 1, parentIndex: 0 });
  });
});

describe("familySku", () => {
  test("drops the split suffix but leaves anything else alone", () => {
    expect(familySku("PJB-202609-00001-01")).toBe("PJB-202609-00001");
    expect(familySku("PJB-202609-00001")).toBe("PJB-202609-00001");
    expect(familySku(" QT-1 ")).toBe("QT-1");
    expect(familySku(null)).toBe("");
  });
});

describe("paymentFlowFor", () => {
  test("a settled receipt sends the screen to the pay flow", () => {
    expect(paymentFlowFor([])).toBe("credit");
    expect(paymentFlowFor([payment({ payment_category: "credit", is_paid: true })])).toBe("credit");
    expect(paymentFlowFor([payment({ is_paid: false })])).toBe("credit");
    expect(paymentFlowFor([payment()])).toBe("payment");
  });
});

describe("order lines", () => {
  test("only verified lines reach the panel, priced by what was checked", () => {
    const lines = orderLinesFromItems(
      7,
      [
        item({ id: 1, amount: 4, amount_checked: 2, discount: 40 }),
        item({ id: 2, amount_checked: 0 }),
      ],
      new Map()
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ itemId: 1, orderId: 7, qty: 2, discount: 20 });
  });

  test("a mapped compare line at 0 falls back to the catalogue sell price", () => {
    const lines = orderLinesFromItems(
      7,
      [
        item({
          id: 9,
          type: "compare",
          product_item_id: 2,
          price_per_unit: 0,
          amount: 12,
          amount_checked: 1,
        }),
      ],
      new Map([
        [
          2,
          {
            id: 2,
            product_list_id: 1,
            sku: "B",
            price: 890,
            unit: "piece",
            qty_per_unit: 1,
            minimum_stock: 0,
            is_active: true,
            is_stopped: false,
            updated_at: "",
            tag: "",
            is_new: false,
            name: "b",
            brand_name: "",
            category_name: "",
            total_stock: 0,
            low_stock: false,
            warehouse_root_count: 0,
            car_count: 0,
          },
        ],
      ])
    );
    expect(lines).toHaveLength(1);
    expect(lines[0].pricePerUnit).toBe(890);
  });

  test("a fully billed line keeps its whole discount", () => {
    expect(proratedDiscount({ amount: 4, discount: 40 }, 4)).toBe(40);
    expect(proratedDiscount({ amount: 3, discount: 10 }, 1)).toBe(3.33);
    expect(proratedDiscount({ amount: 0, discount: 10 }, 1)).toBe(0);
  });

  test("line totals never go below zero", () => {
    expect(lineTotal(2, 100, 20)).toBe(180);
    expect(lineTotal(1, 100, 500)).toBe(0);
  });

  test("the payment snapshot carries the billed quantity and its total", () => {
    const snapshot = paymentItemsFromOrderLines(
      orderLinesFromItems(7, [item({ amount: 4, amount_checked: 4, discount: 40 })], new Map())
    );
    expect(snapshot).toEqual([
      {
        order_list_item_id: 1,
        amount: 4,
        price_per_unit: 100,
        discount: 40,
        total_price: 360,
      },
    ]);
  });

  test("a saved document rebuilds its lines from the snapshot, not from what is checked now", () => {
    const lines = orderLinesFromPaymentItems(
      payment({
        items: [
          {
            id: 1,
            order_list_item_id: 5,
            amount: 2,
            vat_rate: 7,
            price_per_unit: 100,
            discount: 20,
            total_price: 180,
          },
        ],
      }),
      new Map([[5, { orderId: 7, item: item({ id: 5, amount_checked: 4 }) }]]),
      new Map()
    );
    expect(lines).toEqual([
      {
        itemId: 5,
        orderId: 7,
        type: "item",
        product: undefined,
        detail: "",
        qty: 2,
        pricePerUnit: 100,
        discount: 20,
      },
    ]);
  });
});

describe("paySettleMath", () => {
  test("unticked or blank channels count for nothing", () => {
    expect(
      paySettleMath(500, [
        { enabled: true, amount: 200 },
        { enabled: false, amount: 999 },
        { enabled: true, amount: 0 },
      ])
    ).toEqual({ paid: 200, remaining: 300, change: 0 });
  });

  test("overpaying gives change and clears the outstanding amount", () => {
    expect(
      paySettleMath(107.5, [
        { enabled: true, amount: 100 },
        { enabled: true, amount: 20.25 },
      ])
    ).toEqual({ paid: 120.25, remaining: 0, change: 12.75 });
  });
});
