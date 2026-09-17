import { describe, expect, test } from "bun:test";

import type { WarehouseTreeNode } from "@/lib/warehouse-api";

import { flattenVisibleTree } from "./warehouse-tree-utils";

const WH = 1;
const Z1 = 10;
const Z2 = 11;
const SHELF = 20;

const nodes: WarehouseTreeNode[] = [
  {
    id: Z1,
    parent_id: WH,
    type: "zone",
    sort_order: 1,
    sku: "Z1",
    name: "Zone 1",
    capacity: 10,
    used: 0,
    is_active: true,
    capacity_pct: 0,
  },
  {
    id: Z2,
    parent_id: WH,
    type: "zone",
    sort_order: 2,
    sku: "Z2",
    name: "Zone 2",
    capacity: 10,
    used: 0,
    is_active: true,
    capacity_pct: 0,
  },
  {
    id: SHELF,
    parent_id: Z1,
    type: "shelf",
    sort_order: 1,
    sku: "S1",
    name: "Shelf 1",
    capacity: 5,
    used: 0,
    is_active: true,
    capacity_pct: 0,
  },
];

describe("flattenVisibleTree", () => {
  test("empty open shows zones only", () => {
    const flat = flattenVisibleTree(nodes, WH, {});
    expect(flat.map((r) => r.node.id)).toEqual([Z1, Z2]);
  });

  test("open one zone includes its shelf children", () => {
    const flat = flattenVisibleTree(nodes, WH, { [Z1]: true });
    expect(flat.map((r) => r.node.id)).toEqual([Z1, SHELF, Z2]);
  });
});
