import type {
  ListItemBody,
  ProductItemStockRow,
  WarehousePlacementRow,
} from "@/lib/product-list-api";

export const LOT_MODAL_PAGE_SIZE_KEY = "warehouse-design-lot-page-size";
export const LOT_MODAL_PAGE_SIZE_OPTIONS = [5, 10] as const;
export const LOT_COLUMN_COUNT = 17;

export type LotDerived = {
  q: number;
  cost: number;
  discU: number;
  actualU: number;
  netTotal: number;
  discTotal: number;
  actualTotal: number;
  sell: number;
  profit: number;
  margin: number | null;
};

export function lotQuantity(row: ProductItemStockRow): number {
  let q = Number(row.quantity) || 0;
  if (q <= 0) q = Number(row.remain_quantity) || 0;
  return q;
}

export function lotStockDerived(row: ProductItemStockRow): LotDerived {
  const q = lotQuantity(row);
  const cost = Number(row.cost_per_unit) || 0;
  const discU = Number(row.discount_per_unit) || 0;
  const actualU = cost - discU;
  const netTotal = q * cost;
  const discTotal = q * discU;
  const actualTotal = q * actualU;
  const sell = Number(row.sell_price) || 0;
  const profit = sell - cost;
  const margin = sell > 0 ? (profit / sell) * 100 : null;
  return {
    q,
    cost,
    discU,
    actualU,
    netTotal,
    discTotal,
    actualTotal,
    sell,
    profit,
    margin,
  };
}

export type LotRemainStatus = {
  key: "itemLotStatusOut" | "itemLotStatusLow" | "itemLotStatusOk";
  tone: "out" | "low" | "ok";
};

export function lotRemainStatus(
  remain: number,
  minStock: number
): LotRemainStatus {
  const r = Number(remain) || 0;
  const m = Number(minStock) || 0;
  if (r <= 0) return { key: "itemLotStatusOut", tone: "out" };
  if (m > 0 && r <= m) return { key: "itemLotStatusLow", tone: "low" };
  return { key: "itemLotStatusOk", tone: "ok" };
}

export function formatLotMoney(value: number, locale: string): string {
  return value.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function lotSummaryFromRows(rows: ProductItemStockRow[]) {
  let received = 0;
  let costWeighted = 0;
  let sellWeighted = 0;
  for (const row of rows) {
    const d = lotStockDerived(row);
    received += d.q;
    if (d.q > 0) {
      costWeighted += d.cost * d.q;
      sellWeighted += d.sell * d.q;
    }
  }
  const avgCost = received > 0 ? costWeighted / received : 0;
  const avgSell = received > 0 ? sellWeighted / received : 0;
  const avgProfit = avgSell - avgCost;
  const marginPct =
    avgSell > 0 ? ((avgProfit / avgSell) * 100).toFixed(2) : null;
  return { received, avgCost, avgSell, avgProfit, marginPct };
}

export function lotFooterTotals(rows: ProductItemStockRow[]) {
  const foot = {
    order: 0,
    free: 0,
    qty: 0,
    remain: 0,
    netTotal: 0,
    discTotal: 0,
    actualTotal: 0,
  };
  for (const row of rows) {
    const d = lotStockDerived(row);
    foot.order += Number(row.order_quantity) || 0;
    foot.free += Number(row.order_free_gift) || 0;
    foot.qty += d.q;
    foot.remain += Number(row.remain_quantity) || 0;
    foot.netTotal += d.netTotal;
    foot.discTotal += d.discTotal;
    foot.actualTotal += d.actualTotal;
  }
  const footAvgActualU = foot.qty > 0 ? foot.actualTotal / foot.qty : null;
  return { foot, footAvgActualU };
}

export function readLotPageSize(): (typeof LOT_MODAL_PAGE_SIZE_OPTIONS)[number] {
  if (typeof sessionStorage === "undefined") return 10;
  const v = parseInt(sessionStorage.getItem(LOT_MODAL_PAGE_SIZE_KEY) ?? "", 10);
  return LOT_MODAL_PAGE_SIZE_OPTIONS.includes(
    v as (typeof LOT_MODAL_PAGE_SIZE_OPTIONS)[number]
  )
    ? (v as (typeof LOT_MODAL_PAGE_SIZE_OPTIONS)[number])
    : 10;
}

export function writeLotPageSize(n: number) {
  try {
    sessionStorage.setItem(LOT_MODAL_PAGE_SIZE_KEY, String(n));
  } catch {
    /* ignore */
  }
}

export type LotComboboxOption = { value: string; label: string };

/** Lot partner picker: only suppliers linked on the product_list (`supplier_ids`). */
export function remainQtyForWarehousePlacement(
  wp: { id?: number | null; bin_id: number },
  placements: WarehousePlacementRow[],
  stocks: ProductItemStockRow[]
): number {
  if (wp.id != null && wp.id > 0) {
    const api = placements.find((p) => p.placement_id === wp.id);
    if (api) return api.quantity;
    return stocks
      .filter((s) => s.product_item_warehouse_id === wp.id)
      .reduce((n, s) => n + (Number(s.remain_quantity) || 0), 0);
  }
  if (wp.bin_id > 0) {
    return stocks
      .filter((s) => s.bin_id === wp.bin_id)
      .reduce((n, s) => n + (Number(s.remain_quantity) || 0), 0);
  }
  return 0;
}

export function filterComboboxToListSuppliers(
  options: LotComboboxOption[],
  listSupplierIds: number[]
): LotComboboxOption[] {
  const allowed = new Set(
    listSupplierIds.filter((id) => id > 0).map(String)
  );
  if (allowed.size === 0) return [];
  return options.filter((o) => allowed.has(o.value));
}

export function canAddProductItemStock(item: ListItemBody | null | undefined): boolean {
  if (item?.id == null) return false;
  const alt = item.old_product_item_id;
  return !(alt != null && alt > 0);
}

export function formatWarehousePlacementLabel(row: WarehousePlacementRow): string {
  return [row.warehouse_name, row.zone_name, row.shelf_name, row.rack_name, row.bin_name]
    .filter((p) => p && p !== "—")
    .join(" › ");
}

export function warehousePlacementBinOptions(
  apiRows: WarehousePlacementRow[],
  draftBins: { bin_id: number }[]
): LotComboboxOption[] {
  const byBin = new Map<string, LotComboboxOption>();
  for (const r of apiRows) {
    if (r.bin_id > 0) {
      byBin.set(String(r.bin_id), {
        value: String(r.bin_id),
        label: formatWarehousePlacementLabel(r),
      });
    }
  }
  for (const wp of draftBins) {
    if (wp.bin_id > 0 && !byBin.has(String(wp.bin_id))) {
      byBin.set(String(wp.bin_id), {
        value: String(wp.bin_id),
        label: `#${wp.bin_id}`,
      });
    }
  }
  return [...byBin.values()].sort((a, b) => a.label.localeCompare(b.label));
}
