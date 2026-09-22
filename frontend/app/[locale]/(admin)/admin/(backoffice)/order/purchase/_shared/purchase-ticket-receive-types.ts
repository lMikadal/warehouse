import type { PurchaseUnit } from "@/lib/order-purchase-api";
import type { TicketItemDetail } from "@/lib/order-ticket-api";

export type ReceiveDraftLinePricing = {
  pricePerUnit: number;
  discount: number;
};

export type ReceiveDraftLine = {
  /** Stable client key (React + patch/remove). */
  key: string;
  /** Set when the line came from a purchase-request ticket item. */
  ticketItemId?: number | null;
  productItemId: number | null;
  name: string;
  sku: string;
  type: "catalog" | "custom";
  unit: PurchaseUnit;
  qtySell: number;
  qtyOrder: number;
  brandId: number | null;
  modelId: number | null;
  engineId: number | null;
  identificationNumber: string;
  note: string;
  systemFileIds?: number[];
  pricing: ReceiveDraftLinePricing;
};

export type ReceiveDraftCard = {
  key: string;
  supplierId: string;
  supplierLabel: string;
  discount: number;
  note: string;
  lines: ReceiveDraftLine[];
};

export type ReceiveSupplierOption = {
  id: number;
  label: string;
};

export function coercePurchaseUnit(unit: string): PurchaseUnit {
  if (unit === "box" || unit === "set" || unit === "piece") return unit;
  return "piece";
}

export function ticketLineDisplayName(item: TicketItemDetail): string {
  if (item.type === "catalog") {
    return item.product_item_name?.trim() || item.name?.trim() || "—";
  }
  return item.name?.trim() || "—";
}

export function ticketLineToDraftLine(
  item: TicketItemDetail,
  pricing?: Partial<ReceiveDraftLinePricing>
): ReceiveDraftLine {
  const sell = Math.max(0, item.qty_sell);
  const reorder = Math.max(0, item.qty_reorder);
  return {
    key: `ticket-${item.id}`,
    ticketItemId: item.id,
    productItemId: item.product_item_id ?? null,
    name: ticketLineDisplayName(item),
    sku: item.product_item_sku?.trim() || "",
    type: item.type,
    unit: coercePurchaseUnit(item.unit),
    qtySell: sell,
    qtyOrder: reorder > 0 ? reorder : Math.max(1, sell || 1),
    brandId: item.product_attribute_brand_id ?? null,
    modelId: item.product_attribute_model_id ?? null,
    engineId: item.product_attribute_engine_id ?? null,
    identificationNumber: item.identification_number ?? "",
    note: item.note ?? "",
    systemFileIds: item.files.map((f) => f.system_file_id),
    pricing: {
      pricePerUnit: pricing?.pricePerUnit ?? 0,
      discount: pricing?.discount ?? 0,
    },
  };
}
