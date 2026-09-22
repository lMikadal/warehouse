import type { TicketStatus } from "@/lib/order-ticket-api";
import { cn } from "@/lib/utils";

const pillBase =
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium";

export type TicketStatusFilter = TicketStatus | "";

/** v1 filter chip order (ORDER_TICKET_STATUS_FILTER_ORDER). */
export const TICKET_STATUS_FILTER_ORDER: TicketStatus[] = [
  "draft",
  "pending",
  "approved",
  "received",
  "completed",
  "rejected",
  "cancelled",
];

function tone(status: TicketStatusFilter): string {
  switch (status) {
    case "pending":
      return "border-warehouse-warning-border bg-warehouse-warning-bg text-warehouse-warning-fg";
    case "approved":
      return "border-primary/30 bg-primary/10 text-primary";
    case "received":
      return "border-primary/40 bg-primary/15 text-primary";
    case "completed":
      return "border-warehouse-success-border bg-warehouse-success-bg text-warehouse-success-fg";
    case "rejected":
    case "cancelled":
      return "border-warehouse-error-border bg-warehouse-error-bg text-warehouse-error-fg";
    case "draft":
    case "":
      return "border-warehouse-status-inactive-border bg-warehouse-status-inactive-bg text-warehouse-status-inactive-fg";
  }
}

export function ticketStatusPillClass(status: TicketStatusFilter): string {
  return cn(pillBase, tone(status));
}

export function ticketStatusChipClass(
  status: TicketStatusFilter,
  active: boolean
): string {
  return cn(
    "h-8 rounded-md px-3 text-xs shadow-none",
    tone(status),
    active ? "ring-2 ring-primary" : "opacity-60 hover:opacity-100"
  );
}

export function ticketStatusChipBadgeClass(active: boolean): string {
  return cn(
    "ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded px-1 text-[10px] font-semibold tabular-nums",
    active ? "bg-primary text-primary-foreground" : "bg-background/70"
  );
}
