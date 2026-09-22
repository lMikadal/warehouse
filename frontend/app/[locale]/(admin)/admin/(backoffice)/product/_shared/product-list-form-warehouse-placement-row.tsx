"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { RemoteComboboxField } from "@/components/molecules/remote-combobox-field";
import { TableCell } from "@/components/ui/table";
import type { RemoteComboboxLoadContext } from "@/hooks/use-remote-combobox-options";
import type { RemoteComboboxOption } from "@/hooks/use-remote-combobox-options";
import {
  fetchWarehouseList,
  resolveWarehouseChainFromBin,
  type WarehouseCascadeLevel,
} from "@/lib/warehouse-api";

type Props = {
  binId: number;
  onBinChange: (binId: number) => void;
  readOnlyQty?: string;
  /** grid = product form row; table = table cells; stack = vertical cascade (receive panel). */
  layout?: "grid" | "table" | "stack";
  pathHints?: Partial<Record<WarehouseCascadeLevel, string>>;
  disabled?: boolean;
};

type Level = WarehouseCascadeLevel;

const CHAIN: Level[] = ["warehouse", "zone", "shelf", "rack", "bin"];

const EMPTY_IDS: Record<Level, string> = {
  warehouse: "",
  zone: "",
  shelf: "",
  rack: "",
  bin: "",
};

export function WarehousePlacementCascadeRow({
  binId,
  onBinChange,
  readOnlyQty,
  layout = "grid",
  pathHints,
  disabled: formDisabled = false,
}: Props) {
  const locale = useLocale();
  const tList = useTranslations("productList");
  const tFormPh = useTranslations("form");
  const [ids, setIds] = useState<Record<Level, string>>(() => ({
    ...EMPTY_IDS,
    bin: binId > 0 ? String(binId) : "",
  }));
  const [pinnedLabels, setPinnedLabels] = useState<
    Partial<Record<Level, string>>
  >({});
  const [hydrating, setHydrating] = useState(false);
  const pathHintsRef = useRef(pathHints);
  pathHintsRef.current = pathHints;

  useEffect(() => {
    if (binId <= 0) {
      setIds(EMPTY_IDS);
      setPinnedLabels({});
      setHydrating(false);
      return;
    }
    if (formDisabled) {
      setIds({ ...EMPTY_IDS, bin: String(binId) });
      const hints = pathHintsRef.current;
      if (hints) {
        const labels: Partial<Record<Level, string>> = {};
        for (const level of CHAIN) {
          const hint = hints[level];
          if (hint) labels[level] = hint;
        }
        setPinnedLabels(labels);
      }
      setHydrating(false);
      return;
    }
    let cancelled = false;
    setHydrating(true);
    void resolveWarehouseChainFromBin(locale, binId)
      .then((chain) => {
        if (cancelled) return;
        setIds(chain.ids);
        const labels: Partial<Record<Level, string>> = { ...chain.labels };
        const hints = pathHintsRef.current;
        if (hints) {
          for (const level of CHAIN) {
            const hint = hints[level];
            if (hint && chain.ids[level]) labels[level] = hint;
          }
        }
        setPinnedLabels(labels);
      })
      .catch(() => {
        if (!cancelled) {
          setIds({ ...EMPTY_IDS, bin: String(binId) });
          const hints = pathHintsRef.current;
          if (hints) {
            const labels: Partial<Record<Level, string>> = {};
            for (const level of CHAIN) {
              const hint = hints[level];
              if (hint) labels[level] = hint;
            }
            setPinnedLabels(labels);
          } else {
            setPinnedLabels({});
          }
        }
      })
      .finally(() => {
        if (!cancelled) setHydrating(false);
      });
    return () => {
      cancelled = true;
    };
  }, [binId, locale, formDisabled]);

  const pathHintsKey = pathHints
    ? CHAIN.map((level) => pathHints[level] ?? "").join("\0")
    : "";

  useEffect(() => {
    if (!pathHintsKey || binId <= 0) return;
    const hints = pathHintsRef.current;
    if (!hints) return;
    setPinnedLabels((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const level of CHAIN) {
        const hint = hints[level];
        if (hint && (formDisabled || ids[level])) {
          if (next[level] !== hint) {
            next[level] = hint;
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [pathHintsKey, binId, ids, formDisabled]);

  const readOnlyDisplayLabel = (level: Level) =>
    pathHints?.[level] ?? pinnedLabels[level] ?? "—";

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
    setPinnedLabels((prev) => {
      const copy = { ...prev };
      for (let i = idx; i < CHAIN.length; i++) {
        delete copy[CHAIN[i]!];
      }
      return copy;
    });
    const hadBin = ids.bin !== "";
    const binCleared = hadBin && next.bin === "";
    if (level === "bin") {
      onBinChange(value ? Number(value) : 0);
    } else if (!value || binCleared) {
      onBinChange(0);
    }
  };

  const parentFor = (level: Level): number | undefined => {
    const idx = CHAIN.indexOf(level);
    if (idx <= 0) return undefined;
    if (level === "rack") {
      const shelf = ids.shelf ? Number(ids.shelf) : 0;
      if (shelf > 0) return shelf;
      const zone = ids.zone ? Number(ids.zone) : 0;
      return zone > 0 ? zone : undefined;
    }
    if (level === "bin") {
      const rack = ids.rack ? Number(ids.rack) : 0;
      if (rack > 0) return rack;
      const shelf = ids.shelf ? Number(ids.shelf) : 0;
      // Zone-direct bins only when shelf/rack unset; shelf path requires rack first.
      if (shelf > 0) return undefined;
      const zone = ids.zone ? Number(ids.zone) : 0;
      return zone > 0 ? zone : undefined;
    }
    const parentLevel = CHAIN[idx - 1]!;
    const raw = ids[parentLevel];
    return raw ? Number(raw) : undefined;
  };

  const pinnedForLevel = useMemo(() => {
    const map = new Map<Level, RemoteComboboxOption[]>();
    for (const level of CHAIN) {
      const value = ids[level];
      const label = pinnedLabels[level];
      if (value && label) {
        map.set(level, [{ value, label }]);
      }
    }
    return map;
  }, [ids, pinnedLabels]);

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

  const levelFields = CHAIN.map((level) => {
    const parent = parentFor(level);
    const disabled =
      formDisabled ||
      hydrating ||
      (level !== "warehouse" && (parent == null || parent <= 0));
    const placeholder = tFormPh("placeholder.select", {
      label: labelKey(level),
    });
    return (
      <RemoteComboboxField
        key={`${level}-${parent ?? "none"}`}
        label={layout === "table" ? "" : labelKey(level)}
        value={ids[level]}
        onValueChange={(v) => setLevel(level, v)}
        placeholder={placeholder}
        emptyLabel="—"
        disabled={disabled}
        showClear={level === "bin"}
        inputClassName="w-full min-w-[8rem]"
        pinnedItems={pinnedForLevel.get(level) ?? []}
        onLoadOptions={(ctx) => loadLevel(level, parent)(ctx)}
      />
    );
  });

  if (layout === "table") {
    return (
      <>
        {formDisabled
          ? CHAIN.map((level) => (
              <TableCell key={level} className="min-w-36">
                <span className="text-sm">{readOnlyDisplayLabel(level)}</span>
              </TableCell>
            ))
          : CHAIN.map((level, i) => (
              <TableCell key={level} className="min-w-36">
                {levelFields[i]}
              </TableCell>
            ))}
      </>
    );
  }

  if (layout === "stack") {
    return <div className="grid gap-3">{levelFields}</div>;
  }

  return (
    <div className="grid gap-2 lg:grid-cols-[repeat(5,minmax(0,1fr))_5rem]">
      {levelFields}
      <div className="flex flex-col justify-end gap-1">
        <span className="text-muted-foreground text-xs">
          {tList("wpLabelQty")}
        </span>
        <span className="text-right font-medium tabular-nums">
          {readOnlyQty ?? "—"}
        </span>
      </div>
    </div>
  );
}
