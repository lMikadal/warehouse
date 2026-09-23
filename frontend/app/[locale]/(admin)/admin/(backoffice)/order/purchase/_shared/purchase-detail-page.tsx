"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "@/i18n/navigation";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import {
  type DisplayLocale,
  formatDate,
  formatDateTime,
} from "@/lib/format-datetime";
import {
  fetchPurchaseDetail,
  fetchPurchaseHistory,
  OrderPurchaseApiError,
  type PurchaseDetail,
  type PurchaseStatus,
} from "@/lib/order-purchase-api";
import type { TicketHistoryEntry } from "@/lib/order-ticket-api";
import { cn } from "@/lib/utils";

import { TicketDetailPage } from "../../../sales/ticket/_shared/ticket-detail-page";
import { PurchaseFilesPanel } from "./purchase-files-panel";
import { PurchaseHistoryDialog } from "./purchase-history-dialog";
import { PurchaseItemsTable } from "./purchase-items-table";
import { PurchaseMoneySummary } from "./purchase-money-summary";
import { purchaseStatusPillClass } from "./purchase-status-styles";

const APPROVAL_STEPS = [
  { key: "draft", labelKey: "stepDraft" },
  { key: "pending", labelKey: "stepPending" },
  { key: "pay", labelKey: "stepPay" },
  { key: "done", labelKey: "stepDone" },
] as const;

const HISTORY_PREVIEW_LIMIT = 5;

function approvalStepIndex(status: PurchaseStatus): number {
  switch (status) {
    case "draft":
    case "rejected":
      return 0;
    case "pending":
      return 1;
    case "paying":
      return 2;
    case "completed":
    case "receive_partial":
    case "receive_completed":
      return 3;
    case "cancelled":
      return -1;
  }
}

function cell(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

function money(n: number, locale: string): string {
  return n.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Read-only PO detail: same two-column chrome as approve/payment, no mutate actions. */
export function PurchaseDetailPage({ purchaseId }: { purchaseId: number }) {
  const locale = useLocale() as DisplayLocale;
  const tPage = useTranslations("page.orderPurchase");
  const tDetail = useTranslations("page.orderPurchase.detail");
  const tApprove = useTranslations("page.orderPurchase.approve");
  const tSummary = useTranslations("page.orderPurchase.summary");
  const tPay = useTranslations("page.orderPurchase.payment");
  const tError = useTranslations("error");
  const perms = useResourcePermissions("order", "order_purchase");

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<PurchaseDetail | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<TicketHistoryEntry[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDetail(await fetchPurchaseDetail(purchaseId));
      try {
        const hist = await fetchPurchaseHistory(locale, purchaseId);
        setHistory(hist.items);
      } catch {
        setHistory([]);
      }
    } catch (e) {
      toast.error(
        e instanceof OrderPurchaseApiError ? e.message : tError("loadFailed")
      );
    } finally {
      setLoading(false);
    }
  }, [locale, purchaseId, tError]);

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

  const lineDiscountTotal = useMemo(() => {
    if (!detail) return 0;
    return detail.items.reduce(
      (sum, item) => sum + Math.max(0, item.discount),
      0
    );
  }, [detail]);

  const extraDiscount = useMemo(() => {
    if (!detail) return 0;
    return Math.max(0, detail.discount) + Math.max(0, detail.special_discount);
  }, [detail]);

  if (!perms.view) {
    return <p className="text-muted-foreground">{tError("forbidden")}</p>;
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
          <div className="flex flex-col gap-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!detail) {
    return <p className="text-muted-foreground">{tDetail("notFound")}</p>;
  }

  const poNumber = detail.sku?.trim() || detail.sku_draft?.trim() || "";
  const currentStep = approvalStepIndex(detail.status);
  const historyPreview = history.slice(0, HISTORY_PREVIEW_LIMIT);
  const docRefIso = detail.ordered_at || detail.updated_at;
  const showReason =
    (detail.status === "rejected" || detail.status === "cancelled") &&
    detail.note.trim() !== "";

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
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

      <Tabs defaultValue="po" className="w-full min-w-0 gap-0">
        <TabsList variant="line" className="mb-4">
          <TabsTrigger value="po">{tApprove("tabPoDetail")}</TabsTrigger>
          {detail.purchase_request_id ? (
            <TabsTrigger value="request">
              {tApprove("tabRequestDetail")}
            </TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="po" className="mt-0 outline-none">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6">
            <div className="flex min-w-0 flex-col gap-4">
              <Card className="shadow-none">
                <CardContent className="flex flex-col gap-5 p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className="text-base font-semibold tracking-tight tabular-nums"
                      aria-label={tDetail("purchaseNumberLabel")}
                    >
                      {poNumber || "—"}
                    </span>
                    <Badge
                      variant="secondary"
                      className={purchaseStatusPillClass(detail.status)}
                    >
                      {tPage(`status.${detail.status}`)}
                    </Badge>
                    {detail.is_waiting ? (
                      <Badge
                        variant="secondary"
                        className={purchaseStatusPillClass("pending")}
                      >
                        {tPage("po.refillBadge")}
                      </Badge>
                    ) : null}
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                          {tDetail("createdAtLabel")}
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {formatDate(detail.created_at, locale)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                          {tDetail("creatorLabel")}
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {cell(detail.created_by_name)}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                          {tApprove("partnerLabel")}
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {cell(detail.supplier_name)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                          {tApprove("docRefDateLabel")}
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {formatDate(docRefIso, locale)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {detail.purchase_request_id ? (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-4 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-muted-foreground">
                          {tDetail("requestTicketNumberLabel")}
                        </span>
                        {detail.purchase_request_sku?.trim() ? (
                          <Link
                            href={`/admin/sales/ticket/${detail.purchase_request_id}/detail`}
                            className="font-semibold text-primary tabular-nums underline"
                          >
                            {detail.purchase_request_sku}
                          </Link>
                        ) : (
                          <span className="font-semibold">—</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-muted-foreground">
                          {tDetail("ticketCreatorLabel")}
                        </span>
                        <span className="font-semibold">
                          {cell(detail.request_created_by_name)}
                        </span>
                      </div>
                    </div>
                  ) : null}

                  {detail.note.trim() && !showReason ? (
                    <div className="border-t pt-4">
                      <p className="text-sm text-muted-foreground">
                        {tDetail("noteLabel")}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm">
                        {detail.note}
                      </p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span
                      className="inline-block size-2 rounded-full bg-primary"
                      aria-hidden
                    />
                    {tDetail("itemsHeading", { count: detail.items.length })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <PurchaseItemsTable items={detail.items} />
                </CardContent>
              </Card>

              <Card className="shadow-none">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span
                      className="inline-block size-2 rounded-full bg-primary"
                      aria-hidden
                    />
                    {tDetail("historyTitle")}
                  </CardTitle>
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-sm"
                    onClick={() => void openHistory()}
                  >
                    {tDetail("viewAllHistory")}
                  </Button>
                </CardHeader>
                <CardContent className="pt-0">
                  {historyPreview.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {tError("noData")}
                    </p>
                  ) : (
                    <ul className="space-y-0" role="list">
                      {historyPreview.map((entry, rowIndex) => {
                        const isLast = rowIndex === historyPreview.length - 1;
                        return (
                          <li key={entry.id} className="flex gap-3">
                            <div className="flex w-8 shrink-0 flex-col items-center self-stretch">
                              <div
                                className="relative mt-0.5 size-3 shrink-0 rounded-full bg-primary ring-[3px] ring-background"
                                aria-hidden
                              />
                              {!isLast ? (
                                <div
                                  className="mx-auto mt-0.5 min-h-3 w-px flex-1 bg-border"
                                  aria-hidden
                                />
                              ) : null}
                            </div>
                            <div
                              className={cn(
                                "min-w-0 flex-1",
                                isLast ? "pb-0" : "pb-5"
                              )}
                            >
                              <p className="text-sm leading-snug font-semibold wrap-break-word">
                                {entry.title}
                              </p>
                              <p className="mt-1 text-xs leading-snug text-muted-foreground">
                                <time dateTime={entry.created_at}>
                                  {formatDateTime(entry.created_at, locale)}
                                </time>
                                <span aria-hidden> · </span>
                                <span>
                                  {entry.created_by_name?.trim() || "—"}
                                </span>
                              </p>
                              {entry.description ? (
                                <p className="mt-2 text-sm leading-snug wrap-break-word text-muted-foreground">
                                  {entry.description}
                                </p>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {detail.payments.length > 0 ? (
                <Card className="shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      {tDetail("paymentsTitle")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="rounded-md border bg-background">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{tPay("colMethod")}</TableHead>
                            <TableHead>{tPay("colBank")}</TableHead>
                            <TableHead className="text-right tabular-nums">
                              {tPay("colAmount")}
                            </TableHead>
                            <TableHead className="text-center">
                              {tPay("colPaidAt")}
                            </TableHead>
                            <TableHead className="text-center">
                              {tPay("colCreditTerm")}
                            </TableHead>
                            <TableHead className="text-center">
                              {tPay("colCreatedBy")}
                            </TableHead>
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
                                  ? tPay("creditDays", {
                                      days: payment.credit_term,
                                    })
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
                  </CardContent>
                </Card>
              ) : null}

              <PurchaseFilesPanel files={detail.files} />
            </div>

            <div className="flex flex-col gap-4 lg:sticky lg:top-4">
              <Card className="shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{tSummary("title")}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <PurchaseMoneySummary
                    totals={detail}
                    vatPercent={
                      detail.vat_type === "none" ? 0 : detail.vat_rate
                    }
                    lineCount={detail.items.length}
                    lineDiscountTotal={lineDiscountTotal}
                    extraDiscount={extraDiscount}
                    emphasizeNet
                    className="border-t-0 pt-0 gap-3"
                  />
                </CardContent>
              </Card>

              <Card className="shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {tApprove("approvalStepsTitle")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ol className="relative space-y-0 pl-1">
                    {APPROVAL_STEPS.map((step, index) => {
                      const done =
                        currentStep >= 0 && index <= currentStep;
                      return (
                        <li
                          key={step.key}
                          className="relative flex gap-3 pb-6 last:pb-0"
                        >
                          {index < APPROVAL_STEPS.length - 1 ? (
                            <div
                              className={cn(
                                "absolute top-6 bottom-0 left-1.25 w-px",
                                done ? "bg-border" : "bg-muted"
                              )}
                              aria-hidden
                            />
                          ) : null}
                          <div className="relative z-1 flex flex-col items-center">
                            <div
                              className={cn(
                                "size-3 rounded-full border-2 border-background shadow-sm",
                                done
                                  ? "bg-warehouse-success-fg"
                                  : "bg-muted-foreground/40"
                              )}
                              aria-hidden
                            />
                          </div>
                          <div className="-mt-0.5 min-w-0 flex-1">
                            <span
                              className={cn(
                                "text-sm font-medium",
                                done
                                  ? "text-foreground"
                                  : "text-muted-foreground"
                              )}
                            >
                              {tApprove(step.labelKey)}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {detail.purchase_request_id ? (
          <TabsContent value="request" className="mt-0 outline-none">
            <TicketDetailPage
              ticketId={detail.purchase_request_id}
              embedded
            />
          </TabsContent>
        ) : null}
      </Tabs>

      <PurchaseHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        entries={history}
      />
    </div>
  );
}
