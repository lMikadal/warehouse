"use client";

import { ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { DisplayLocale } from "@/lib/format-datetime";
import type { ListCarBody } from "@/lib/product-list-api";
import type { ProductAttributeRow } from "@/lib/product-attribute-api";
import {
  carBrands,
  carPathFromRow,
  childrenOf,
  fetchAllActiveCars,
  filterBrandsBySearch,
  hasChildren,
} from "@/lib/product-car-cascade";
import { cn } from "@/lib/utils";

const GEAR_OPTIONS = ["auto", "manual"] as const;
const CAR_COLUMN_DEPTHS = [0, 1, 2] as const;

function cascadeColumnClass(depth: number): string {
  return cn(
    "flex min-h-0 min-w-0 max-h-72 flex-1 flex-col border-r border-border",
    depth === 2 && "last:border-r-0"
  );
}

export type ProductCarCascadeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: ListCarBody | null;
  onConfirm: (row: ListCarBody) => void;
  loadCars?: (locale: DisplayLocale) => Promise<ProductAttributeRow[]>;
  catalog?: ProductAttributeRow[];
};

export function ProductCarCascadeDialog({
  open,
  onOpenChange,
  initial,
  onConfirm,
  loadCars = fetchAllActiveCars,
  catalog,
}: ProductCarCascadeDialogProps) {
  const locale = useLocale() as DisplayLocale;
  const tForm = useTranslations("productListForm");
  const tList = useTranslations("productList");
  const tAttr = useTranslations("productAttr");
  const tCrud = useTranslations("crud");
  const tFormPh = useTranslations("form");
  const tError = useTranslations("error");

  const isEdit = initial != null;

  const gearLabel = useCallback(
    (value: string) => {
      if (value === "manual") return tList("gearManual");
      if (value === "auto") return tList("gearAuto");
      return value || "—";
    },
    [tList]
  );

  const [rows, setRows] = useState<ProductAttributeRow[]>(catalog ?? []);
  const [loading, setLoading] = useState(false);
  const [pickerPath, setPickerPath] = useState<number[]>([]);
  const [brandSearch, setBrandSearch] = useState("");
  const [yearStart, setYearStart] = useState<string>("");
  const [yearEnd, setYearEnd] = useState<string>("");
  const [gearType, setGearType] = useState<string>("auto");
  const [cascadeError, setCascadeError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setBrandSearch("");
    setCascadeError(null);
    setYearStart(
      initial?.year_start != null ? String(initial.year_start) : ""
    );
    setYearEnd(initial?.year_end != null ? String(initial.year_end) : "");
    setGearType(initial?.gear_type ?? "auto");

    const seedPath = (data: ProductAttributeRow[]) =>
      carPathFromRow(
        data,
        initial?.product_attribute_brand_id,
        initial?.product_attribute_model_id,
        initial?.product_attribute_engine_id
      );

    if (catalog?.length) {
      setRows(catalog);
      setPickerPath(seedPath(catalog));
      return;
    }

    setLoading(true);
    void loadCars(locale)
      .then((data) => {
        if (cancelled) return;
        setRows(data);
        setPickerPath(seedPath(data));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, locale, loadCars, initial, catalog]);

  useEffect(() => {
    if (catalog?.length) setRows(catalog);
  }, [catalog]);

  const brandItems = useMemo(() => {
    const brands = carBrands(rows);
    return filterBrandsBySearch(brands, brandSearch);
  }, [rows, brandSearch]);

  const columnHeader = (depth: number) => {
    if (depth === 0) return tAttr("carBrand");
    if (depth === 1) return tAttr("carModel");
    return tAttr("carLevel.engine");
  };

  const columnItems = (depth: number): ProductAttributeRow[] => {
    if (depth === 0) return brandItems;
    if (depth === 1) {
      const brandId = pickerPath[0];
      if (!brandId) return [];
      return childrenOf(rows, brandId);
    }
    const modelId = pickerPath[1];
    if (!modelId) return [];
    return childrenOf(rows, modelId);
  };

  const columnPlaceholder = (depth: number) => {
    if (depth === 1 && !pickerPath[0]) return tForm("carPickBrandFirst");
    if (depth === 2 && !pickerPath[1]) return tForm("carPickModelFirst");
    return null;
  };

  const handleColumnPick = useCallback((depth: number, id: number) => {
    setCascadeError(null);
    setPickerPath((prev) => {
      const next = prev.slice(0, depth);
      next[depth] = id;
      return next;
    });
  }, []);

  const handleConfirm = () => {
    const brandId = pickerPath[0];
    const modelId = pickerPath[1];
    const engineId = pickerPath[2];
    if (!brandId || !modelId || !engineId) {
      setCascadeError(tError("required"));
      return;
    }
    const body: ListCarBody = {
      ...(initial?.id != null ? { id: initial.id } : {}),
      product_attribute_brand_id: brandId,
      product_attribute_model_id: modelId,
      product_attribute_engine_id: engineId,
      gear_type: gearType || "auto",
      year_start: yearStart.trim() ? Number(yearStart) : null,
      year_end: yearEnd.trim() ? Number(yearEnd) : null,
    };
    onConfirm(body);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-[min(44rem,96vw)]">
        <DialogHeader>
          <DialogTitle>{tForm("carDialogTitle")}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <Field className="gap-1.5">
            <FieldLabel htmlFor="car-brand-search">
              {tForm("carBrandSearchLabel")}
            </FieldLabel>
            <Input
              id="car-brand-search"
              type="search"
              value={brandSearch}
              onChange={(e) => setBrandSearch(e.target.value)}
              placeholder={tForm("carBrandSearchPlaceholder")}
              autoComplete="off"
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-stretch">
            <div className="min-w-0 w-full overflow-hidden rounded-lg border border-border bg-background">
              {loading ? (
                <div className="flex w-full gap-2 p-3">
                  <Skeleton className="h-64 min-w-0 flex-1" />
                  <Skeleton className="h-64 min-w-0 flex-1" />
                  <Skeleton className="h-64 min-w-0 flex-1" />
                </div>
              ) : (
                <div className="flex w-full max-h-72 overflow-x-auto">
                  {CAR_COLUMN_DEPTHS.map((depth) => {
                    const placeholder = columnPlaceholder(depth);
                    const items = columnItems(depth);
                    const activeId = pickerPath[depth] ?? null;
                    return (
                      <div
                        key={depth}
                        className={cascadeColumnClass(depth)}
                      >
                        <div className="border-b border-border bg-muted/40 px-2.5 py-1.5 text-xs font-medium">
                          {columnHeader(depth)}
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto">
                          {placeholder ? (
                            <p className="text-muted-foreground p-4 text-center text-sm">
                              {placeholder}
                            </p>
                          ) : items.length === 0 ? (
                            <p className="text-muted-foreground p-4 text-center text-sm">
                              {tError("noData")}
                            </p>
                          ) : (
                            items.map((row) => {
                              const active = activeId === row.id;
                              const kids = hasChildren(rows, row.id);
                              return (
                                <button
                                  key={row.id}
                                  type="button"
                                  className={cn(
                                    "hover:bg-muted flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left text-sm",
                                    active &&
                                      "bg-muted text-primary font-medium"
                                  )}
                                  onClick={() =>
                                    handleColumnPick(depth, row.id)
                                  }
                                >
                                  <span
                                    className="min-w-0 truncate"
                                    title={row.name}
                                  >
                                    {row.name}
                                  </span>
                                  {kids && depth < 2 ? (
                                    <ChevronRight
                                      className="size-4 shrink-0 opacity-60"
                                      aria-hidden
                                    />
                                  ) : null}
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="min-w-0 w-full space-y-3 rounded-lg border border-border p-3">
              <Field className="gap-1.5">
                <FieldLabel>{tForm("carYearAdLabel")}</FieldLabel>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={yearStart}
                    placeholder={tFormPh("placeholder.input", {
                      label: tList("colYear"),
                    })}
                    onChange={(e) => setYearStart(e.target.value)}
                  />
                  <span className="text-muted-foreground shrink-0">–</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={yearEnd}
                    placeholder={tFormPh("placeholder.input", {
                      label: tForm("yearEnd"),
                    })}
                    onChange={(e) => setYearEnd(e.target.value)}
                  />
                </div>
              </Field>
              <Field className="gap-1.5">
                <FieldLabel>{tList("colGear")}</FieldLabel>
                <Select
                  value={gearType}
                  onValueChange={(v) => setGearType(v ?? "auto")}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={tFormPh("placeholder.select", {
                        label: tList("colGear"),
                      })}
                    >
                      {gearLabel(gearType)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {GEAR_OPTIONS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g === "manual"
                          ? tList("gearManual")
                          : tList("gearAuto")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </div>

          {cascadeError ? (
            <FieldError role="alert">{cascadeError}</FieldError>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => onOpenChange(false)}
          >
            {tCrud("btn.cancel")}
          </Button>
          <Button type="button" size="lg" onClick={handleConfirm}>
            {isEdit ? tCrud("btn.save") : tCrud("btn.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
