"use client";

import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback } from "react";

import { RemoteComboboxField } from "@/components/molecules/remote-combobox-field";
import { Button } from "@/components/ui/button";
import { ButtonIcon } from "@/components/ui/button-icon";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RemoteComboboxLoadContext } from "@/hooks/use-remote-combobox-options";
import type { DisplayLocale } from "@/lib/format-datetime";
import {
  fetchProductListFilters,
  filterItemsToComboboxOptions,
} from "@/lib/product-filters-api";
import type { ListCarBody } from "@/lib/product-list-api";

const GEAR_TYPES = ["manual", "auto", "cvt", "dct", "other"] as const;

function emptyCar(): ListCarBody {
  return {
    product_attribute_engine_id: 0,
    gear_type: null,
    year_start: null,
    year_end: null,
  };
}

type Props = {
  locale: DisplayLocale;
  cars: ListCarBody[];
  onChange: (cars: ListCarBody[]) => void;
};

export function ProductListFormCars({ locale, cars, onChange }: Props) {
  const tForm = useTranslations("productListForm");
  const tList = useTranslations("productList");
  const tAttr = useTranslations("productAttr");
  const tCrud = useTranslations("crud");
  const tFormPh = useTranslations("form");

  const loadCarOptions = useCallback(
    async (
      ctx: RemoteComboboxLoadContext,
      typeCar: "brand" | "model" | "engine",
      parentId?: number | null
    ) => {
      const res = await fetchProductListFilters(locale, "cars", {
        page: 1,
        limit: 100,
        isActive: true,
        search: ctx.search.trim() || undefined,
        typeCar,
        parentId: parentId ?? undefined,
        signal: ctx.signal,
      });
      if (ctx.signal.aborted) return [];
      return filterItemsToComboboxOptions(res.items);
    },
    [locale]
  );

  const rows = cars.length ? cars : [emptyCar()];

  const patchRow = (index: number, patch: Partial<ListCarBody>) => {
    const next = [...rows];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div
          key={row.id ?? `new-${index}`}
          className="grid gap-3 rounded-lg border border-border p-3 md:grid-cols-2 lg:grid-cols-3"
        >
          <Field className="gap-1.5">
            <FieldLabel>{tAttr("carBrand")}</FieldLabel>
            <RemoteComboboxField
              label={tAttr("carBrand")}
              value={
                row.product_attribute_brand_id
                  ? String(row.product_attribute_brand_id)
                  : ""
              }
              onValueChange={(v) =>
                patchRow(index, {
                  product_attribute_brand_id: v ? Number(v) : null,
                  product_attribute_model_id: null,
                  product_attribute_engine_id: 0,
                })
              }
              placeholder={tFormPh("placeholder.select", {
                label: tAttr("carBrand"),
              })}
              emptyLabel={tFormPh("combobox.noResults")}
              inputClassName="w-full"
              showClear
              onLoadOptions={(ctx) => loadCarOptions(ctx, "brand")}
            />
          </Field>
          <Field className="gap-1.5">
            <FieldLabel>{tAttr("carModel")}</FieldLabel>
            <RemoteComboboxField
              label={tAttr("carModel")}
              value={
                row.product_attribute_model_id
                  ? String(row.product_attribute_model_id)
                  : ""
              }
              onValueChange={(v) =>
                patchRow(index, {
                  product_attribute_model_id: v ? Number(v) : null,
                  product_attribute_engine_id: 0,
                })
              }
              placeholder={tFormPh("placeholder.select", {
                label: tAttr("carModel"),
              })}
              emptyLabel={tFormPh("combobox.noResults")}
              inputClassName="w-full"
              showClear
              disabled={!row.product_attribute_brand_id}
              onLoadOptions={(ctx) =>
                loadCarOptions(ctx, "model", row.product_attribute_brand_id)
              }
            />
          </Field>
          <Field className="gap-1.5">
            <FieldLabel>{tAttr("carLevel.engine")}</FieldLabel>
            <RemoteComboboxField
              label={tAttr("carLevel.engine")}
              value={
                row.product_attribute_engine_id
                  ? String(row.product_attribute_engine_id)
                  : ""
              }
              onValueChange={(v) =>
                patchRow(index, {
                  product_attribute_engine_id: v ? Number(v) : 0,
                })
              }
              placeholder={tFormPh("placeholder.select", {
                label: tAttr("carLevel.engine"),
              })}
              emptyLabel={tFormPh("combobox.noResults")}
              inputClassName="w-full"
              showClear
              disabled={!row.product_attribute_model_id}
              onLoadOptions={(ctx) =>
                loadCarOptions(ctx, "engine", row.product_attribute_model_id)
              }
            />
          </Field>
          <Field className="gap-1.5">
            <FieldLabel>{tList("colGear")}</FieldLabel>
            <Select
              value={row.gear_type ?? ""}
              onValueChange={(v) =>
                patchRow(index, { gear_type: v || null })
              }
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={tFormPh("placeholder.select", {
                    label: tList("colGear"),
                  })}
                />
              </SelectTrigger>
              <SelectContent>
                {GEAR_TYPES.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field className="gap-1.5">
            <FieldLabel>{tList("colYear")}</FieldLabel>
            <Input
              type="number"
              inputMode="numeric"
              value={row.year_start ?? ""}
              placeholder={tFormPh("placeholder.input", {
                label: tList("colYear"),
              })}
              onChange={(e) =>
                patchRow(index, {
                  year_start: e.target.value
                    ? Number(e.target.value)
                    : null,
                })
              }
            />
          </Field>
          <Field className="gap-1.5">
            <FieldLabel>{tForm("yearEnd")}</FieldLabel>
            <Input
              type="number"
              inputMode="numeric"
              value={row.year_end ?? ""}
              placeholder={tFormPh("placeholder.input", {
                label: tForm("yearEnd"),
              })}
              onChange={(e) =>
                patchRow(index, {
                  year_end: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </Field>
          <div className="flex items-end md:col-span-2 lg:col-span-3">
            <ButtonIcon
              type="button"
              variant="ghost"
              className="text-destructive"
              aria-label={tCrud("btn.delete")}
              onClick={() => {
                const next = rows.filter((_, i) => i !== index);
                onChange(next.length ? next : [emptyCar()]);
              }}
            >
              <Trash2 className="size-4" />
            </ButtonIcon>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...rows, emptyCar()])}
      >
        <Plus className="mr-1 size-4" />
        {tForm("addCar")}
      </Button>
    </div>
  );
}
