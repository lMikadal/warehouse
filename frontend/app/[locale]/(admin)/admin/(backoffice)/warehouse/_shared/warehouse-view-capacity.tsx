"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import type { NodeCapacity } from "./warehouse-tree-utils";

type Props = {
  cap: NodeCapacity;
  className?: string;
};

function capacityTone(pct: number): string {
  if (pct <= 0) return "empty";
  if (pct >= 100) return "high";
  if (pct >= 80) return "mid";
  return "low";
}

const FILL: Record<string, string> = {
  empty: "bg-muted-foreground/30",
  low: "bg-green-600",
  mid: "bg-orange-600",
  high: "bg-red-600",
};

export function WarehouseViewCapacity({ cap, className }: Props) {
  const tWh = useTranslations("warehouse");
  const tone = capacityTone(cap.pct);

  return (
    <div className={cn("flex min-w-[6rem] max-w-[8rem] flex-1 flex-col gap-0.5", className)}>
      <span className="self-end text-xs font-medium tabular-nums">{cap.pct}%</span>
      <div className="bg-muted/60 h-1.5 overflow-hidden rounded-full">
        <div
          className={cn("h-full rounded-full transition-[width]", FILL[tone])}
          style={{ width: `${Math.min(100, cap.pct)}%` }}
        />
      </div>
      <span className="text-muted-foreground truncate text-xs whitespace-nowrap">
        {tWh("capacityShort", { used: cap.used, total: cap.total })}
      </span>
    </div>
  );
}
