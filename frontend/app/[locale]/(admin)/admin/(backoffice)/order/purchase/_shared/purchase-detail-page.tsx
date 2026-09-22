"use client";

import { Boxes, Copy, History } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { Button } from "@/components/ui/button";
import { ButtonIcon } from "@/components/ui/button-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRouter } from "@/i18n/navigation";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import { type DisplayLocale, formatDateTime } from "@/lib/format-datetime";
import {
  fetchPurchaseDetail,
  fetchPurchaseHistory,
  OrderPurchaseApiError,
  type PurchaseDetail,
} from "@/lib/order-purchase-api";
import type { TicketHistoryEntry } from "@/lib/order-ticket-api";

import { PurchaseFilesPanel } from "./purchase-files-panel";
import { PurchaseHistoryDialog } from "./purchase-history-dialog";
import { PurchaseItemsTable } from "./purchase-items-table";
import { PurchasePageFooter } from "./purchase-page-footer";
import {
  PurchaseStockHistoryDialog,
  type PurchaseStockHistoryTarget,
} from "./purchase-stock-history-dialog";
import { PurchaseSummaryCard } from "./purchase-summary-card";

function money(n: number, locale: string): string {
  return n.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function PurchaseDetailPage({ purchaseId }: { purchaseId: number }) {
  const locale = useLocale() as DisplayLocale;
  const router = useRouter();
  const tPage = useTranslations("page.orderPurchase");
  const tDetail = useTranslations("page.orderPurchase.detail");
  const tPay = useTranslations("page.orderPurchase.payment");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");
  const perms = useResourcePermissions("order", "order_purchase");

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<PurchaseDetail | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<TicketHistoryEntry[]>([]);
  const [stockTarget, setStockTarget] = useState<PurchaseStockHistoryTarget | null>(
    null
  );
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDetail(await fetchPurchaseDetail(purchaseId));
    } catch (e) {
      toast.error(
        e instanceof OrderPurchaseApiError ? e.message : tError("loadFailed")
      );
    } finally {
      setLoading(false);
    }
  }, [purchaseId, tError]);

  useEffect(() => {
    void load();
  }, [load]);

  const openHistory = async () => {
    setHistoryOpen(true);
    try {
      const res = await fetchPurchaseHistory(locale, purchaseId);
      setHistory(res.items);
    } catch {
      toast.error(tError("loadFailed"));
    }
  };

  if (!perms.view) {
    return <p className="text-muted-foreground">{tError("forbidden")}</p>;
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!detail) {
    return <p className="text-muted-foreground">{tDetail("notFound")}</p>;
  }

  const poNumber = detail.sku?.trim() || detail.sku_draft?.trim() || "";

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(poNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied; the number is on screen either way.
    }
  };

  const showReason =
    (detail.status === "rejected" || detail.status === "cancelled") &&
    detail.note.trim() !== "";

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 pb-20">
      <CrudPageHeader
        title={tDetail("title")}
        description={poNumber}
      />

      {showReason ? (
        <Card className="border-warehouse-error-border bg-warehouse-error-bg shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-warehouse-error-fg">
              {detail.status === "cancelled"
                ? tDetail("cancelReasonHeading")
                : tDetail("rejectReasonHeading")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="whitespace-pre-wrap text-sm">{detail.note}</p>
          </CardContent>
        </Card>
      ) : null}

      <PurchaseSummaryCard detail={detail} />

      <div className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">
          {tDetail("itemsHeading", { count: detail.items.length })}
        </h2>
        <PurchaseItemsTable
          items={detail.items}
          actionsHeader={tDetail("colStockHistory")}
          renderActions={(item) =>
            item.product_item_id != null ? (
              <ButtonIcon
                type="button"
                variant="outline"
                size="sm"
                aria-label={tDetail("ariaOpenStockHistoryRow")}
                onClick={() =>
                  setStockTarget({
                    productItemId: item.product_item_id as number,
                    productName: item.name ?? "",
                    supplierUserId: detail.supplier_user_id ?? null,
                  })
                }
              >
                <Boxes className="text-current" />
              </ButtonIcon>
            ) : (
              <span className="text-muted-foreground">{tDetail("emptyCell")}</span>
            )
          }
        />
      </div>

      <PurchaseFilesPanel files={detail.files} />

      {detail.payments.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">{tDetail("paymentsTitle")}</h2>
          <div className="rounded-md border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tPay("colMethod")}</TableHead>
                  <TableHead>{tPay("colBank")}</TableHead>
                  <TableHead className="text-right tabular-nums">
                    {tPay("colAmount")}
                  </TableHead>
                  <TableHead className="text-center">{tPay("colPaidAt")}</TableHead>
                  <TableHead className="text-center">
                    {tPay("colCreditTerm")}
                  </TableHead>
                  <TableHead className="text-center">{tPay("colCreatedBy")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {payment.payment_method_name?.trim() || "—"}
                    </TableCell>
                    <TableCell>
                      {payment.supplier_bank_name?.trim() || "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(payment.total_price, locale)}{" "}
                      {tPage("currencySuffix")}
                    </TableCell>
                    <TableCell className="text-center">
                      {payment.paid_at
                        ? formatDateTime(payment.paid_at, locale)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {payment.credit_term != null
                        ? tPay("creditDays", { days: payment.credit_term })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {payment.created_by_name?.trim() || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}

      <PurchaseStockHistoryDialog
        target={stockTarget}
        onOpenChange={(open) => !open && setStockTarget(null)}
      />

      <PurchaseHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        entries={history}
      />

      <PurchasePageFooter>
        {poNumber ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => void copyNumber()}
          >
            <Copy className="text-current" aria-hidden />
            {copied ? tDetail("copyDone") : tDetail("copyLabel")}
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={() => void openHistory()}>
          <History className="text-current" aria-hidden />
          {tDetail("openHistory")}
        </Button>
        {perms.update && detail.status === "pending" ? (
          <Button
            type="button"
            onClick={() => router.push(`/admin/order/purchase/${detail.id}`)}
          >
            {tDetail("goApprove")}
          </Button>
        ) : null}
        {perms.update && detail.status === "paying" ? (
          <Button
            type="button"
            onClick={() =>
              router.push(`/admin/order/purchase/${detail.id}/payment`)
            }
          >
            {tDetail("goPayment")}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/order/purchase")}
        >
          {tCrud("btn.back")}
        </Button>
      </PurchasePageFooter>
    </div>
  );
}
