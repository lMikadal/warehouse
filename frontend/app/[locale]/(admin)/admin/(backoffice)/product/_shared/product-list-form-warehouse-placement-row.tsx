"use client";

import { useCallback, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { RemoteComboboxField } from "@/components/molecules/remote-combobox-field";
import type { RemoteComboboxLoadContext } from "@/hooks/use-remote-combobox-options";
import { fetchWarehouseList } from "@/lib/warehouse-api";

type Props = {
  binId: number;
  onBinChange: (binId: number) => void;
  readOnlyQty?: string;
};

type Level = "warehouse" | "zone" | "shelf" | "rack" | "bin";

const CHAIN: Level[] = ["warehouse", "zone", "shelf", "rack", "bin"];

export function WarehousePlacementCascadeRow({
  binId,
  onBinChange,
  readOnlyQty,
}: Props) {
  const locale = useLocale();
  const tList = useTranslations("productList");
  const [ids, setIds] = useState<Record<Level, string>>({
    warehouse: "",
    zone: "",
    shelf: "",
    rack: "",
    bin: binId > 0 ? String(binId) : "",
  });

  const loadLevel = useCallback(
    (level: Level, parentId?: number) =>
      async (ctx: RemoteComboboxLoadContext) => {
        const res = await fetchWarehouseList(locale, {
          page: 1,
          limit: 50,
          type: level,
          parentId: parentId ?? undefined,
        });
        if (ctx.signal.aborted) return [];
        return res.items.map((r) => ({
          value: String(r.id),
          label: r.name || r.sku,
        }));
      },
    [locale]
  );

  const setLevel = (level: Level, value: string) => {
    const idx = CHAIN.indexOf(level);
    const next: Record<Level, string> = { ...ids, [level]: value };
    for (let i = idx + 1; i < CHAIN.length; i++) {
      next[CHAIN[i]!] = "";
    }
    setIds(next);
    if (level === "bin") {
      onBinChange(value ? Number(value) : 0);
    } else if (!value) {
      onBinChange(0);
    }
  };

  const parentFor = (level: Level): number | undefined => {
    const idx = CHAIN.indexOf(level);
    if (idx <= 0) return undefined;
    const parentLevel = CHAIN[idx - 1]!;
    const raw = ids[parentLevel];
    return raw ? Number(raw) : undefined;
  };

  const labelKey = (level: Level) => {
    switch (level) {
      case "warehouse":
        return tList("wpLabelWarehouse");
      case "zone":
        return tList("wpLabelZone");
      case "shelf":
        return tList("wpLabelShelf");
      case "rack":
        return tList("wpLabelRack");
      default:
        return tList("wpLabelBin");
    }
  };

  return (
    <div className="grid gap-2 lg:grid-cols-[repeat(5,minmax(0,1fr))_5rem]">
      {CHAIN.map((level) => {
        const parent = parentFor(level);
        const disabled =
          level !== "warehouse" && (parent == null || parent <= 0);
        return (
          <RemoteComboboxField
            key={level}
            label={labelKey(level)}
            value={ids[level]}
            onValueChange={(v) => setLevel(level, v)}
            placeholder=""
            emptyLabel="—"
            disabled={disabled}
            showClear={level === "bin"}
            inputClassName="w-full min-w-0"
            onLoadOptions={(ctx) => loadLevel(level, parent)(ctx)}
          />
        );
      })}
      <div className="flex flex-col justify-end gap-1">
        <span className="text-muted-foreground text-xs">{tList("wpLabelQty")}</span>
        <span className="text-right font-medium tabular-nums">{readOnlyQty ?? "—"}</span>
      </div>
    </div>
  );
}
