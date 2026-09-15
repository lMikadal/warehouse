"use client";

import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const USER_ACCOUNT_STATUSES = [
  "active",
  "inactive",
  "suspended",
  "locked",
] as const;

export type UserAccountStatus = (typeof USER_ACCOUNT_STATUSES)[number];

export type StatusBadgeProps = {
  /** Binary active/inactive (col.* labels). Ignored when `userStatus` is set. */
  active?: boolean;
  /** Admin user account status (userStatus.* labels). */
  userStatus?: UserAccountStatus;
  className?: string;
};

function normalizeUserStatus(
  status: UserAccountStatus | undefined
): UserAccountStatus {
  if (status && USER_ACCOUNT_STATUSES.includes(status)) return status;
  return "inactive";
}

function userStatusStyle(status: UserAccountStatus): string {
  switch (status) {
    case "active":
      return "bg-warehouse-success-bg text-warehouse-success-fg";
    case "inactive":
      return "bg-warehouse-status-inactive-bg text-warehouse-status-inactive-fg";
    case "suspended":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
    case "locked":
      return "bg-red-500/15 text-red-700 dark:text-red-400";
  }
}

export function StatusBadge({
  active = false,
  userStatus,
  className,
}: StatusBadgeProps) {
  const tCol = useTranslations("col");
  const tUserStatus = useTranslations("userStatus");

  if (userStatus !== undefined) {
    const key = normalizeUserStatus(userStatus);
    return (
      <Badge
        className={cn(
          "rounded-full border-transparent font-medium",
          userStatusStyle(key),
          className
        )}
      >
        {tUserStatus(key)}
      </Badge>
    );
  }

  return (
    <Badge
      className={cn(
        "rounded-full border-transparent font-medium",
        active
          ? "bg-warehouse-success-bg text-warehouse-success-fg"
          : "bg-warehouse-status-inactive-bg text-warehouse-status-inactive-fg",
        className
      )}
    >
      {active ? tCol("active") : tCol("inactive")}
    </Badge>
  );
}
