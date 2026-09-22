import {
  PURCHASE_ORDERED_STATUS_FILTER,
  type PurchaseItemStatus,
  type PurchaseStatus,
} from "@/lib/order-purchase-api";
import { cn } from "@/lib/utils";

const pillBase =
  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium";

/** "" is the all-chip and `ordered` folds completed + both receive states into one chip. */
export type PurchaseStatusFilter =
  | PurchaseStatus
  | typeof PURCHASE_ORDERED_STATUS_FILTER
  | "";

/** v1 chip order on the PO list: all, draft, pending, paying, revision, ordered, cancelled. */
export const PURCHASE_STATUS_FILTER_ORDER: PurchaseStatusFilter[] = [
  "draft",
  "pending",
  "paying",
  "rejected",
  PURCHASE_ORDERED_STATUS_FILTER,
  "cancelled",
];

function tone(status: PurchaseStatusFilter): string {
  switch (status) {
    case "pending":
      return "border-warehouse-warning-border bg-warehouse-warning-bg text-warehouse-warning-fg";
    case "paying":
      return "border-primary/30 bg-primary/10 text-primary";
    case "completed":
    case PURCHASE_ORDERED_STATUS_FILTER:
      return "border-primary/40 bg-primary/15 text-primary";
    case "receive_completed":
      return "border-warehouse-success-border bg-warehouse-success-bg text-warehouse-success-fg";
    case "receive_partial":
    case "rejected":
    case "cancelled":
      return "border-warehouse-error-border bg-warehouse-error-bg text-warehouse-error-fg";
    case "draft":
    case "":
      return "border-warehouse-status-inactive-border bg-warehouse-status-inactive-bg text-warehouse-status-inactive-fg";
  }
}

export function purchaseStatusPillClass(status: PurchaseStatusFilter): string {
  return cn(pillBase, tone(status));
}

export function purchaseStatusChipClass(
  status: PurchaseStatusFilter,
  active: boolean
): string {
  return cn(
    "h-8 rounded-full px-3 text-xs shadow-none",
    tone(status),
    active ? "ring-2 ring-primary" : "opacity-60 hover:opacity-100"
  );
}

export function purchaseStatusChipBadgeClass(active: boolean): string {
  return cn(
    "ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded px-1 text-[10px] font-semibold tabular-nums",
    active ? "bg-primary text-primary-foreground" : "bg-background/70"
  );
}

export function purchaseItemStatusPillClass(status: PurchaseItemStatus): string {
  switch (status) {
    case "approved":
      return cn(pillBase, tone("paying"));
    case "receive_approved":
      return cn(pillBase, tone("receive_completed"));
    case "rejected":
    case "receive_rejected":
      return cn(pillBase, tone("cancelled"));
    case "pending":
      return cn(pillBase, tone("pending"));
  }
}
