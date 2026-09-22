"use client";

import { History, Paperclip, Pencil, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { ImageUploadField } from "@/components/molecules/image-upload-field";
import { RemoteComboboxField } from "@/components/molecules/remote-combobox-field";
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
import { useRouter } from "@/i18n/navigation";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import { type DisplayLocale, formatDateTime } from "@/lib/format-datetime";
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
  type PurchaseDetail,
  type PurchaseFilterItem,
  type PurchaseItemDetail,
} from "@/lib/order-purchase-api";
import type { TicketHistoryEntry } from "@/lib/order-ticket-api";
import {
  fetchSystemFile,
  resolveSettingLogoFileId,
  type ImageUploadItem,
} from "@/lib/system-file-api";

import { roundMoney } from "../_lib/purchase-totals";
import { TicketDetailPage } from "../../../sales/ticket/_shared/ticket-detail-page";
import { PurchaseHistoryDialog } from "./purchase-history-dialog";
import { PurchaseLineEditDialog } from "./purchase-line-edit-dialog";
import { PurchaseItemsTable } from "./purchase-items-table";
import { PurchaseSummaryCard } from "./purchase-summary-card";

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
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");
  const perms = useResourcePermissions("order", "order_purchase");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [detail, setDetail] = useState<PurchaseDetail | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<TicketHistoryEntry[]>([]);
  const [reasonMode, setReasonMode] = useState<"revision" | "cancel" | null>(null);
  const [reason, setReason] = useState("");
  const [editTarget, setEditTarget] = useState<PurchaseItemDetail | null>(null);
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
      // Default the amount to what is still outstanding on the order.
      const paid = res.payments.reduce((sum, p) => sum + p.total_price, 0);
      setAmount(String(roundMoney(Math.max(0, res.total_grand_price - paid))));
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

  const paidTotal = useMemo(
    () => (detail?.payments ?? []).reduce((sum, p) => sum + p.total_price, 0),
    [detail]
  );

  const openHistory = async () => {
    setHistoryOpen(true);
    try {
      const res = await fetchPurchaseHistory(locale, purchaseId);
      setHistory(res.items);
    } catch {
      toast.error(tError("loadFailed"));
    }
  };

  // v1 shows where to transfer once an account is chosen: number, holder name and branch.
  useEffect(() => {
    const id = Number(bankId);
    if (!Number.isFinite(id) || id <= 0 || !detail?.supplier_user_id) {
      setBankDetail(null);
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

  const supplierExtra = detail?.supplier_user_id
    ? { supplier_user_id: String(detail.supplier_user_id) }
    : undefined;

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
      router.push("/admin/order/purchase");
    } catch (e) {
      toast.error(
        e instanceof OrderPurchaseApiError ? e.message : tError("saveFailed")
      );
    } finally {
      setSubmitting(false);
    }
  };

  /** Remove a mis-keyed payment; the PO keeps its status, matching v1's slip delete. */
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

  /** The payment rows only carry a file id, so open the slip through the file endpoint. */
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
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!detail) {
    return <p className="text-muted-foreground">{tDetail("notFound")}</p>;
  }

  const locked = detail.status !== "paying";
  const outstanding = roundMoney(
    Math.max(0, detail.total_grand_price - paidTotal)
  );

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <CrudPageHeader
        title={tPay("dialogTitle")}
        description={detail.sku?.trim() || detail.sku_draft?.trim() || ""}
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => void openHistory()}>
              <History className="text-current" aria-hidden />
              {tDetail("openHistory")}
            </Button>
            {locked ? null : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={submitting}
                  onClick={() => {
                    setReason("");
                    setReasonMode("revision");
                  }}
                >
                  {tApprove("requestRevision")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-warehouse-error-border text-warehouse-error-fg hover:bg-warehouse-error-bg"
                  disabled={submitting}
                  onClick={() => {
                    setReason("");
                    setReasonMode("cancel");
                  }}
                >
                  {tApprove("cancelOrderShort")}
                </Button>
              </>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/order/purchase")}
            >
              {tCrud("btn.back")}
            </Button>
          </>
        }
      />

      <Tabs defaultValue="po" className="w-full min-w-0">
        <TabsList variant="line" className="mb-2">
          <TabsTrigger value="po">{tApprove("tabPoDetail")}</TabsTrigger>
          {detail.purchase_request_id ? (
            <TabsTrigger value="request">
              {tApprove("tabRequestDetail")}
            </TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="po" className="flex flex-col gap-4">
      <PurchaseSummaryCard detail={detail} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-2">
          <h2 className="text-base font-semibold">
            {tDetail("itemsHeading", { count: detail.items.length })}
          </h2>
          <PurchaseItemsTable
            items={detail.items}
            actionsHeader={tCrud("table.actions")}
            renderActions={(item) =>
              locked || item.status !== "approved" ? (
                <span className="text-muted-foreground">
                  {tPage(`itemStatus.${item.status}`)}
                </span>
              ) : (
                <ButtonIcon
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={submitting}
                  aria-label={tApprove("ariaEditItem")}
                  onClick={() => setEditTarget(item)}
                >
                  <Pencil className="text-current" />
                </ButtonIcon>
              )
            }
          />
        </div>

        <Card className="shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{tPay("dialogTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
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
              disabled={locked}
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
              placeholder={tPay("selectBank")}
              emptyLabel={tError("noData")}
              inputClassName="w-full"
              disabled={locked || !detail.supplier_user_id}
              showClear
              onLoadOptions={(ctx) =>
                loadPurchaseFilterOptions("supplier_banks", ctx, supplierExtra)
              }
              resolveSelectedLabel={(v) =>
                resolvePurchaseFilterLabel("supplier_banks", v, supplierExtra)
              }
            />

            {bankDetail ? (
              <div className="space-y-1 rounded-md border bg-muted/40 p-3 text-sm">
                {bankDetail.sku?.trim() ? (
                  <div>
                    <span className="text-muted-foreground">
                      {tPay("accountNumber")}
                    </span>{" "}
                    <span className="font-medium tabular-nums">
                      {bankDetail.sku}
                    </span>
                  </div>
                ) : null}
                {bankDetail.account_name?.trim() ? (
                  <div>
                    <span className="text-muted-foreground">
                      {tPay("accountName")}
                    </span>{" "}
                    <span className="font-medium">{bankDetail.account_name}</span>
                  </div>
                ) : null}
                {bankDetail.branch?.trim() ? (
                  <div>
                    <span className="text-muted-foreground">{tPay("branch")}</span>{" "}
                    <span className="font-medium">{bankDetail.branch}</span>
                  </div>
                ) : null}
                <p className="pt-1 text-xs text-muted-foreground">
                  {tPay("bankAfterTransferHint")}
                </p>
              </div>
            ) : null}

            <div className="grid gap-1">
              <Label htmlFor="purchase-payment-amount">{tPay("totalPrice")}</Label>
              <Input
                id="purchase-payment-amount"
                inputMode="decimal"
                className="tabular-nums"
                disabled={locked}
                value={amount}
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
                  disabled={locked}
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
                  disabled={locked}
                  value={creditTerm}
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
              disabled={locked}
            />

            <div className="grid gap-1">
              <Label htmlFor="purchase-payment-note">{tPay("paymentNoteOptionalHeading")}</Label>
              <Textarea
                id="purchase-payment-note"
                rows={2}
                disabled={locked}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {locked ? (
              <p className="text-sm text-muted-foreground">
                {tPay("lockedHint", { status: tPage(`status.${detail.status}`) })}
              </p>
            ) : (
              <Button
                type="button"
                className="w-full"
                disabled={submitting}
                onClick={() => void submitPayment()}
              >
                {tPay("confirmPayment")}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

        </TabsContent>

        {detail.purchase_request_id ? (
          <TabsContent value="request">
            <TicketDetailPage ticketId={detail.purchase_request_id} embedded />
          </TabsContent>
        ) : null}
      </Tabs>

      <div className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">{tPay("paymentsHeading")}</h2>
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
                <TableHead className="text-center">{tPay("colCreditTerm")}</TableHead>
                <TableHead className="text-center">{tPay("colProof")}</TableHead>
                <TableHead className="text-center">{tPay("colCreatedBy")}</TableHead>
                <TableHead className="text-center">{tCrud("table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.payments.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-8 text-center text-muted-foreground"
                  >
                    {tPay("emptyPayments")}
                  </TableCell>
                </TableRow>
              ) : (
                detail.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {payment.payment_method_name?.trim() ||
                        tDetail("emptyCell")}
                    </TableCell>
                    <TableCell>
                      {payment.supplier_bank_name?.trim() || tDetail("emptyCell")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(payment.total_price, locale)}
                    </TableCell>
                    <TableCell className="text-center">
                      {payment.paid_at
                        ? formatDateTime(payment.paid_at, locale)
                        : tDetail("emptyCell")}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {payment.credit_term != null
                        ? tPay("creditDays", { days: payment.credit_term })
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
                            void openProof(payment.system_file_id as number)
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
                      {payment.created_by_name?.trim() || tDetail("emptyCell")}
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
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

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

      <PurchaseLineEditDialog
        purchaseId={purchaseId}
        item={editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        onSaved={() => void load()}
      />

      <PurchaseHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        entries={history}
      />
    </div>
  );
}
