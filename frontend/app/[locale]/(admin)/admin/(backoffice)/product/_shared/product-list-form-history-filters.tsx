"use client";

import { Download, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { HistoryGroupBy } from "@/lib/product-list-api";

export type HistoryFilterOption = { value: string; label: string };

export type HistoryFiltersState = {
  viewMode: HistoryGroupBy;
  dateFrom: string;
  dateTo: string;
  monthFrom: string;
  monthTo: string;
  yearFrom: string;
  yearTo: string;
  itemId: string;
  partyId: string;
};

type Props = {
  mode: "purchase" | "sales";
  value: HistoryFiltersState;
  onChange: (next: HistoryFiltersState) => void;
  onClear: () => void;
  itemOptions: HistoryFilterOption[];
  partyOptions: HistoryFilterOption[];
  yearOptions: string[];
};

export function ProductListFormHistoryFilters({
  mode,
  value,
  onChange,
  onClear,
  itemOptions,
  partyOptions,
  yearOptions,
}: Props) {
  const tForm = useTranslations("productListForm");
  const patch = (partial: Partial<HistoryFiltersState>) =>
    onChange({ ...value, ...partial });

  return (
    <div className="border-border flex flex-wrap items-end gap-3 rounded-[var(--radius)] border p-3">
      <FilterField label={tForm("histViewModeLabel")}>
        <Select
          value={value.viewMode}
          onValueChange={(v) =>
            patch({ viewMode: (v ?? "day") as HistoryGroupBy })
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">{tForm("histViewModeDay")}</SelectItem>
            <SelectItem value="month">{tForm("histViewModeMonth")}</SelectItem>
            <SelectItem value="year">{tForm("histViewModeYear")}</SelectItem>
          </SelectContent>
        </Select>
      </FilterField>

      {value.viewMode === "day" ? (
        <>
          <FilterField label={tForm("histFilterDateFrom")}>
            <Input
              type="date"
              className="w-[150px]"
              value={value.dateFrom}
              onChange={(e) => patch({ dateFrom: e.target.value })}
            />
          </FilterField>
          <FilterField label={tForm("histFilterDateTo")}>
            <Input
              type="date"
              className="w-[150px]"
              value={value.dateTo}
              onChange={(e) => patch({ dateTo: e.target.value })}
            />
          </FilterField>
        </>
      ) : null}

      {value.viewMode === "month" ? (
        <>
          <FilterField label={tForm("histFilterMonthFrom")}>
            <Input
              type="month"
              className="w-[150px]"
              value={value.monthFrom}
              onChange={(e) => patch({ monthFrom: e.target.value })}
            />
          </FilterField>
          <FilterField label={tForm("histFilterMonthTo")}>
            <Input
              type="month"
              className="w-[150px]"
              value={value.monthTo}
              onChange={(e) => patch({ monthTo: e.target.value })}
            />
          </FilterField>
        </>
      ) : null}

      {value.viewMode === "year" ? (
        <>
          <FilterField label={tForm("histFilterYearFrom")}>
            <Select
              value={value.yearFrom || "__all"}
              onValueChange={(v) =>
                patch({ yearFrom: !v || v === "__all" ? "" : v })
              }
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder={tForm("histFilterAll")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">{tForm("histFilterAll")}</SelectItem>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label={tForm("histFilterYearTo")}>
            <Select
              value={value.yearTo || "__all"}
              onValueChange={(v) =>
                patch({ yearTo: !v || v === "__all" ? "" : v })
              }
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder={tForm("histFilterAll")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">{tForm("histFilterAll")}</SelectItem>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
        </>
      ) : null}

      <FilterField label={tForm("histFilterProductCode")}>
        <Select
          value={value.itemId || "all"}
          onValueChange={(v) => patch({ itemId: v || "all" })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tForm("histFilterAll")}</SelectItem>
            {itemOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField
        label={
          mode === "sales"
            ? tForm("histFilterCustomer")
            : tForm("histFilterPartner")
        }
      >
        <Select
          value={value.partyId || "all"}
          onValueChange={(v) => patch({ partyId: v || "all" })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tForm("histFilterAll")}</SelectItem>
            {partyOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>

      <div className="flex gap-2 pb-0.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => toast.message(tForm("histExportSoon"))}
        >
          <Download className="size-4" />
          {tForm("histExport")}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onClear}>
          <RotateCcw className="size-4" />
          {tForm("histClearFilters")}
        </Button>
      </div>
    </div>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs">{label}</span>
      {children}
    </div>
  );
}
