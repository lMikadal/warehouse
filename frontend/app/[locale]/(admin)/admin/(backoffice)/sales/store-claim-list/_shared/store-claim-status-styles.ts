import type { StoreClaimStatusFilter } from "@/lib/order-store-claim-api";
import { cn } from "@/lib/utils";

const pillBase =
  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium";

/** Chip order follows the workflow the document travels, with "all" first. */
export const STORE_CLAIM_STATUS_ORDER: StoreClaimStatusFilter[] = [
  "",
  "pending",
  "acknowledged",
  "waiting_supplier",
  "success",
  "cancelled",
  "rejected",
];

function tone(status: StoreClaimStatusFilter): string {
  switch (status) {
    case "pending":
      return "border-warehouse-warning-border bg-warehouse-warning-bg text-warehouse-warning-fg";
    case "acknowledged":
    case "waiting_supplier":
      return "border-primary/40 bg-primary/15 text-primary";
    case "success":
      return "border-warehouse-success-border bg-warehouse-success-bg text-warehouse-success-fg";
    case "cancelled":
    case "rejected":
      return "border-warehouse-error-border bg-warehouse-error-bg text-warehouse-error-fg";
    case "":
      return "border-warehouse-status-inactive-border bg-warehouse-status-inactive-bg text-warehouse-status-inactive-fg";
  }
}

export function storeClaimStatusPillClass(status: StoreClaimStatusFilter): string {
  return cn(pillBase, tone(status));
}

export function storeClaimStatusChipClass(
  status: StoreClaimStatusFilter,
  active: boolean
): string {
  return cn(
    "h-8 rounded-full px-3 text-xs shadow-none",
    tone(status),
    active ? "ring-2 ring-primary" : "opacity-60 hover:opacity-100"
  );
}

export function storeClaimStatusChipBadgeClass(active: boolean): string {
  return cn(
    "ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded px-1 text-[10px] font-semibold tabular-nums",
    active ? "bg-primary text-primary-foreground" : "bg-background/70"
  );
}
