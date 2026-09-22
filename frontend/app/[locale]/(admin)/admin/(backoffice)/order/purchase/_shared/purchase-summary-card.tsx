"use client";

import { useLocale, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { type DisplayLocale, formatDateTime } from "@/lib/format-datetime";
import type { PurchaseDetail } from "@/lib/order-purchase-api";

import { PurchaseMoneySummary } from "./purchase-money-summary";
import { purchaseStatusPillClass } from "./purchase-status-styles";

/** Header meta + money summary shared by the PO detail, approve and payment screens. */
export function PurchaseSummaryCard({ detail }: { detail: PurchaseDetail }) {
  const locale = useLocale() as DisplayLocale;
  const tPage = useTranslations("page.orderPurchase");
  const tDetail = useTranslations("page.orderPurchase.detail");
  const tSummary = useTranslations("page.orderPurchase.summary");
  const tApprove = useTranslations("page.orderPurchase.approve");

  const meta: { label: string; value: React.ReactNode }[] = [
    {
      label: tDetail("purchaseNumberLabel"),
      value: detail.sku?.trim() || detail.sku_draft?.trim() || "—",
    },
    { label: tDetail("createdAtLabel"), value: formatDateTime(detail.created_at, locale) },
    { label: tDetail("creatorLabel"), value: detail.created_by_name?.trim() || "—" },
    { label: tApprove("partnerLabel"), value: detail.supplier_name?.trim() || "—" },
    {
      label: tDetail("requestTicketNumberLabel"),
      value:
        detail.purchase_request_id && detail.purchase_request_sku?.trim() ? (
          <Link
            href={`/admin/sales/ticket/${detail.purchase_request_id}/detail`}
            className="text-primary underline"
          >
            {detail.purchase_request_sku}
          </Link>
        ) : (
          "—"
        ),
    },
    { label: tDetail("totalLineItemsLabel"), value: detail.total_qty.toLocaleString() },
  ];

  return (
    <Card className="shadow-none">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 pb-3">
        <CardTitle className="text-base">{tSummary("title")}</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          {detail.is_waiting ? (
            <Badge variant="secondary" className={purchaseStatusPillClass("pending")}>
              {tPage("po.refillBadge")}
            </Badge>
          ) : null}
          <Badge
            variant="secondary"
            className={purchaseStatusPillClass(detail.status)}
          >
            {tPage(`status.${detail.status}`)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-2">
        <dl className="grid gap-2 text-sm">
          {meta.map((row) => (
            <div key={row.label} className="flex flex-wrap justify-between gap-2">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="tabular-nums">{row.value}</dd>
            </div>
          ))}
        </dl>
        <PurchaseMoneySummary
          totals={detail}
          vatPercent={detail.vat_type === "none" ? 0 : detail.vat_rate}
          className="border-t-0 pt-0"
        />
        {detail.note.trim() ? (
          <div className="lg:col-span-2">
            <p className="text-sm text-muted-foreground">{tDetail("noteLabel")}</p>
            <p className="whitespace-pre-wrap text-sm">{detail.note}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
