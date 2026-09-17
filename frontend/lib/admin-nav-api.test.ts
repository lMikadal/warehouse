import { describe, expect, test } from "bun:test";

import {
  adminNavLabel,
  bestMatchingNavHref,
  breadcrumbFromNavTree,
  navItemActive,
  type AdminNavNode,
} from "./admin-nav-api";

const warehouseNav: AdminNavNode[] = [
  {
    id: "25",
    labels: { th: "คลังสินค้า", en: "Warehouse" },
    icon: "warehouse",
    children: [
      {
        id: "26",
        labels: { th: "รายการ", en: "List" },
        href: "/admin/warehouse/list",
      },
      {
        id: "27",
        labels: { th: "การจัดการ", en: "Management" },
        href: "/admin/warehouse/list/view",
        isDialog: true,
      },
    ],
  },
];

describe("bestMatchingNavHref", () => {
  test("list page matches list href", () => {
    expect(bestMatchingNavHref("/admin/warehouse/list", warehouseNav)).toBe(
      "/admin/warehouse/list"
    );
  });

  test("view page matches management href not list prefix", () => {
    expect(bestMatchingNavHref("/admin/warehouse/list/view", warehouseNav)).toBe(
      "/admin/warehouse/list/view"
    );
  });
});

describe("navItemActive", () => {
  test("list active on list only", () => {
    expect(
      navItemActive(
        "/admin/warehouse/list",
        "/admin/warehouse/list",
        warehouseNav
      )
    ).toBe(true);
    expect(
      navItemActive(
        "/admin/warehouse/list/view",
        "/admin/warehouse/list",
        warehouseNav
      )
    ).toBe(false);
  });

  test("management active on view", () => {
    expect(
      navItemActive(
        "/admin/warehouse/list/view",
        "/admin/warehouse/list/view",
        warehouseNav
      )
    ).toBe(true);
    expect(
      navItemActive(
        "/admin/warehouse/list/view",
        "/admin/warehouse/list",
        warehouseNav
      )
    ).toBe(false);
  });
});

describe("breadcrumbFromNavTree", () => {
  test("view breadcrumb ends at management", () => {
    const crumbs = breadcrumbFromNavTree(
      "/admin/warehouse/list/view",
      warehouseNav
    );
    expect(crumbs).toHaveLength(2);
    expect(adminNavLabel(crumbs[1]!.labels, "th")).toBe("การจัดการ");
  });

  test("list breadcrumb ends at list", () => {
    const crumbs = breadcrumbFromNavTree("/admin/warehouse/list", warehouseNav);
    expect(crumbs).toHaveLength(2);
    expect(adminNavLabel(crumbs[1]!.labels, "th")).toBe("รายการ");
  });
});
