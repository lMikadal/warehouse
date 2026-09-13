"use client";

import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusBadgeProps = {
  active: boolean;
  className?: string;
};

export function StatusBadge({ active, className }: StatusBadgeProps) {
  const t = useTranslations("col");

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
      {active ? t("active") : t("inactive")}
    </Badge>
  );
}
