"use client";

import {
  Check,
  Paperclip,
  RefreshCw,
  SquarePen,
  Trash2,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ImageUploadField } from "@/components/molecules/image-upload-field";
import { RemoteComboboxField } from "@/components/molecules/remote-combobox-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonIcon } from "@/components/ui/button-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Link, useRouter } from "@/i18n/navigation";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import {
  type DisplayLocale,
  formatDate,
  formatDateTime,
} from "@/lib/format-datetime";
import {
  createPurchasePayment,
  deletePurchasePayment,
  fetchPurchaseDetail,
  fetchPurchaseFilters,
  fetchPurchaseHistory,
  loadPurchaseFilterOptions,
  OrderPurchaseApiError,
  patchPurchaseStatus,
  resolvePurchaseFilterLabel,
  updatePurchaseItem,
  type PurchaseDetail,
  type PurchaseFilterItem,
  type PurchaseItemDetail,
  type PurchaseStatus,
} from "@/lib/order-purchase-api";
import type { TicketHistoryEntry } from "@/lib/order-ticket-api";
import {
  fetchSystemFile,
  resolveSettingLogoFileId,
  type ImageUploadItem,
} from "@/lib/system-file-api";
import { cn } from "@/lib/utils";

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

function draftFromItem(item: PurchaseItemDetail): LineEditDraft {
  return {
    qty: String(item.qty),
    price: String(item.price_per_unit),
    discount: String(item.discount),
  };
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

/** v1 payment screen: record one payment against a paying PO, which then becomes completed. */
export function PurchasePaymentPage({ purchaseId }: { purchaseId: number }) {
  const locale = useLocale() as DisplayLocale;
  const router = useRouter();
  const tPage = useTranslations("page.orderPurchase");
  const tPay = useTranslations("page.orderPurchase.payment");
  const tDetail = useTranslations("page.orderPurchase.detail");
  const tApprove = useTranslations("page.orderPurchase.approve");
  const tSummary = useTranslations("page.orderPurchase.summary");
  const tForm = useTranslations("page.orderPurchase.form");
  const tFormUi = useTranslations("form");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");
  const perms = useResourcePermissions("order", "order_purchase");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [detail, setDetail] = useState<PurchaseDetail | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<TicketHistoryEntry[]>([]);
  const [reasonMode, setReasonMode] = useState<"revision" | "cancel" | null>(
    null
  );
  const [reason, setReason] = useState("");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<LineEditDraft | null>(null);
  const [savingLineId, setSavingLineId] = useState<number | null>(null);
  const [bankDetail, setBankDetail] = useState<PurchaseFilterItem | null>(null);

  const [methodId, setMethodId] = useState("");
  const [bankId, setBankId] = useState("");
  const [amount, setAmount] = useState("");
  const [creditTerm, setCreditTerm] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [note, setNote] = useState("");
  const [slip, setSlip] = useState<ImageUploadItem[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchPurchaseDetail(purchaseId);
      setDetail(res);
      const paid = res.payments.reduce((sum, p) => sum + p.total_price, 0);
      setAmount(String(roundMoney(Math.max(0, res.total_grand_price - paid))));
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

  const paidTotal = useMemo(
    () => (detail?.payments ?? []).reduce((sum, p) => sum + p.total_price, 0),
    [detail]
  );

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

  const openHistory = async () => {
    setHistoryOpen(true);
    try {
      const res = await fetchPurchaseHistory(locale, purchaseId);
      setHistory(res.items);
    } catch {
      toast.error(tError("loadFailed"));
    }
  };

  useEffect(() => {
    const id = Number(bankId);
    if (!Number.isFinite(id) || id <= 0 || !detail?.supplier_user_id) {
      return;
    }
    const controller = new AbortController();
    void fetchPurchaseFilters({
      facet: "supplier_banks",
      id,
      limit: 1,
      extra: { supplier_user_id: String(detail.supplier_user_id) },
      signal: controller.signal,
    })
      .then((res) => setBankDetail(res.items[0] ?? null))
      .catch(() => setBankDetail(null));
    return () => controller.abort();
  }, [bankId, detail?.supplier_user_id]);

  const resolvedBank =
    Number(bankId) > 0 && detail?.supplier_user_id ? bankDetail : null;

  const supplierExtra = detail?.supplier_user_id
    ? { supplier_user_id: String(detail.supplier_user_id) }
    : undefined;

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

  const submitPayment = async () => {
    if (!detail) return;
    if (!methodId) {
      toast.error(tPay("noPayChannels"));
      return;
    }
    const total = roundMoney(Number(amount) || 0);
    if (total <= 0) {
      toast.error(tPay("errorAmountRequired"));
      return;
    }
    setSubmitting(true);
    try {
      const systemFileId = await resolveSettingLogoFileId(
        locale,
        "purchase_order_payment_proof",
        slip,
        null
      );
      await createPurchasePayment(locale, detail.id, {
        setting_payment_method_id: Number(methodId),
        supplier_bank_id: bankId ? Number(bankId) : null,
        vat_rate: detail.vat_rate,
        discount: detail.discount,
        total_price: total,
        note,
        system_file_id: systemFileId ?? null,
        credit_term: creditTerm ? Number(creditTerm) : null,
        paid_at: paidAt || null,
      });
      await patchPurchaseStatus(locale, detail.id, "completed");
      toast.success(tPay("paymentSuccess"));
      setPaymentDialogOpen(false);
      router.push("/admin/order/purchase");
    } catch (e) {
      toast.error(
        e instanceof OrderPurchaseApiError ? e.message : tError("saveFailed")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const removePayment = async (paymentId: number) => {
    setSubmitting(true);
    try {
      await deletePurchasePayment(locale, purchaseId, paymentId);
      toast.success(tPay("paymentDeleted"));
      await load();
    } catch (e) {
      toast.error(
        e instanceof OrderPurchaseApiError ? e.message : tError("deleteFailed")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openProof = async (systemFileId: number) => {
    try {
      const file = await fetchSystemFile(locale, systemFileId);
      window.open(file.url, "_blank", "noreferrer");
    } catch {
      toast.error(tError("loadFailed"));
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

  const locked = detail.status !== "paying";
  const currentStep = approvalStepIndex(detail.status);
  const poNumber = detail.sku?.trim() || detail.sku_draft?.trim() || "";
  const historyPreview = history.slice(0, HISTORY_PREVIEW_LIMIT);
  const docRefIso = detail.ordered_at || detail.updated_at;
  const outstanding = roundMoney(
    Math.max(0, detail.total_grand_price - paidTotal)
  );
  const canEditLine = (item: PurchaseItemDetail) =>
    !locked && item.status === "approved";

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
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
                      if (
                        editingItemId !== item.id ||
                        !editDraft ||
                        !canEditLine(item)
                      ) {
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
                      if (
                        editingItemId !== item.id ||
                        !editDraft ||
                        !canEditLine(item)
                      ) {
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
                      if (
                        editingItemId !== item.id ||
                        !editDraft ||
                        !canEditLine(item)
                      ) {
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
                      if (
                        editingItemId !== item.id ||
                        !editDraft ||
                        !canEditLine(item)
                      ) {
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
                      if (!canEditLine(item)) {
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

              {detail.payments.length > 0 ? (
                <Card className="shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      {tPay("paymentsHeading")}
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
                              {tPay("colProof")}
                            </TableHead>
                            <TableHead className="text-center">
                              {tCrud("table.actions")}
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detail.payments.map((payment) => (
                            <TableRow key={payment.id}>
                              <TableCell>
                                {payment.payment_method_name?.trim() ||
                                  tDetail("emptyCell")}
                              </TableCell>
                              <TableCell>
                                {payment.supplier_bank_name?.trim() ||
                                  tDetail("emptyCell")}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {money(payment.total_price, locale)}
                              </TableCell>
                              <TableCell className="text-center">
                                {payment.paid_at
                                  ? formatDateTime(payment.paid_at, locale)
                                  : tDetail("emptyCell")}
                              </TableCell>
                              <TableCell className="text-center">
                                {payment.system_file_id != null ? (
                                  <ButtonIcon
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    aria-label={tPay("colProof")}
                                    onClick={() =>
                                      void openProof(
                                        payment.system_file_id as number
                                      )
                                    }
                                  >
                                    <Paperclip className="text-current" />
                                  </ButtonIcon>
                                ) : (
                                  <span className="text-muted-foreground">
                                    {tDetail("emptyCell")}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <ButtonIcon
                                  type="button"
                                  variant="outline"
                                  tone="delete"
                                  size="sm"
                                  disabled={submitting || locked}
                                  aria-label={tPay("deletePayment")}
                                  onClick={() => void removePayment(payment.id)}
                                >
                                  <Trash2 className="text-current" />
                                </ButtonIcon>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
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
                    <p className="mt-2 text-sm text-muted-foreground">
                      {tPay("lockedHint", {
                        status: tPage(`status.${detail.status}`),
                      })}
                    </p>
                  ) : null}
                </CardContent>
              </Card>

              {locked ? null : (
                <div className="flex w-full flex-col gap-2 border-t pt-4">
                  <Button
                    type="button"
                    variant="success"
                    className="h-10 w-full gap-2 text-sm font-semibold"
                    disabled={submitting}
                    onClick={() => setPaymentDialogOpen(true)}
                  >
                    {tPay("confirmPayment")}
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
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{tPay("dialogTitle")}</DialogTitle>
          </DialogHeader>
          <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto pr-1">
            <dl className="grid gap-1 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{tPay("alreadyPaid")}</dt>
                <dd className="tabular-nums">{money(paidTotal, locale)}</dd>
              </div>
              <div className="flex justify-between gap-2 font-semibold">
                <dt>{tPay("outstanding")}</dt>
                <dd className="tabular-nums">{money(outstanding, locale)}</dd>
              </div>
            </dl>

            <RemoteComboboxField
              label={tPay("paymentType")}
              value={methodId}
              onValueChange={setMethodId}
              placeholder={tPay("methodPickerTitle")}
              emptyLabel={tError("noData")}
              inputClassName="w-full"
              showClear
              onLoadOptions={(ctx) =>
                loadPurchaseFilterOptions("payment_methods", ctx, {
                  is_purchase: "true",
                })
              }
              resolveSelectedLabel={(v) =>
                resolvePurchaseFilterLabel("payment_methods", v, {
                  is_purchase: "true",
                })
              }
            />

            <RemoteComboboxField
              label={tPay("selectBank")}
              value={bankId}
              onValueChange={setBankId}
              placeholder={tFormUi("placeholder.select", {
                label: tPay("selectBank"),
              })}
              emptyLabel={tError("noData")}
              inputClassName="w-full"
              disabled={!detail.supplier_user_id}
              showClear
              onLoadOptions={(ctx) =>
                loadPurchaseFilterOptions("supplier_banks", ctx, supplierExtra)
              }
              resolveSelectedLabel={(v) =>
                resolvePurchaseFilterLabel("supplier_banks", v, supplierExtra)
              }
            />

            {resolvedBank ? (
              <div className="space-y-1 rounded-md border bg-muted/40 p-3 text-sm">
                {resolvedBank.sku?.trim() ? (
                  <div>
                    <span className="text-muted-foreground">
                      {tPay("accountNumber")}
                    </span>{" "}
                    <span className="font-medium tabular-nums">
                      {resolvedBank.sku}
                    </span>
                  </div>
                ) : null}
                {resolvedBank.account_name?.trim() ? (
                  <div>
                    <span className="text-muted-foreground">
                      {tPay("accountName")}
                    </span>{" "}
                    <span className="font-medium">
                      {resolvedBank.account_name}
                    </span>
                  </div>
                ) : null}
                {resolvedBank.branch?.trim() ? (
                  <div>
                    <span className="text-muted-foreground">{tPay("branch")}</span>{" "}
                    <span className="font-medium">{resolvedBank.branch}</span>
                  </div>
                ) : null}
                <p className="pt-1 text-xs text-muted-foreground">
                  {tPay("bankAfterTransferHint")}
                </p>
              </div>
            ) : null}

            <div className="grid gap-1">
              <Label htmlFor="purchase-payment-amount">
                {tPay("totalPrice")}{" "}
                <span className="text-warehouse-error-fg" aria-hidden="true">
                  *
                </span>
              </Label>
              <Input
                id="purchase-payment-amount"
                inputMode="decimal"
                className="tabular-nums"
                value={amount}
                placeholder={tFormUi("placeholder.input", {
                  label: tPay("totalPrice"),
                })}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-1">
                <Label htmlFor="purchase-payment-paid-at">
                  {tPay("paymentDate")}
                </Label>
                <Input
                  id="purchase-payment-paid-at"
                  type="date"
                  value={paidAt}
                  onChange={(e) => setPaidAt(e.target.value)}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="purchase-payment-credit-term">
                  {tPay("creditTermLabel")}
                </Label>
                <Input
                  id="purchase-payment-credit-term"
                  inputMode="numeric"
                  className="tabular-nums"
                  value={creditTerm}
                  placeholder={tFormUi("placeholder.input", {
                    label: tPay("creditTermLabel"),
                  })}
                  onChange={(e) => setCreditTerm(e.target.value)}
                />
              </div>
            </div>

            <ImageUploadField
              id="purchase-payment-slip"
              labelKey="page.orderPurchase.payment.slip"
              purpose="purchase_order_payment_proof"
              value={slip}
              onChange={setSlip}
              maxFiles={1}
            />

            <div className="grid gap-1">
              <Label htmlFor="purchase-payment-note">
                {tPay("paymentNoteOptionalHeading")}
              </Label>
              <Textarea
                id="purchase-payment-note"
                rows={2}
                value={note}
                placeholder={tPay("paymentNotePlaceholder")}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPaymentDialogOpen(false)}
            >
              {tCrud("btn.cancel")}
            </Button>
            <Button
              type="button"
              variant="success"
              disabled={submitting}
              onClick={() => void submitPayment()}
            >
              {tPay("confirmPayment")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <Label htmlFor="purchase-payment-reason">
              {tApprove("noteLabel")}
            </Label>
            <Textarea
              id="purchase-payment-reason"
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
