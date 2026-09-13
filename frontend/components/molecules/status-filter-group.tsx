"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type StatusFilterValue = "" | "active" | "inactive";

export type StatusFilterGroupProps = {
  value: StatusFilterValue;
  onChange: (value: StatusFilterValue) => void;
  className?: string;
};

const OPTIONS: { value: StatusFilterValue; labelKey: "filterAll" | "active" | "inactive" }[] =
  [
    { value: "", labelKey: "filterAll" },
    { value: "active", labelKey: "active" },
    { value: "inactive", labelKey: "inactive" },
  ];

export function StatusFilterGroup({
  value,
  onChange,
  className,
}: StatusFilterGroupProps) {
  const tCrud = useTranslations("crud");
  const tCol = useTranslations("col");

  return (
    <div
      role="group"
      aria-label={tCrud("statusFilter")}
      className={cn(
        "inline-flex overflow-hidden rounded-lg border border-border",
        className
      )}
    >
      {OPTIONS.map((opt, index) => {
        const active = value === opt.value;
        const label =
          opt.labelKey === "filterAll"
            ? tCrud("filterAll")
            : tCol(opt.labelKey);
        return (
          <Button
            key={opt.value || "all"}
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={active}
            className={cn(
              "rounded-none border-0 px-3 shadow-none",
              index > 0 && "border-l border-border",
              active && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
            )}
            onClick={() => onChange(opt.value)}
          >
            {label}
          </Button>
        );
      })}
    </div>
  );
}
