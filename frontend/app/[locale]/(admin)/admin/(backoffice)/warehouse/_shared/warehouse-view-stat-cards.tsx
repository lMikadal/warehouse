"use client";

import { Box, ChartPie } from "lucide-react";
import { useTranslations } from "next-intl";

import type { ViewStats } from "./warehouse-tree-utils";
import { WAREHOUSE_SLOT_TYPE_ICON } from "./warehouse-type-icons";

type Props = {
  stats: ViewStats;
};

export function WarehouseViewStatCards({ stats }: Props) {
  const tWh = useTranslations("warehouse");

  const cards = [
    {
      key: "zone",
      icon: Box,
      iconClass: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
      label: tWh("statTotalZones"),
      value: stats.zones,
      unit: tWh("zonesUnit"),
    },
    {
      key: "shelf",
      icon: WAREHOUSE_SLOT_TYPE_ICON.shelf,
      iconClass: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
      label: tWh("statTotalShelves"),
      value: stats.shelves,
      unit: tWh("typeShelf"),
    },
    {
      key: "rack",
      icon: WAREHOUSE_SLOT_TYPE_ICON.rack,
      iconClass: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
      label: tWh("statTotalRacks"),
      value: stats.racks,
      unit: tWh("typeRack"),
    },
    {
      key: "bin",
      icon: WAREHOUSE_SLOT_TYPE_ICON.bin,
      iconClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
      label: tWh("statTotalBins"),
      value: stats.bins,
      unit: tWh("typeBin"),
    },
    {
      key: "capacity",
      icon: ChartPie,
      iconClass: "bg-primary/15 text-primary",
      label: tWh("statCapacityUsed"),
      value: `${stats.capacityPct}%`,
      unit: "",
      subtitle: tWh("statCapacityOfTotal"),
    },
  ] as const;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((c) => (
        <div
          key={c.key}
          className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"
        >
          <div
            className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${c.iconClass}`}
          >
            <c.icon className="size-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-muted-foreground text-xs">{c.label}</div>
            <div className="flex flex-wrap items-baseline gap-1">
              <span className="text-2xl font-semibold tabular-nums">
                {c.value}
              </span>
              {c.unit ? (
                <span className="text-muted-foreground text-sm">{c.unit}</span>
              ) : null}
            </div>
            {"subtitle" in c && c.subtitle ? (
              <div className="text-muted-foreground mt-0.5 text-xs">
                {c.subtitle}
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
