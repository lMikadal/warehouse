"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  FormCard,
  FormCardContent,
  FormCardHeader,
  FormCardTitle,
} from "@/components/molecules/form-card";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DisplayLocale } from "@/lib/format-datetime";
import {
  fetchProductItemHistoryPurchase,
  fetchProductItemHistorySales,
  ProductListApiError,
} from "@/lib/product-list-api";

type Props = {
  itemIds: number[];
};

const SUMMARY_KEYS_PURCHASE = [
  "histSummaryReceived",
  "histSummaryValue",
  "histSummaryAvgCost",
] as const;

const SUMMARY_KEYS_SALES = [
  "histSummaryValue",
  "histSummaryAvgProfit",
  "histSummaryMinCost",
] as const;

export function ProductListFormHistory({ itemIds }: Props) {
  const locale = useLocale() as DisplayLocale;
  const tForm = useTranslations("productListForm");
  const tList = useTranslations("productList");
  const tError = useTranslations("error");
  const tAction = useTranslations("action");
  const tFormPh = useTranslations("form");
  const tSearch = useTranslations("search");
  const [subTab, setSubTab] = useState<"purchase" | "sales">("purchase");
  const [empty, setEmpty] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const sampleItemId = itemIds.find((id) => id > 0);

  const load = useCallback(async () => {
    if (!sampleItemId) {
      setEmpty(true);
      return;
    }
    const params: Record<string, string> = {};
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    try {
      const res =
        subTab === "purchase"
          ? await fetchProductItemHistoryPurchase(locale, sampleItemId, params)
          : await fetchProductItemHistorySales(locale, sampleItemId, params);
      setEmpty((res.groups?.length ?? 0) === 0);
    } catch (e) {
      toast.error(
        e instanceof ProductListApiError ? e.message : tError("noData")
      );
      setEmpty(true);
    }
  }, [locale, sampleItemId, subTab, dateFrom, dateTo, tError]);

  useEffect(() => {
    void load();
  }, [load]);

  const summaryKeys =
    subTab === "purchase" ? SUMMARY_KEYS_PURCHASE : SUMMARY_KEYS_SALES;

  const exportSoon = () => toast.info(tList("importExportSoon"));

  return (
    <div className="space-y-4">
      <Tabs
        value={subTab}
        onValueChange={(v) => setSubTab(v as "purchase" | "sales")}
      >
        <TabsList>
          <TabsTrigger value="purchase">{tForm("histTabPurchase")}</TabsTrigger>
          <TabsTrigger value="sales">{tForm("histTabSales")}</TabsTrigger>
        </TabsList>
        <TabsContent value="purchase" className="mt-4 space-y-4">
          <HistoryPanel
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onSearch={() => void load()}
            onExport={exportSoon}
            summaryKeys={summaryKeys}
            empty={empty}
            tForm={tForm}
            tSearch={tSearch}
            tAction={tAction}
            tError={tError}
          />
        </TabsContent>
        <TabsContent value="sales" className="mt-4 space-y-4">
          <HistoryPanel
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onSearch={() => void load()}
            onExport={exportSoon}
            summaryKeys={summaryKeys}
            empty={empty}
            tForm={tForm}
            tSearch={tSearch}
            tAction={tAction}
            tError={tError}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function HistoryPanel({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onSearch,
  onExport,
  summaryKeys,
  empty,
  tForm,
  tSearch,
  tAction,
  tError,
}: {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onSearch: () => void;
  onExport: () => void;
  summaryKeys: readonly string[];
  empty: boolean;
  tForm: ReturnType<typeof useTranslations<"productListForm">>;
  tSearch: ReturnType<typeof useTranslations<"search">>;
  tAction: ReturnType<typeof useTranslations<"action">>;
  tError: ReturnType<typeof useTranslations<"error">>;
}) {
  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <Field className="gap-1.5">
          <FieldLabel>{tForm("histFilterDateFrom")}</FieldLabel>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
          />
        </Field>
        <Field className="gap-1.5">
          <FieldLabel>{tForm("histFilterDateTo")}</FieldLabel>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
          />
        </Field>
        <Button type="button" variant="secondary" onClick={onSearch}>
          {tSearch("placeholder")}
        </Button>
        <Button type="button" variant="outline" onClick={onExport}>
          {tAction("export")}
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {summaryKeys.map((key) => (
          <FormCard key={key}>
            <FormCardHeader className="pb-2">
              <FormCardTitle className="text-sm font-medium">
                {tForm(key)}
              </FormCardTitle>
            </FormCardHeader>
            <FormCardContent>
              <p className="text-2xl tabular-nums">—</p>
            </FormCardContent>
          </FormCard>
        ))}
      </div>
      {empty ? (
        <p className="text-muted-foreground text-sm">{tError("noData")}</p>
      ) : null}
    </>
  );
}
