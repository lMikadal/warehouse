"use client";

import { ChevronDown, ShoppingBag } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { type DisplayLocale, formatDateTime } from "@/lib/format-datetime";
import type { PurchaseListItem } from "@/lib/order-purchase-api";
import { cn } from "@/lib/utils";

import { purchaseStatusPillClass } from "./purchase-status-styles";

function money(n: number, locale: string): string {
  return n.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export type PurchaseTicketExistingPosPanelProps = {
  orders: PurchaseListItem[];
  loading: boolean;
  error: string | null;
};

export function PurchaseTicketExistingPosPanel({
  orders,
  loading,
  error,
}: PurchaseTicketExistingPosPanelProps) {
  const locale = useLocale() as DisplayLocale;
  const t = useTranslations("page.orderPurchase.receive");
  const tStatus = useTranslations("page.orderPurchase.status");
  const [openIds, setOpenIds] = useState<Record<number, boolean>>({});

  if (loading && orders.length === 0) {
    return (
      <p className="px-1 text-sm text-muted-foreground">{t("loading")}</p>
    );
  }

  if (error) {
    return <p className="px-1 text-sm text-destructive">{error}</p>;
  }

  if (orders.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="px-1 text-sm font-medium">{t("existingPoSectionTitle")}</p>
      {orders.map((order) => {
        const open = openIds[order.id] ?? false;
        const number = order.sku?.trim() || order.sku_draft?.trim() || `#${order.id}`;
        return (
          <Card key={order.id} className="shadow-none">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 px-4 py-3">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                onClick={() =>
                  setOpenIds((prev) => ({ ...prev, [order.id]: !open }))
                }
              >
                <ShoppingBag className="size-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <CardTitle className="truncate text-sm font-semibold">
                    {number}
                  </CardTitle>
                  <p className="truncate text-xs text-muted-foreground">
                    {order.supplier_name?.trim() || "—"} ·{" "}
                    {formatDateTime(order.created_at, locale)}
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-muted-foreground transition-transform",
                    open && "rotate-180"
                  )}
                />
              </button>
              <span className={purchaseStatusPillClass(order.status)}>
                {tStatus(order.status)}
              </span>
            </CardHeader>
            {open ? (
              <CardContent className="space-y-2 px-4 pb-4">
                <p className="text-xs text-muted-foreground">
                  {t("existingPoReadOnlyHint")}
                </p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t("summaryLineCountShort", {
                      count: order.total_qty,
                    })}
                  </span>
                  <span className="tabular-nums font-medium">
                    {money(order.total_grand_price, locale)}
                  </span>
                </div>
                <Button asChild type="button" variant="outline" size="sm">
                  <Link href={`/admin/order/purchase/${order.id}/detail`}>
                    {t("existingPoOpenDetail")}
                  </Link>
                </Button>
              </CardContent>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
