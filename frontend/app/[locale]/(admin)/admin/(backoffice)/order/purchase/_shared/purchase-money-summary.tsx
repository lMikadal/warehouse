"use client";

import { useLocale, useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import type { PurchaseDraftTotals } from "../_lib/purchase-totals";

function money(n: number, locale: string): string {
  return n.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export type PurchaseMoneySummaryProps = {
  totals: PurchaseDraftTotals;
  /** Shown in the VAT row label; pass 0 for a no-VAT order. */
  vatPercent: number;
  className?: string;
  /** When set, shows the line-count row (approve right rail). */
  lineCount?: number;
  /**
   * Line-item discount total. When set with `extraDiscount`, the rail shows
   * line vs additional discount separately instead of one combined discount row.
   */
  lineDiscountTotal?: number;
  /** Order-level extra discount (not line discounts). */
  extraDiscount?: number;
  /**
   * Approve/detail right rail: currency suffix on rows + large primary net total.
   */
  emphasizeNet?: boolean;
};

/** v1 PO money block, shared by the create/edit form, the refill cards and the detail summary. */
export function PurchaseMoneySummary({
  totals,
  vatPercent,
  className,
  lineCount,
  lineDiscountTotal,
  extraDiscount,
  emphasizeNet = false,
}: PurchaseMoneySummaryProps) {
  const locale = useLocale();
  const tSummary = useTranslations("page.orderPurchase.summary");
  const tPo = useTranslations("page.orderPurchase");

  const splitDiscounts =
    lineDiscountTotal !== undefined && extraDiscount !== undefined;

  const currency = (n: number) => {
    const amount = money(n, locale);
    if (!emphasizeNet) return amount;
    return `${amount} ${tPo("currencySuffix")}`;
  };

  const midRows: { label: string; value: number }[] = splitDiscounts
    ? [
        { label: tSummary("productTotal"), value: totals.total_price },
        { label: tSummary("lineDiscountTotal"), value: lineDiscountTotal },
        { label: tSummary("discount"), value: extraDiscount },
        { label: tSummary("afterDiscount"), value: totals.total_price_discount },
        {
          label: tSummary("vat", { percent: vatPercent }),
          value: totals.total_vat,
        },
      ]
    : [
        { label: tSummary("productTotal"), value: totals.total_price },
        { label: tSummary("discount"), value: totals.total_discount },
        { label: tSummary("afterDiscount"), value: totals.total_price_discount },
        {
          label: tSummary("vat", { percent: vatPercent }),
          value: totals.total_vat,
        },
      ];

  return (
    <dl className={cn("grid gap-1 border-t pt-3 text-sm", className)}>
      {lineCount !== undefined ? (
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">{tSummary("lineCount")}</dt>
          <dd className="tabular-nums">{lineCount}</dd>
        </div>
      ) : null}
      {midRows.map((row) => (
        <div key={row.label} className="flex justify-between gap-2">
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd className="tabular-nums">{currency(row.value)}</dd>
        </div>
      ))}
      {emphasizeNet ? (
        <div className="mt-3 border-t pt-4">
          <dt className="mb-1 text-xs font-medium tracking-wide text-primary uppercase">
            {tSummary("grandTotal")}
          </dt>
          <dd className="text-2xl font-bold tracking-tight text-primary tabular-nums">
            {money(totals.total_grand_price, locale)} {tSummary("bahtSuffix")}
          </dd>
        </div>
      ) : (
        <div className="flex justify-between gap-2 text-base font-semibold">
          <dt>{tSummary("grandTotal")}</dt>
          <dd className="tabular-nums">
            {money(totals.total_grand_price, locale)}
          </dd>
        </div>
      )}
    </dl>
  );
}
