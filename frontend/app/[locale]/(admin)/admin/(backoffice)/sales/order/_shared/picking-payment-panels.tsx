"use client";

import { ClipboardList, DollarSign, FileText, Printer } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { ButtonIcon } from "@/components/ui/button-icon";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, formatDateTime, type DisplayLocale } from "@/lib/format-datetime";
import type { PickingShipping } from "@/lib/order-picking-api";
import { computeStoreSalesPriceSummary } from "@/lib/store-sales-cart-pricing";

import {
  paySettleMath,
  summaryLinesFromOrderLines,
  type PickingOrderLine,
} from "../_lib/picking-lines";
import { PickingPriceSummary } from "./picking-panels";

export type PickingPayMode = "full" | "partial";

/** One selectable channel: a `setting_payment_method` row plus what the clerk keyed against it. */
export type PickingPayMethod = {
  id: number;
  name: string;
  enabled: boolean;
  amount: number;
};

function money(n: number, locale: string) {
  return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function round2(n: number) {
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

export function LoanDocumentCard({
  variant = "loan",
  issuedAt,
  orderAt,
  onOrderAtChange,
  sellerName,
  shipping,
  locale,
}: {
  variant?: "loan" | "order";
  issuedAt: Date;
  orderAt: string;
  onOrderAtChange?: (next: string) => void;
  sellerName: string;
  shipping: PickingShipping | null;
  locale: DisplayLocale;
}) {
  const tPage = useTranslations("page.orderPicking");
  const tStoreForm = useTranslations("page.orderStore.form");
  const tCrud = useTranslations("crud");
  const isOrder = variant === "order";
  const dash = tPage("emptyCell");

  const shippingType =
    shipping?.type === "parking"
      ? tStoreForm("shippingParking")
      : shipping?.type === "delivery"
        ? tStoreForm("shippingDelivery")
        : shipping?.type === "store"
          ? tStoreForm("shippingStore")
          : dash;
  const shippingLine = shipping?.received_at
    ? `${shippingType} ${formatDateTime(shipping.received_at, locale)}`
    : shippingType;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3 border-b pb-3">
          <h2 className="text-foreground text-lg font-semibold">
            {isOrder ? tPage("orderDocumentTitle") : tPage("loanDocumentTitle")}
          </h2>
          <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
            {isOrder ? (
              <ClipboardList className="size-5" aria-hidden />
            ) : (
              <FileText className="size-5" aria-hidden />
            )}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground text-xs">
              {tPage("loanIssuedAt")}
            </p>
            <p className="text-foreground mt-1 font-semibold">
              {formatDate(issuedAt.toISOString(), locale)}
            </p>
          </div>
          {onOrderAtChange ? (
            <div className="grid gap-1.5">
              <Label htmlFor="picking-order-at">{tPage("loanOrderAt")}</Label>
              <DatePicker
                id="picking-order-at"
                value={orderAt}
                onChange={(v) => onOrderAtChange(v ?? "")}
                placeholder={tPage("loanOrderAt")}
                aria-label={tPage("loanOrderAt")}
                cancelLabel={tCrud("btn.cancel")}
                className="w-full"
              />
            </div>
          ) : (
            <div>
              <p className="text-muted-foreground text-xs">
                {tPage("loanOrderAt")}
              </p>
              <p className="text-foreground mt-1 font-semibold">
                {orderAt ? formatDate(`${orderAt}T12:00:00`, locale) : dash}
              </p>
            </div>
          )}
          <div className="sm:col-span-2">
            <p className="text-muted-foreground text-xs">
              {tPage("customerSeller")}
            </p>
            <p className="text-foreground mt-1 font-semibold">
              {sellerName || dash}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm sm:col-span-2">
            <span className="text-foreground shrink-0 font-semibold">
              {tPage("loanShippingLabel")}
            </span>
            <span className="text-primary min-w-0 flex-1">{shippingLine}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PickingPaymentMethodsPanel({
  mode,
  onModeChange,
  methods,
  onChange,
  netTotal,
  remaining,
  locale,
}: {
  mode: PickingPayMode;
  onModeChange: (mode: PickingPayMode) => void;
  methods: PickingPayMethod[];
  onChange: (next: PickingPayMethod[]) => void;
  netTotal: number;
  remaining: number;
  locale: DisplayLocale;
}) {
  const tPage = useTranslations("page.orderPicking");

  const updateOne = (id: number, patch: Partial<PickingPayMethod>) => {
    onChange(methods.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const toggle = (id: number, on: boolean) => {
    if (!on) {
      updateOne(id, { enabled: false, amount: 0 });
      return;
    }
    // Paying in full means exactly one channel carries the whole amount, as v1 did.
    if (mode === "full") {
      onChange(
        methods.map((m) =>
          m.id === id
            ? { ...m, enabled: true, amount: round2(Math.max(0, netTotal)) }
            : { ...m, enabled: false, amount: 0 }
        )
      );
      return;
    }
    updateOne(id, { enabled: true, amount: remaining > 0 ? round2(remaining) : 0 });
  };

  const fillRemaining = (id: number) => {
    const current = methods.find((m) => m.id === id);
    if (!current?.enabled) return;
    const others = paySettleMath(0, methods.filter((m) => m.id !== id)).paid;
    updateOne(id, { amount: round2(Math.max(0, netTotal - others)) });
  };

  if (methods.length === 0) {
    return (
      <Card>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            {tPage("paymentMethodsEmpty")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-foreground text-base font-semibold">
            {tPage("selectPaymentChannel")}
          </h2>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === "full" ? "default" : "outline"}
              onClick={() => onModeChange("full")}
            >
              {tPage("payFull")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "partial" ? "default" : "outline"}
              onClick={() => onModeChange("partial")}
            >
              {tPage("payPartial")}
            </Button>
          </div>
        </div>

        <ul className="divide-y rounded-md border">
          {methods.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
              <Checkbox
                checked={m.enabled}
                aria-label={m.name}
                onCheckedChange={(v) => toggle(m.id, v === true)}
              />
              <span className="min-w-24 flex-1 text-sm font-medium">{m.name}</span>
              <div className="flex min-w-40 flex-1 items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  className="text-right tabular-nums"
                  placeholder={money(0, locale)}
                  value={m.enabled ? String(m.amount || "") : ""}
                  disabled={!m.enabled}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    updateOne(m.id, {
                      amount: Number.isFinite(n) && n > 0 ? round2(n) : 0,
                    });
                  }}
                />
                <ButtonIcon
                  tone="add"
                  variant="secondary"
                  aria-label={tPage("fillRemaining")}
                  disabled={!m.enabled || remaining <= 0}
                  onClick={() => fillRemaining(m.id)}
                >
                  <DollarSign className="text-current" aria-hidden />
                </ButtonIcon>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function PickingSettleSummary({
  lines,
  vatPercent,
  methods,
  specialDiscount,
  onSpecialDiscountEdit,
  confirmed = false,
  onPrintReceipt,
  locale,
}: {
  lines: PickingOrderLine[];
  vatPercent: number;
  methods: PickingPayMethod[];
  specialDiscount: number;
  onSpecialDiscountEdit?: () => void;
  confirmed?: boolean;
  onPrintReceipt?: () => void;
  locale: DisplayLocale;
}) {
  const tPage = useTranslations("page.orderPicking");
  const summary = computeStoreSalesPriceSummary(
    summaryLinesFromOrderLines(lines),
    vatPercent
  );
  const special = Math.max(0, round2(specialDiscount));
  const payable = Math.max(0, round2(summary.netTotal - special));
  const { remaining, change } = paySettleMath(payable, methods);
  const rows = methods.filter((m) => m.enabled && m.amount > 0);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <PickingPriceSummary
          lines={lines}
          vatPercent={vatPercent}
          specialDiscount={special}
          onSpecialDiscountEdit={onSpecialDiscountEdit}
          locale={locale}
          summary={summary}
        />
        <div className="space-y-1 text-sm">
          <p className="text-foreground font-medium">{tPage("paySettleTitle")}</p>
          {rows.length === 0 ? (
            <p className="text-muted-foreground">{tPage("emptyCell")}</p>
          ) : (
            rows.map((m) => (
              <div key={m.id} className="flex justify-between gap-3">
                <span className="text-muted-foreground">{m.name}</span>
                <span className="tabular-nums">{money(m.amount, locale)}</span>
              </div>
            ))
          )}
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">{tPage("payChange")}</span>
            <span className="tabular-nums">{money(change, locale)}</span>
          </div>
        </div>
        <div className="flex items-end justify-between gap-3 border-t border-dashed pt-2">
          <span className="text-sm font-medium">{tPage("payRemaining")}</span>
          <span
            className={
              remaining <= 0
                ? "text-warehouse-success-fg text-lg font-semibold tabular-nums"
                : "text-destructive text-lg font-semibold tabular-nums"
            }
          >
            {money(remaining, locale)} {tPage("currencyBaht")}
          </span>
        </div>
        {confirmed && onPrintReceipt ? (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onPrintReceipt}
          >
            <Printer className="text-current" aria-hidden />
            {tPage("printShortReceipt")}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
