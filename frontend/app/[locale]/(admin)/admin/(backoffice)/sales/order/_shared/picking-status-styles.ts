import type { PickingItemStatus, PickingStatus } from "@/lib/order-picking-api";
import { cn } from "@/lib/utils";

const pillBase =
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium";

const inactive =
  "border-warehouse-status-inactive-border bg-warehouse-status-inactive-bg text-warehouse-status-inactive-fg";
const warning =
  "border-warehouse-warning-border bg-warehouse-warning-bg text-warehouse-warning-fg";
const success =
  "border-warehouse-success-border bg-warehouse-success-bg text-warehouse-success-fg";
const error =
  "border-warehouse-error-border bg-warehouse-error-bg text-warehouse-error-fg";
const info = "border-primary/30 bg-primary/10 text-primary";

export function pickingStatusPillClass(
  status: PickingStatus | "",
  options?: { allFilterActive?: boolean }
): string {
  switch (status) {
    case "":
      return cn(
        pillBase,
        options?.allFilterActive
          ? "border-primary bg-primary text-primary-foreground"
          : inactive
      );
    case "pending":
      return cn(pillBase, warning);
    case "in_progress":
      return cn(pillBase, info);
    case "success":
      return cn(pillBase, success);
    case "fail":
      return cn(pillBase, error);
  }
}

/** The line badge doubles as the store-check toggle, so `in_progress` reads as "checked at the shop". */
export function pickingItemStatusPillClass(status: PickingItemStatus): string {
  switch (status) {
    case "pending":
      return cn(pillBase, info);
    case "in_progress":
      return cn(pillBase, warning);
    case "success":
      return cn(pillBase, success);
  }
}

export function pickingStatusFilterButtonClass(
  status: PickingStatus | "",
  active: boolean
): string {
  return cn(
    "cursor-pointer rounded-full border-0 bg-transparent p-0 font-inherit",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    status !== "" && active && "ring-2 ring-primary"
  );
}
