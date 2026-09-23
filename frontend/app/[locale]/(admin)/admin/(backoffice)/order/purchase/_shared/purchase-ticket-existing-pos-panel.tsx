"use client";

import { ChevronDown, Package, ShoppingBag } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import {
  type DisplayLocale,
  formatDate,
} from "@/lib/format-datetime";
import type { PurchaseDetail, PurchaseItemDetail } from "@/lib/order-purchase-api";
import { cn } from "@/lib/utils";

import { lineNet } from "../_lib/purchase-totals";
import { purchaseStatusPillClass } from "./purchase-status-styles";

function money(n: number, locale: string): string {
  return n.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function itemDisplayName(item: PurchaseItemDetail): string {
  if (item.type === "catalog") {
    return item.product_item_name?.trim() || item.name?.trim() || "—";
  }
  return item.name?.trim() || "—";
}

export type PurchaseTicketExistingPosPanelProps = {
  orders: PurchaseDetail[];
  loading: boolean;
  error: string | null;
  /** When true, show the section title even if there are no orders yet. */
  showEmpty?: boolean;
};

export function PurchaseTicketExistingPosPanel({
  orders,
  loading,
  error,
  showEmpty = false,
}: PurchaseTicketExistingPosPanelProps) {
  const locale = useLocale() as DisplayLocale;
  const t = useTranslations("page.orderPurchase.receive");
  const tStatus = useTranslations("page.orderPurchase.status");
  const tCol = useTranslations("col");
  const tForm = useTranslations("page.orderPurchase.form");
  const tSummary = useTranslations("page.orderPurchase.summary");
  const [openIds, setOpenIds] = useState<Record<number, boolean>>({});

  if (loading && orders.length === 0) {
    return (
      <p className="px-1 text-sm text-muted-foreground">{t("loading")}</p>
    );
  }

  if (error) {
    return <p className="px-1 text-sm text-destructive">{error}</p>;
  }

  if (orders.length === 0) {
    if (!showEmpty) return null;
    return (
      <div className="space-y-2">
        <p className="px-1 text-sm font-medium">{t("existingPoSectionTitle")}</p>
        <p className="px-1 text-sm text-muted-foreground">{t("existingPoEmpty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="px-1 text-sm font-medium">{t("existingPoSectionTitle")}</p>
      {orders.map((order) => {
        const open = openIds[order.id] ?? true;
        const number =
          order.sku?.trim() || order.sku_draft?.trim() || `#${order.id}`;
        const createdBy = order.created_by_name?.trim() || "—";
        return (
          <Card key={order.id} className="gap-0 py-0 shadow-none">
            <CardHeader className="gap-0 px-3 py-3 sm:px-4">
              <button
                type="button"
                className="flex w-full items-start gap-2.5 text-left"
                aria-expanded={open}
                onClick={() =>
                  setOpenIds((prev) => ({ ...prev, [order.id]: !open }))
                }
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ShoppingBag className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="truncate text-sm font-semibold">
                      <Link
                        href={`/admin/order/purchase/${order.id}/detail`}
                        className="hover:text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {number}
                      </Link>
                    </CardTitle>
                    <span className={purchaseStatusPillClass(order.status)}>
                      {tStatus(order.status)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    <span className="tabular-nums">
                      {formatDate(order.created_at, locale)}
                    </span>
                    <span className="mx-1" aria-hidden>
                      |
                    </span>
                    {createdBy}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
                  <p className="text-right text-xs font-medium sm:text-sm">
                    {t("summaryCollapsedNetBaht", {
                      amount: money(order.total_grand_price, locale),
                    })}
                  </p>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-muted-foreground transition-transform",
                      open && "rotate-180"
                    )}
                    aria-hidden
                  />
                </div>
              </button>
            </CardHeader>
            {open ? (
              <CardContent className="space-y-3 border-t px-3 py-3 sm:px-4">
                <p className="text-sm font-medium">
                  {t("existingPoItemsHeading", { count: order.items.length })}
                </p>
                <div className="space-y-2">
                  {order.items.map((item) => {
                    const lineTotal = lineNet({
                      qty: item.qty,
                      price_per_unit: item.price_per_unit,
                      discount: item.discount,
                    });
                    return (
                      <div
                        key={item.id}
                        className="flex flex-col gap-3 rounded-md border bg-muted/20 p-3 sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div className="flex min-w-0 items-start gap-2.5">
                          <div className="flex size-11 shrink-0 items-center justify-center rounded-md border bg-muted/50 text-muted-foreground">
                            <Package className="size-5" aria-hidden />
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <p className="truncate text-sm font-medium">
                              {itemDisplayName(item)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {tCol("brand")}:{" "}
                              {item.brand_name?.trim() || "—"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {tForm("newIdentification")}:{" "}
                              {item.identification_number?.trim() || "—"}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-right sm:grid-cols-4">
                          <div>
                            <p className="text-[11px] text-muted-foreground">
                              {t("colQtyReorder")}
                            </p>
                            <p className="text-sm tabular-nums">{item.qty}</p>
                          </div>
                          <div>
                            <p className="text-[11px] text-muted-foreground">
                              {t("summaryPricePerUnit")}
                            </p>
                            <p className="text-sm tabular-nums">
                              {money(item.price_per_unit, locale)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] text-muted-foreground">
                              {t("summaryLineDiscount")}
                            </p>
                            <p className="text-sm tabular-nums">
                              {money(item.discount, locale)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] text-muted-foreground">
                              {t("existingPoLineTotal")}
                            </p>
                            <p className="text-sm tabular-nums font-medium">
                              {money(lineTotal, locale)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <dl className="ml-auto grid max-w-xs gap-1 pt-1 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">
                      {t("existingPoProductTotal")}
                    </dt>
                    <dd className="tabular-nums">
                      {money(order.total_price, locale)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">
                      {t("existingPoDiscountBaht")}
                    </dt>
                    <dd className="tabular-nums">
                      {money(order.total_discount, locale)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">
                      {tSummary("afterDiscount")}
                    </dt>
                    <dd className="tabular-nums">
                      {money(order.total_price_discount, locale)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">
                      {tSummary("vat", { percent: order.vat_rate })}
                    </dt>
                    <dd className="tabular-nums">
                      {money(order.total_vat, locale)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 text-base font-semibold text-primary">
                    <dt>{t("existingPoGrandTotal")}</dt>
                    <dd className="tabular-nums">
                      {money(order.total_grand_price, locale)}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
