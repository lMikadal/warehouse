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
};

/** v1 PO money block, shared by the create/edit form, the refill cards and the detail summary. */
export function PurchaseMoneySummary({
  totals,
  vatPercent,
  className,
}: PurchaseMoneySummaryProps) {
  const locale = useLocale();
  const tSummary = useTranslations("page.orderPurchase.summary");

  const rows: { label: string; value: number }[] = [
    { label: tSummary("productTotal"), value: totals.total_price },
    { label: tSummary("discount"), value: totals.total_discount },
    { label: tSummary("afterDiscount"), value: totals.total_price_discount },
    { label: tSummary("vat", { percent: vatPercent }), value: totals.total_vat },
  ];

  return (
    <dl className={cn("grid gap-1 border-t pt-3 text-sm", className)}>
      {rows.map((row) => (
        <div key={row.label} className="flex justify-between gap-2">
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd className="tabular-nums">{money(row.value, locale)}</dd>
        </div>
      ))}
      <div className="flex justify-between gap-2 text-base font-semibold">
        <dt>{tSummary("grandTotal")}</dt>
        <dd className="tabular-nums">
          {money(totals.total_grand_price, locale)}
        </dd>
      </div>
    </dl>
  );
}
