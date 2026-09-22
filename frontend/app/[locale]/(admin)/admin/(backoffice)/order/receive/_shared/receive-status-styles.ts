import type { PurchaseListItem } from "@/lib/order-purchase-api";
import type { ReceiveStatusFilter } from "@/lib/order-receive-api";
import { cn } from "@/lib/utils";

const pillBase =
  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium";

/** v1 chip order on the receive list: all, pending receive, partial, received, rejected. */
export const RECEIVE_STATUS_FILTER_ORDER: ReceiveStatusFilter[] = [
  "completed",
  "receive_partial",
  "receive_completed",
  "reject",
];

/**
 * v1 derived "partially received" in the table because its order status could not express it. The
 * warehouse status can, but an order still sitting at `completed` with some lines already received
 * reads as partial too, so the display folds both cases together.
 */
export function receiveDisplayStatus(
  row: Pick<
    PurchaseListItem,
    "status" | "approved_item_count" | "total_qty" | "item_reject_count"
  >
): ReceiveStatusFilter {
  if (row.status === "receive_partial") return "receive_partial";
  if (row.status !== "completed") {
    return row.status === "receive_completed" ? "receive_completed" : "completed";
  }
  const approved = row.approved_item_count ?? 0;
  const denom = (row.total_qty ?? 0) + (row.item_reject_count ?? 0);
  if (approved > 0 && approved < denom) return "receive_partial";
  return "completed";
}

function tone(status: ReceiveStatusFilter): string {
  switch (status) {
    case "completed":
      return "border-warehouse-warning-border bg-warehouse-warning-bg text-warehouse-warning-fg";
    case "receive_partial":
      return "border-primary/40 bg-primary/15 text-primary";
    case "receive_completed":
      return "border-warehouse-success-border bg-warehouse-success-bg text-warehouse-success-fg";
    case "reject":
      return "border-warehouse-error-border bg-warehouse-error-bg text-warehouse-error-fg";
    case "":
      return "border-warehouse-status-inactive-border bg-warehouse-status-inactive-bg text-warehouse-status-inactive-fg";
  }
}

export function receiveStatusPillClass(status: ReceiveStatusFilter): string {
  return cn(pillBase, tone(status));
}

export function receiveStatusChipClass(
  status: ReceiveStatusFilter,
  active: boolean
): string {
  return cn(
    "h-8 rounded-full px-3 text-xs shadow-none",
    tone(status),
    active ? "ring-2 ring-primary" : "opacity-60 hover:opacity-100"
  );
}

export function receiveStatusChipBadgeClass(active: boolean): string {
  return cn(
    "ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded px-1 text-[10px] font-semibold tabular-nums",
    active ? "bg-primary text-primary-foreground" : "bg-background/70"
  );
}
