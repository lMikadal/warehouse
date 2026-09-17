"use client";

import { useTranslations } from "next-intl";

const ITEMS = [
  { key: "empty", className: "bg-muted-foreground/30" },
  { key: "low", className: "bg-green-600" },
  { key: "mid", className: "bg-orange-600" },
  { key: "high", className: "bg-red-600" },
] as const;

export function WarehouseViewLegend() {
  const tWh = useTranslations("warehouse");

  return (
    <ul className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
      {ITEMS.map(({ key, className }) => (
        <li key={key} className="inline-flex items-center gap-1.5">
          <span
            className={`inline-block size-2.5 rounded-full ${className}`}
            aria-hidden
          />
          {tWh(`legendCapacity.${key}`)}
        </li>
      ))}
    </ul>
  );
}
