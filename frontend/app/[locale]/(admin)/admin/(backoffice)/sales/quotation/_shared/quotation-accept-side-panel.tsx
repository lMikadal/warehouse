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
import {
  fetchSettingLangList,
  type SettingLangItem,
} from "@/lib/setting-api";
import { cn } from "@/lib/utils";

import type { QuotationAcceptPanelMode } from "./quotation-accept-dialog";

type PayMode = "full" | "partial";

export type QuotationAcceptPhase = "form" | "result";

export type QuotationAcceptDraft = {
  dueDate: string;
  methods: { setting_payment_method_id: number; amount: number }[];
};

type Props = {
  mode: QuotationAcceptPanelMode;
  phase?: QuotationAcceptPhase;
  detail: QuotationDetail;
  locale: DisplayLocale;
  itemCount: number;
  layout?: "stacked" | "split";
  onDraftChange?: (draft: QuotationAcceptDraft) => void;
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

function fullPayDefaults(methods: SettingLangItem[], grand: number) {
  const selected: Record<number, boolean> = {};
  const amounts: Record<number, string> = {};
  const firstId = methods[0]?.id;
  for (const m of methods) {
    const on = m.id === firstId;
    selected[m.id] = on;
    amounts[m.id] = on ? String(grand || "") : "";
  }
  return { selected, amounts };
}

function MetaBlock({
  detail,
  locale,
  dueDate,
  onDueDateChange,
  showCreditDate,
  showDueEditor,
}: {
  detail: QuotationDetail;
  locale: DisplayLocale;
  dueDate?: string;
  onDueDateChange?: (v: string) => void;
  showCreditDate?: boolean;
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
            {showCreditDate
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
              {displayDate(
                showCreditDate ? dueDate : detail.valid_until,
                locale
              )}
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

function ResultPaymentSummary({
  methods,
  amounts,
  outstanding,
  locale,
}: {
  methods: SettingLangItem[];
  amounts: Record<number, string>;
  outstanding: number;
  locale: DisplayLocale;
}) {
  const tAccept = useTranslations("page.orderQuotation.acceptModal");

  return (
    <div className="bg-primary/10 border-primary/20 space-y-2 rounded-md border p-3">
      <h4 className="text-primary text-sm font-semibold">
        {tAccept("paymentSummary")}
      </h4>
      {methods.map((m) => (
        <div
          key={m.id}
          className="text-muted-foreground flex justify-between gap-2 text-sm"
        >
          <span>{m.name?.trim() || `#${m.id}`}</span>
          <span className="tabular-nums">
            {formatMoney(Number.parseFloat(amounts[m.id] ?? "") || 0, locale)}
          </span>
        </div>
      ))}
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
  );
}

export function QuotationAcceptSidePanel({
  mode,
  phase = "form",
  detail,
  locale,
  itemCount,
  layout = "split",
  onDraftChange,
}: Props) {
  const tPage = useTranslations("page.orderQuotation");
  const tAccept = useTranslations("page.orderQuotation.acceptModal");
  const tStore = useTranslations("page.orderStore.form");
  const isSplit = layout === "split";
  const isResult = phase === "result";

  const grand = Number(detail.grand_total) || 0;

  const [methods, setMethods] = useState<SettingLangItem[]>([]);
  const [payMode, setPayMode] = useState<PayMode>("full");
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [dueDate, setDueDate] = useState(
    () => detail.valid_until?.trim() || todayIsoDate()
  );

  const defaultMethodId = methods[0]?.id;

  useEffect(() => {
    if (phase === "result") return;
    setPayMode("full");
    setDueDate(detail.valid_until?.trim() || todayIsoDate());
    let cancelled = false;
    void fetchSettingLangList(locale, "payment-methods", {
      page: 1,
      limit: 100,
      isActive: true,
      isSale: true,
    })
      .then((res) => {
        if (cancelled) return;
        setMethods(res.items);
        if (mode === "payment") {
          const next = fullPayDefaults(res.items, grand);
          setSelected(next.selected);
          setAmounts(next.amounts);
        } else {
          setSelected({});
          setAmounts({});
        }
      })
      .catch(() => {
        if (cancelled) return;
        setMethods([]);
        setSelected({});
        setAmounts({});
      });
    return () => {
      cancelled = true;
    };
  }, [mode, locale, detail.id, detail.valid_until, grand, phase]);

  const paidTotal = useMemo(() => {
    return methods.reduce((sum, m) => {
      if (!selected[m.id]) return sum;
      const n = Number.parseFloat(amounts[m.id] ?? "");
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
  }, [methods, selected, amounts]);

  const outstanding = Math.max(0, Math.round((grand - paidTotal) * 100) / 100);
  const change = Math.max(0, Math.round((paidTotal - grand) * 100) / 100);

  useEffect(() => {
    if (!onDraftChange) return;
    const methodsDraft = methods
      .filter((m) => selected[m.id])
      .map((m) => ({
        setting_payment_method_id: m.id,
        amount: Number.parseFloat(amounts[m.id] ?? "") || 0,
      }))
      .filter((m) => m.amount > 0);
    onDraftChange({ dueDate, methods: methodsDraft });
  }, [onDraftChange, methods, selected, amounts, dueDate]);

  const toggleMethod = (id: number, on: boolean) => {
    setSelected((prev) => ({ ...prev, [id]: on }));
    if (
      on &&
      payMode === "full" &&
      id === defaultMethodId &&
      !amounts[id]
    ) {
      setAmounts((prev) => ({ ...prev, [id]: String(grand) }));
    }
  };

  const setPayModeAndSync = (next: PayMode) => {
    setPayMode(next);
    if (next === "full") {
      const defaults = fullPayDefaults(methods, grand);
      setSelected(defaults.selected);
      setAmounts(defaults.amounts);
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
          showCreditDate={mode === "credit"}
          showDueEditor={mode === "credit" && !isResult}
        />

        {isResult ? (
          <ResultPaymentSummary
            methods={methods}
            amounts={amounts}
            outstanding={outstanding}
            locale={locale}
          />
        ) : mode === "payment" ? (
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
                {methods.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 px-3 py-2">
                    <Checkbox
                      checked={selected[m.id] === true}
                      onCheckedChange={(c) => toggleMethod(m.id, c === true)}
                      disabled={
                        payMode === "full" && m.id !== defaultMethodId
                      }
                    />
                    <span className="min-w-0 flex-1 text-sm">
                      {m.name?.trim() || `#${m.id}`}
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      className="w-28 tabular-nums"
                      value={amounts[m.id] ?? ""}
                      disabled={!selected[m.id]}
                      placeholder="0.00"
                      onChange={(e) =>
                        setAmounts((prev) => ({
                          ...prev,
                          [m.id]: e.target.value,
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
              {methods
                .filter((m) => selected[m.id])
                .map((m) => (
                  <div
                    key={m.id}
                    className="text-muted-foreground flex justify-between gap-2 text-sm"
                  >
                    <span>{m.name?.trim() || `#${m.id}`}</span>
                    <span className="tabular-nums">
                      {formatMoney(
                        Number.parseFloat(amounts[m.id] ?? "") || 0,
                        locale
                      )}
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
