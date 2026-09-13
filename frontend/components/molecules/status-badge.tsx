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
          ? "bg-[var(--color-success-bg)] text-[var(--color-success-fg)]"
          : "bg-[var(--color-status-inactive-bg)] text-[var(--color-status-inactive-fg)]",
        className
      )}
    >
      {active ? t("active") : t("inactive")}
    </Badge>
  );
}
