"use client";

import { ClipboardList } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import {
  formatDate,
  type DisplayLocale,
} from "@/lib/format-datetime";
import type { QuotationDetail } from "@/lib/order-quotation-api";
import { cn } from "@/lib/utils";

import type { QuotationAcceptPanelMode } from "./quotation-accept-dialog";

type PayMode = "full" | "partial";

type MethodKey = "cash" | "transfer" | "qr" | "card" | "cod";

const METHOD_KEYS: MethodKey[] = [
  "cash",
  "transfer",
  "qr",
  "card",
  "cod",
];

type Props = {
  mode: QuotationAcceptPanelMode;
  detail: QuotationDetail;
  locale: DisplayLocale;
  itemCount: number;
  layout?: "stacked" | "split";
};

function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatMoney(n: number, locale: string) {
  return n.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function displayDate(iso: string | null | undefined, locale: DisplayLocale) {
  if (!iso?.trim()) return "—";
  return formatDate(iso.includes("T") ? iso : `${iso}T12:00:00`, locale);
}

function methodLabel(
  key: MethodKey,
  tAccept: ReturnType<typeof useTranslations>
) {
  switch (key) {
    case "cash":
      return tAccept("methods.cash");
    case "transfer":
      return tAccept("methods.transfer");
    case "qr":
      return tAccept("methods.qr");
    case "card":
      return tAccept("methods.card");
    default:
      return tAccept("methods.cod");
  }
}

function MetaBlock({
  detail,
  locale,
  dueDate,
  onDueDateChange,
  showDueEditor,
}: {
  detail: QuotationDetail;
  locale: DisplayLocale;
  dueDate?: string;
  onDueDateChange?: (v: string) => void;
  showDueEditor?: boolean;
}) {
  const tPage = useTranslations("page.orderQuotation");
  const tForm = useTranslations("page.orderQuotation.form");
  const tRoot = useTranslations();

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1">
          <p className="text-muted-foreground text-xs">{tForm("issueDate")}</p>
          <p className="text-sm tabular-nums">
            {displayDate(detail.issue_date, locale)}
          </p>
        </div>
        <div className="grid gap-1">
          <p className="text-muted-foreground text-xs">
            {showDueEditor
              ? tPage("acceptModal.creditDate")
              : tForm("validUntil")}
          </p>
          {showDueEditor && onDueDateChange ? (
            <DatePicker
              id="accept-panel-credit-date"
              value={dueDate ?? ""}
              onChange={(v) => onDueDateChange(v ?? "")}
              placeholder={tRoot("form.placeholder.input", {
                label: tPage("acceptModal.creditDate"),
              })}
              aria-label={tPage("acceptModal.creditDate")}
              className="w-full"
            />
          ) : (
            <p className="text-sm tabular-nums">
              {displayDate(detail.valid_until, locale)}
            </p>
          )}
        </div>
      </div>
      <div className="grid gap-1">
        <p className="text-muted-foreground text-xs">{tPage("detail.seller")}</p>
        <p className="text-sm">{detail.created_by_name?.trim() || "—"}</p>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={detail.reserve_stock} disabled />
        {tForm("reserveStock")}
      </label>
    </div>
  );
}

export function QuotationAcceptSidePanel({
  mode,
  detail,
  locale,
  itemCount,
  layout = "split",
}: Props) {
  const tPage = useTranslations("page.orderQuotation");
  const tAccept = useTranslations("page.orderQuotation.acceptModal");
  const tStore = useTranslations("page.orderStore.form");
  const isSplit = layout === "split";

  const grand = Number(detail.grand_total) || 0;

  const [payMode, setPayMode] = useState<PayMode>("full");
  const [selected, setSelected] = useState<Record<MethodKey, boolean>>({
    cash: true,
    transfer: false,
    qr: false,
    card: false,
    cod: false,
  });
  const [amounts, setAmounts] = useState<Record<MethodKey, string>>({
    cash: String(grand || ""),
    transfer: "",
    qr: "",
    card: "",
    cod: "",
  });
  const [dueDate, setDueDate] = useState(
    () => detail.valid_until?.trim() || todayIsoDate()
  );

  useEffect(() => {
    setPayMode("full");
    setSelected({
      cash: true,
      transfer: false,
      qr: false,
      card: false,
      cod: false,
    });
    setAmounts({
      cash: String(grand || ""),
      transfer: "",
      qr: "",
      card: "",
      cod: "",
    });
    setDueDate(detail.valid_until?.trim() || todayIsoDate());
  }, [mode, detail.id, detail.valid_until, grand]);

  const paidTotal = useMemo(() => {
    return METHOD_KEYS.reduce((sum, key) => {
      if (!selected[key]) return sum;
      const n = Number.parseFloat(amounts[key]);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
  }, [selected, amounts]);

  const outstanding = Math.max(0, Math.round((grand - paidTotal) * 100) / 100);
  const change = Math.max(0, Math.round((paidTotal - grand) * 100) / 100);

  const toggleMethod = (key: MethodKey, on: boolean) => {
    setSelected((prev) => ({ ...prev, [key]: on }));
    if (on && payMode === "full" && key === "cash" && !amounts.cash) {
      setAmounts((prev) => ({ ...prev, cash: String(grand) }));
    }
  };

  const setPayModeAndSync = (next: PayMode) => {
    setPayMode(next);
    if (next === "full") {
      setSelected({
        cash: true,
        transfer: false,
        qr: false,
        card: false,
        cod: false,
      });
      setAmounts({
        cash: String(grand),
        transfer: "",
        qr: "",
        card: "",
        cod: "",
      });
    }
  };

  return (
    <Card
      className={cn(
        "flex w-full min-w-0 flex-col",
        isSplit &&
          "sticky top-4 z-10 max-h-[calc(100svh-3.5rem-1rem-1.5rem)] w-full min-w-[400px] self-start overflow-hidden"
      )}
    >
      <CardHeader className="shrink-0">
        <CardTitle className="flex items-center gap-3 text-base">
          <span
            className="bg-primary/15 text-primary flex size-10 shrink-0 items-center justify-center rounded-full"
            aria-hidden
          >
            <ClipboardList className="size-5" aria-hidden />
          </span>
          {tPage("detail.metaTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent
        className={cn(
          "flex flex-col gap-4",
          isSplit && "min-h-0 flex-1 overflow-y-auto"
        )}
      >
        <MetaBlock
          detail={detail}
          locale={locale}
          dueDate={dueDate}
          onDueDateChange={setDueDate}
          showDueEditor={mode === "credit"}
        />

        {mode === "payment" ? (
          <>
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">
                {tAccept("channelsTitle")}
              </h4>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={payMode === "full" ? "default" : "outline"}
                  onClick={() => setPayModeAndSync("full")}
                >
                  {tAccept("payFull")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={payMode === "partial" ? "default" : "outline"}
                  onClick={() => setPayModeAndSync("partial")}
                >
                  {tAccept("payPartial")}
                </Button>
              </div>
              <ul className="divide-y rounded-md border">
                {METHOD_KEYS.map((key) => (
                  <li key={key} className="flex items-center gap-3 px-3 py-2">
                    <Checkbox
                      checked={selected[key]}
                      onCheckedChange={(c) => toggleMethod(key, c === true)}
                      disabled={payMode === "full" && key !== "cash"}
                    />
                    <span className="min-w-0 flex-1 text-sm">
                      {methodLabel(key, tAccept)}
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      className="w-28 tabular-nums"
                      value={amounts[key]}
                      disabled={!selected[key]}
                      placeholder="0.00"
                      onChange={(e) =>
                        setAmounts((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                    />
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-primary/10 border-primary/20 space-y-2 rounded-md border p-3">
              <h4 className="text-primary text-sm font-semibold">
                {tAccept("paymentSummary")}
              </h4>
              <div className="flex justify-between gap-2 text-sm">
                <span>{tAccept("grandTotal")}</span>
                <span className="text-primary font-semibold tabular-nums">
                  {formatMoney(grand, locale)} {tAccept("baht")}
                </span>
              </div>
              {METHOD_KEYS.filter((k) => selected[k]).map((key) => (
                <div
                  key={key}
                  className="text-muted-foreground flex justify-between gap-2 text-sm"
                >
                  <span>{methodLabel(key, tAccept)}</span>
                  <span className="tabular-nums">
                    {formatMoney(Number.parseFloat(amounts[key]) || 0, locale)}
                  </span>
                </div>
              ))}
              <div className="text-muted-foreground flex justify-between gap-2 text-sm">
                <span>{tAccept("change")}</span>
                <span className="tabular-nums">
                  {formatMoney(change, locale)}
                </span>
              </div>
              <div className="flex justify-between gap-2 border-t border-dashed pt-2 text-sm font-medium">
                <span>{tAccept("outstanding")}</span>
                <span
                  className={cn(
                    "tabular-nums",
                    outstanding <= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-destructive"
                  )}
                >
                  {formatMoney(outstanding, locale)} {tAccept("baht")}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-primary/10 border-primary/20 space-y-2 rounded-md border p-3">
            <h4 className="text-primary text-sm font-semibold">
              {tAccept("purchaseSummary", { count: itemCount })}
            </h4>
            <div className="flex justify-between gap-2 text-sm">
              <span>{tStore("itemsTotal", { count: itemCount })}</span>
              <span className="tabular-nums">
                {formatMoney(
                  (Number(detail.subtotal_ex_vat) || 0) +
                    (Number(detail.discount_total) || 0),
                  locale
                )}
              </span>
            </div>
            <div className="text-muted-foreground flex justify-between gap-2 text-sm">
              <span>{tStore("discountTotal")}</span>
              <span className="tabular-nums">
                {formatMoney(Number(detail.discount_total) || 0, locale)}
              </span>
            </div>
            <div className="text-muted-foreground flex justify-between gap-2 text-sm">
              <span>{tAccept("exVat")}</span>
              <span className="tabular-nums">
                {formatMoney(Number(detail.subtotal_ex_vat) || 0, locale)}
              </span>
            </div>
            <div className="text-muted-foreground flex justify-between gap-2 text-sm">
              <span>
                {tAccept("vatLine", {
                  rate: Number(detail.vat_rate) || 0,
                })}
              </span>
              <span className="tabular-nums">
                {formatMoney(Number(detail.vat_amount) || 0, locale)}
              </span>
            </div>
            <div className="flex justify-between gap-2 border-t border-dashed pt-2 text-sm font-semibold">
              <span>{tAccept("grandTotal")}</span>
              <span className="text-primary tabular-nums">
                {formatMoney(grand, locale)} {tAccept("baht")}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
