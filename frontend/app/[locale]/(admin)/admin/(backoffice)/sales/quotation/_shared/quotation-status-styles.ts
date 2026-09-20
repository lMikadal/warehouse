import type { QuotationStatus } from "@/lib/order-quotation-api";
import { cn } from "@/lib/utils";

const pillBase =
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium";

export type QuotationStatusFilter = QuotationStatus | "" | "overdue";

export function quotationStatusPillClass(
  status: QuotationStatusFilter,
  options?: { allFilterActive?: boolean }
): string {
  if (status === "") {
    if (options?.allFilterActive) {
      return cn(pillBase, "border-primary bg-primary text-primary-foreground");
    }
    return cn(
      pillBase,
      "border-warehouse-status-inactive-border bg-warehouse-status-inactive-bg text-warehouse-status-inactive-fg"
    );
  }
  if (status === "overdue") {
    return cn(
      pillBase,
      "border-warehouse-error-border bg-warehouse-error-bg text-warehouse-error-fg"
    );
  }
  switch (status) {
    case "draft":
      return cn(
        pillBase,
        "border-warehouse-status-inactive-border bg-warehouse-status-inactive-bg text-warehouse-status-inactive-fg"
      );
    case "pending":
      return cn(
        pillBase,
        "border-warehouse-warning-border bg-warehouse-warning-bg text-warehouse-warning-fg"
      );
    case "approved":
      return cn(
        pillBase,
        "border-primary/30 bg-primary/10 text-primary"
      );
    case "success":
      return cn(
        pillBase,
        "border-warehouse-success-border bg-warehouse-success-bg text-warehouse-success-fg"
      );
    case "cancelled":
    case "rejected":
      return cn(
        pillBase,
        "border-warehouse-error-border bg-warehouse-error-bg text-warehouse-error-fg"
      );
  }
}

const noticeBase = "rounded-md border px-3 py-2 text-sm";

/** Full-width return/reject notice on draft form (maps next_status to warehouse tokens). */
export function quotationRejectNoticeClass(nextStatus: QuotationStatus): string {
  switch (nextStatus) {
    case "pending":
    case "draft":
      return cn(
        noticeBase,
        "border-warehouse-warning-border bg-warehouse-warning-bg text-warehouse-warning-fg"
      );
    case "cancelled":
    case "rejected":
      return cn(
        noticeBase,
        "border-warehouse-error-border bg-warehouse-error-bg text-warehouse-error-fg"
      );
    case "success":
    case "approved":
      return cn(
        noticeBase,
        "border-warehouse-success-border bg-warehouse-success-bg text-warehouse-success-fg"
      );
    default:
      return cn(noticeBase, "border-border bg-muted/40 text-foreground");
  }
}

export function quotationStatusFilterButtonClass(
  status: QuotationStatusFilter,
  active: boolean
): string {
  return cn(
    "cursor-pointer rounded-full border-0 bg-transparent p-0 font-inherit",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    status !== "" && active && "ring-2 ring-primary"
  );
}
