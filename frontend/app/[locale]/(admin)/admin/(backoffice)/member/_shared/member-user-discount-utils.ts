import type { MemberUserDiscountRow } from "@/lib/member-user-api";
import type { MemberUserProductItemFilterItem } from "@/lib/member-user-filters-api";

export function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function calcSpecial(
  price: number,
  discount: number,
  discountType: string
): number {
  const p = Number(price) || 0;
  const disc = Number(discount) || 0;
  const out =
    discountType === "baht" ? p - disc : p * (1 - disc / 100);
  return Math.max(0, out);
}

if (process.env.NODE_ENV !== "production") {
  if (calcSpecial(100, 10, "percent") !== 90) {
    throw new Error("member-user calcSpecial percent");
  }
  if (calcSpecial(100, 15, "baht") !== 85) {
    throw new Error("member-user calcSpecial baht");
  }
}

export function formatBaht(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function discountRowActiveOnDate(
  row: MemberUserDiscountRow,
  isoDate: string
): boolean {
  if (!isoDate) return true;
  if (row.date_start && row.date_start > isoDate) return false;
  if (row.date_end && row.date_end < isoDate) return false;
  return true;
}

/** Discount period [date_start, date_end] overlaps filter range (open bounds allowed). */
export function discountRowOverlapsFilterRange(
  row: MemberUserDiscountRow,
  from: string | undefined,
  to: string | undefined
): boolean {
  const ff = from?.trim() || "";
  const ft = to?.trim() || "";
  if (!ff && !ft) return true;
  const rs = row.date_start?.slice(0, 10) ?? "";
  const re = row.date_end?.slice(0, 10) ?? "";
  if (ff && re && re < ff) return false;
  if (ft && rs && rs > ft) return false;
  return true;
}

if (process.env.NODE_ENV !== "production") {
  const row = {
    date_start: "2026-01-10",
    date_end: "2026-01-20",
  } as MemberUserDiscountRow;
  if (!discountRowOverlapsFilterRange(row, "2026-01-15", "2026-01-25")) {
    throw new Error("member-user discount range overlap");
  }
  if (discountRowOverlapsFilterRange(row, "2026-02-01", "2026-02-28")) {
    throw new Error("member-user discount range no overlap");
  }
}

export function isExpiredRow(row: MemberUserDiscountRow, today: string): boolean {
  return !!(row.date_end && row.date_end < today);
}

export type ProductItemDisplay = {
  sku: string;
  productName: string;
  brandName: string;
  brandId: number | null;
  price: number;
};

export function productDisplayFromFilter(
  item: MemberUserProductItemFilterItem | undefined
): ProductItemDisplay {
  if (!item) {
    return {
      sku: "",
      productName: "",
      brandName: "—",
      brandId: null,
      price: 0,
    };
  }
  return {
    sku: item.sku?.trim() ?? "",
    productName: item.product_name?.trim() ?? item.name?.trim() ?? "",
    brandName: item.brand_name?.trim() || "—",
    brandId: item.brand_id ?? null,
    price: item.price ?? 0,
  };
}

export type BulkDraftFields = {
  minimum_qty: string;
  discount: string;
  date_start: string;
  date_end: string;
};

export function bulkDraftFromRow(row: MemberUserDiscountRow): BulkDraftFields {
  return {
    minimum_qty: String(row.minimum_qty ?? 0),
    discount: String(row.discount ?? 0),
    date_start: row.date_start?.slice(0, 10) ?? "",
    date_end: row.date_end?.slice(0, 10) ?? "",
  };
}
