import type { ClaimListItem, ClaimStatus, ClaimStatusFilter } from "@/lib/order-claim-api";
import { cn } from "@/lib/utils";

const pillBase =
  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium";

/** v1 chip order: all, pending, under review, completed, rejected. */
export const CLAIM_STATUS_FILTER_ORDER: ClaimStatus[] = [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
];

function tone(status: ClaimStatusFilter): string {
  switch (status) {
    case "pending":
      return "border-warehouse-warning-border bg-warehouse-warning-bg text-warehouse-warning-fg";
    case "in_progress":
      return "border-primary/40 bg-primary/15 text-primary";
    case "completed":
      return "border-warehouse-success-border bg-warehouse-success-bg text-warehouse-success-fg";
    case "cancelled":
      return "border-warehouse-error-border bg-warehouse-error-bg text-warehouse-error-fg";
    case "":
      return "border-warehouse-status-inactive-border bg-warehouse-status-inactive-bg text-warehouse-status-inactive-fg";
  }
}

export function claimStatusPillClass(status: ClaimStatusFilter): string {
  return cn(pillBase, tone(status));
}

export function claimStatusChipClass(
  status: ClaimStatusFilter,
  active: boolean
): string {
  return cn(
    "h-8 rounded-full px-3 text-xs shadow-none",
    tone(status),
    active ? "ring-2 ring-primary" : "opacity-60 hover:opacity-100"
  );
}

export function claimStatusChipBadgeClass(active: boolean): string {
  return cn(
    "ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded px-1 text-[10px] font-semibold tabular-nums",
    active ? "bg-primary text-primary-foreground" : "bg-background/70"
  );
}

/**
 * v1's "รับเรื่อง/ส่งของ" column: how far a discrepancy has travelled, as a fraction of its quantity.
 * Nothing has moved while it waits, one unit counts as under way, and settling counts the lot.
 */
export function claimProgress(
  row: Pick<ClaimListItem, "status" | "qty">
): { done: number; total: number } {
  const total = Math.max(1, row.qty);
  if (row.status === "completed") return { done: total, total };
  if (row.status === "in_progress") return { done: 1, total };
  return { done: 0, total };
}

/** The line total the claim is worth, VAT included — what the supplier is being asked for. */
export function claimNetIncVat(
  row: Pick<ClaimListItem, "qty" | "price" | "vat_rate">
): number {
  return row.qty * row.price * (1 + row.vat_rate / 100);
}
