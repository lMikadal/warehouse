"use client";

import { Check, Download, RefreshCw, SquarePen, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonIcon } from "@/components/ui/button-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Link, useRouter } from "@/i18n/navigation";
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
  patchPurchaseItemStatus,
  patchPurchaseStatus,
  updatePurchaseItem,
  type PurchaseDetail,
  type PurchaseItemDetail,
  type PurchaseStatus,
} from "@/lib/order-purchase-api";
import type { TicketHistoryEntry } from "@/lib/order-ticket-api";

import {
  clampLineDiscount,
  lineNet,
  roundMoney,
} from "../_lib/purchase-totals";
import { TicketDetailPage } from "../../../sales/ticket/_shared/ticket-detail-page";
import { PurchaseHistoryDialog } from "./purchase-history-dialog";
import { PurchaseItemsTable } from "./purchase-items-table";
import { PurchaseMoneySummary } from "./purchase-money-summary";
import { purchaseStatusPillClass } from "./purchase-status-styles";

type LineEditDraft = {
  qty: string;
  price: string;
  discount: string;
};

function draftFromItem(item: PurchaseItemDetail): LineEditDraft {
  return {
    qty: String(item.qty),
    price: String(item.price_per_unit),
    discount: String(item.discount),
  };
}

function money(n: number, locale: string): string {
  return n.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** v1 stepper on the approve screen; the PO's own status decides how far it has come. */
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
      // A cancelled PO stops where it was, so the strip shows no step as current.
      return -1;
  }
}

function cell(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

/** v1 approve screen: decide each line, then hand the whole PO to the payment step. */
export function PurchaseApprovePage({ purchaseId }: { purchaseId: number }) {
  const locale = useLocale() as DisplayLocale;
  const router = useRouter();
  const tPage = useTranslations("page.orderPurchase");
  const tApprove = useTranslations("page.orderPurchase.approve");
  const tDetail = useTranslations("page.orderPurchase.detail");
  const tSummary = useTranslations("page.orderPurchase.summary");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");
  const tForm = useTranslations("page.orderPurchase.form");
  const tFormUi = useTranslations("form");
  const perms = useResourcePermissions("order", "order_purchase");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [detail, setDetail] = useState<PurchaseDetail | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<TicketHistoryEntry[]>([]);
  /** "revision" sends the PO back to the buyer; "cancel" kills it. Both need a reason. */
  const [reasonMode, setReasonMode] = useState<"revision" | "cancel" | null>(
    null
  );
  const [reason, setReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<LineEditDraft | null>(null);
  const [savingLineId, setSavingLineId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDetail(await fetchPurchaseDetail(purchaseId));
      try {
        const res = await fetchPurchaseHistory(locale, purchaseId);
        setHistory(res.items);
      } catch {
        // History is secondary chrome; keep the page usable if the feed fails.
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

  const startLineEdit = (item: PurchaseItemDetail) => {
    setEditingItemId(item.id);
    setEditDraft(draftFromItem(item));
  };

  const cancelLineEdit = () => {
    setEditingItemId(null);
    setEditDraft(null);
  };

  const saveLineEdit = async (item: PurchaseItemDetail) => {
    if (!editDraft) return;
    const qtyNum = Math.max(0, Math.floor(Number(editDraft.qty) || 0));
    const priceNum = Math.max(0, Number(editDraft.price) || 0);
    if (qtyNum < 1) {
      toast.error(tForm("errorQtyRequired"));
      return;
    }
    const discountNum = clampLineDiscount(
      qtyNum,
      priceNum,
      Number(editDraft.discount) || 0
    );
    setSavingLineId(item.id);
    try {
      await updatePurchaseItem(locale, purchaseId, item.id, {
        type: item.type,
        product_item_id: item.product_item_id ?? null,
        name: item.name ?? null,
        product_attribute_brand_id: item.product_attribute_brand_id ?? null,
        product_attribute_model_id: item.product_attribute_model_id ?? null,
        product_attribute_engine_id: item.product_attribute_engine_id ?? null,
        identification_number: item.identification_number,
        qty: qtyNum,
        free_gift: item.free_gift,
        unit: item.unit,
        price_per_unit: roundMoney(priceNum),
        vat_rate: item.vat_rate,
        discount: discountNum,
        note: item.note,
        system_file_ids: item.files.map((f) => f.system_file_id),
      });
      toast.success(tApprove("editSaveSuccess"));
      cancelLineEdit();
      await load();
    } catch (e) {
      toast.error(
        e instanceof OrderPurchaseApiError ? e.message : tError("saveFailed")
      );
    } finally {
      setSavingLineId(null);
    }
  };

  /** Approve everything still pending, then move the order to paying, exactly as v1 did. */
  const approveOrder = async () => {
    if (!detail) return;
    setSubmitting(true);
    try {
      const pending = detail.items.filter((item) => item.status === "pending");
      for (const item of pending) {
        await patchPurchaseItemStatus(locale, purchaseId, item.id, "approved");
      }
      await patchPurchaseStatus(
        locale,
        purchaseId,
        "paying",
        remarks.trim() || undefined
      );
      toast.success(tApprove("approveSuccess"));
      router.push("/admin/order/purchase");
    } catch (e) {
      toast.error(
        e instanceof OrderPurchaseApiError ? e.message : tError("saveFailed")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const submitReason = async () => {
    if (!reasonMode) return;
    if (!reason.trim()) {
      toast.error(tApprove("pleaseAddNote"));
      return;
    }
    setSubmitting(true);
    try {
      await patchPurchaseStatus(
        locale,
        purchaseId,
        reasonMode === "cancel" ? "cancelled" : "rejected",
        reason.trim()
      );
      toast.success(
        reasonMode === "cancel"
          ? tApprove("cancelSuccess")
          : tApprove("rejectSuccess")
      );
      router.push("/admin/order/purchase");
    } catch (e) {
      toast.error(
        e instanceof OrderPurchaseApiError ? e.message : tError("saveFailed")
      );
    } finally {
      setSubmitting(false);
      setReasonMode(null);
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

  if (!perms.update) {
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

  // Once the PO leaves pending the decisions are locked; the screen stays readable as a record.
  const locked = detail.status !== "pending";
  const currentStep = approvalStepIndex(detail.status);
  const allRejected =
    detail.items.length > 0 &&
    detail.items.every((item) => item.status === "rejected");
  const poNumber = detail.sku?.trim() || detail.sku_draft?.trim() || "";
  const historyPreview = history.slice(0, HISTORY_PREVIEW_LIMIT);
  const docRefIso = detail.ordered_at || detail.updated_at;

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      {allRejected ? (
        <p className="rounded-md border border-warehouse-error-border bg-warehouse-error-bg p-3 text-sm text-warehouse-error-fg">
          {tApprove("allLinesRejected")}
        </p>
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
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
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
                    {locked ? null : (
                      <Button
                        type="button"
                        className="gap-2"
                        onClick={() =>
                          toast.info(tApprove("downloadPoComingSoon"))
                        }
                      >
                        <Download className="size-4 shrink-0" aria-hidden />
                        {tApprove("downloadPo")}
                      </Button>
                    )}
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

                  {detail.note.trim() ? (
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
                  <PurchaseItemsTable
                    items={detail.items}
                    actionsHeader={tApprove("colAction")}
                    renderQty={(item) => {
                      if (editingItemId !== item.id || !editDraft) {
                        return (
                          <>
                            {item.qty.toLocaleString()}
                            {item.free_gift > 0 ? (
                              <span className="ml-1 text-xs text-warehouse-success-fg">
                                +{item.free_gift}
                              </span>
                            ) : null}
                          </>
                        );
                      }
                      return (
                        <Input
                          inputMode="numeric"
                          className="mx-auto h-8 w-20 text-center tabular-nums"
                          value={editDraft.qty}
                          placeholder={tFormUi("placeholder.input", {
                            label: tApprove("editQtyLabel"),
                          })}
                          disabled={savingLineId === item.id}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            setEditDraft((prev) =>
                              prev ? { ...prev, qty: e.target.value } : prev
                            )
                          }
                        />
                      );
                    }}
                    renderPrice={(item) => {
                      if (editingItemId !== item.id || !editDraft) {
                        return money(item.price_per_unit, locale);
                      }
                      return (
                        <Input
                          inputMode="decimal"
                          className="ml-auto h-8 w-24 text-right tabular-nums"
                          value={editDraft.price}
                          placeholder={tFormUi("placeholder.input", {
                            label: tForm("colPricePerUnit"),
                          })}
                          disabled={savingLineId === item.id}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            setEditDraft((prev) =>
                              prev ? { ...prev, price: e.target.value } : prev
                            )
                          }
                        />
                      );
                    }}
                    renderDiscount={(item) => {
                      if (editingItemId !== item.id || !editDraft) {
                        return money(item.discount, locale);
                      }
                      return (
                        <Input
                          inputMode="decimal"
                          className="ml-auto h-8 w-24 text-right tabular-nums"
                          value={editDraft.discount}
                          placeholder={tFormUi("placeholder.input", {
                            label: tApprove("editDiscountLabel"),
                          })}
                          disabled={savingLineId === item.id}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            setEditDraft((prev) =>
                              prev
                                ? { ...prev, discount: e.target.value }
                                : prev
                            )
                          }
                        />
                      );
                    }}
                    renderLineNet={(item) => {
                      if (editingItemId !== item.id || !editDraft) {
                        return money(
                          lineNet({
                            qty: item.qty,
                            price_per_unit: item.price_per_unit,
                            discount: item.discount,
                          }),
                          locale
                        );
                      }
                      const qtyNum = Math.max(
                        0,
                        Math.floor(Number(editDraft.qty) || 0)
                      );
                      const priceNum = Math.max(
                        0,
                        Number(editDraft.price) || 0
                      );
                      const discountNum = clampLineDiscount(
                        qtyNum,
                        priceNum,
                        Number(editDraft.discount) || 0
                      );
                      return money(
                        lineNet({
                          qty: qtyNum,
                          price_per_unit: priceNum,
                          discount: discountNum,
                        }),
                        locale
                      );
                    }}
                    renderActions={(item) => {
                      if (locked) {
                        return (
                          <span className="text-muted-foreground">—</span>
                        );
                      }
                      if (editingItemId === item.id) {
                        return (
                          <>
                            <ButtonIcon
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={savingLineId === item.id}
                              aria-label={tApprove("editCancel")}
                              onClick={() => cancelLineEdit()}
                            >
                              <X className="text-current" />
                            </ButtonIcon>
                            <ButtonIcon
                              type="button"
                              variant="outline"
                              tone="add"
                              size="sm"
                              disabled={savingLineId === item.id}
                              aria-label={tApprove("editSave")}
                              onClick={() => void saveLineEdit(item)}
                            >
                              <Check className="text-current" />
                            </ButtonIcon>
                          </>
                        );
                      }
                      return (
                        <ButtonIcon
                          type="button"
                          variant="outline"
                          tone="edit"
                          size="sm"
                          disabled={
                            submitting ||
                            savingLineId != null ||
                            (editingItemId != null &&
                              editingItemId !== item.id)
                          }
                          aria-label={tApprove("ariaEditItem")}
                          onClick={() => startLineEdit(item)}
                        >
                          <SquarePen className="text-current" />
                        </ButtonIcon>
                      );
                    }}
                  />
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
                <CardContent className="flex flex-col gap-4 pt-0">
                  <ol className="relative space-y-0 pl-1">
                    {APPROVAL_STEPS.map((step, index) => {
                      const done = currentStep >= 0 && index < currentStep;
                      const current = index === currentStep;
                      const upcoming = !done && !current;
                      return (
                        <li
                          key={step.key}
                          className="relative flex gap-3 pb-6 last:pb-0"
                        >
                          {index < APPROVAL_STEPS.length - 1 ? (
                            <div
                              className={cn(
                                "absolute top-6 bottom-0 left-1.25 w-px",
                                done || current ? "bg-border" : "bg-muted"
                              )}
                              aria-hidden
                            />
                          ) : null}
                          <div className="relative z-1 flex flex-col items-center">
                            <div
                              className={cn(
                                "size-3 rounded-full border-2 border-background shadow-sm",
                                current
                                  ? "bg-warehouse-warning-fg"
                                  : done
                                    ? "bg-warehouse-success-fg"
                                    : "bg-muted-foreground/40"
                              )}
                              aria-hidden
                            />
                          </div>
                          <div className="-mt-0.5 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={cn(
                                  "text-sm font-medium",
                                  upcoming
                                    ? "text-muted-foreground"
                                    : "text-foreground"
                                )}
                              >
                                {tApprove(step.labelKey)}
                              </span>
                              {current ? (
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "border-0 text-xs font-semibold",
                                    purchaseStatusPillClass("pending")
                                  )}
                                >
                                  {tApprove("stepCurrentBadge")}
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>

                  {locked ? (
                    <p className="text-sm text-muted-foreground">
                      {tApprove("approveLockedHint")}
                    </p>
                  ) : (
                    <div className="grid gap-1 border-t pt-4">
                      <Label htmlFor="purchase-approve-remarks">
                        {tApprove("approvalRemarksLabel")}
                      </Label>
                      <Textarea
                        id="purchase-approve-remarks"
                        rows={2}
                        value={remarks}
                        placeholder={tApprove("approvalRemarksPlaceholder")}
                        onChange={(e) => setRemarks(e.target.value)}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {locked ? null : (
                <div className="flex w-full flex-col gap-2 border-t pt-4">
                  <Button
                    type="button"
                    variant="success"
                    className="h-10 w-full gap-2 text-sm font-semibold"
                    disabled={submitting || allRejected}
                    onClick={() => void approveOrder()}
                  >
                    <Check className="size-4 shrink-0" aria-hidden />
                    {tApprove("confirmButton")}
                  </Button>
                  <div className="flex w-full gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 flex-1 gap-1.5 border-warehouse-error-border bg-transparent text-xs font-semibold text-warehouse-error-fg hover:bg-warehouse-error-bg"
                      disabled={submitting}
                      onClick={() => {
                        setReason("");
                        setReasonMode("cancel");
                      }}
                    >
                      <X className="size-3.5 shrink-0" aria-hidden />
                      {tApprove("cancelOrderShort")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 flex-1 gap-1.5 border-warehouse-warning-border bg-transparent text-xs font-semibold text-warehouse-warning-fg hover:bg-warehouse-warning-bg"
                      disabled={submitting}
                      onClick={() => {
                        setReason("");
                        setReasonMode("revision");
                      }}
                    >
                      <RefreshCw className="size-3.5 shrink-0" aria-hidden />
                      {tApprove("requestRevision")}
                    </Button>
                  </div>
                </div>
              )}
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

      <Dialog
        open={reasonMode != null}
        onOpenChange={(open) => !open && setReasonMode(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reasonMode === "cancel"
                ? tApprove("cancelDialogTitle")
                : tApprove("rejectDialogTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-1">
            <Label htmlFor="purchase-approve-reason">
              {tApprove("noteLabel")}
            </Label>
            <Textarea
              id="purchase-approve-reason"
              rows={3}
              value={reason}
              placeholder={tApprove("notePlaceholder")}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setReasonMode(null)}
            >
              {tCrud("btn.cancel")}
            </Button>
            <Button
              type="button"
              variant={reasonMode === "cancel" ? "destructive" : "default"}
              disabled={submitting}
              onClick={() => void submitReason()}
            >
              {tPage("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PurchaseHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        entries={history}
      />
    </div>
  );
}
