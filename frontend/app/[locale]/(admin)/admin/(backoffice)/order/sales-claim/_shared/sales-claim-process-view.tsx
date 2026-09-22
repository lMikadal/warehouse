"use client";

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Pencil,
  UserPlus,
  X,
  XCircle,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ButtonIcon } from "@/components/ui/button-icon";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "@/i18n/navigation";
import { formatDate, formatDateTime, type DisplayLocale } from "@/lib/format-datetime";
import {
  OrderSalesClaimApiError,
  patchSalesClaim,
  patchSalesClaimItem,
  patchSalesClaimStatus,
  type SalesClaimDetail,
  type SalesClaimItemDetail,
  type SalesClaimSupplierOption,
} from "@/lib/order-sales-claim-api";
import { fetchOrderSalesFormItemsByIds } from "@/lib/order-sales-form-api";
import type { StoreClaimStatus } from "@/lib/order-store-claim-api";
import { cn } from "@/lib/utils";

import { storeClaimStatusPillClass } from "../../../sales/store-claim-list/_shared/store-claim-status-styles";
import {
  SALES_CLAIM_STEPS,
  salesClaimActions,
  salesClaimTimeline,
} from "../_lib/sales-claim-workflow";
import { SalesClaimSupplierDialog } from "./sales-claim-supplier-dialog";
import { SalesClaimSupplierPanel } from "./sales-claim-supplier-panel";

const ACTION_LABEL: Record<StoreClaimStatus, string> = {
  pending: "actionAcknowledge",
  acknowledged: "actionAcknowledge",
  waiting_supplier: "actionWaitingSupplier",
  success: "actionSuccess",
  cancelled: "actionCancel",
  rejected: "actionReject",
};

function money(n: number, locale: string): string {
  return n.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** SKU + brand for the product column, pulled from the catalog on top of the claim's own rows. */
type ProductMeta = { sku: string; brand: string };

export type SalesClaimProcessViewProps = {
  detail: SalesClaimDetail;
  /** The detail route shows the same screen with every control taken away. */
  readOnly?: boolean;
  onMutated: () => void;
};

/**
 * Purchasing's view of a claim the shop filed: the document on the left, and on the right either the
 * supplier document being assembled (before it is sent) or the note / timeline / workflow buttons.
 */
export function SalesClaimProcessView({
  detail,
  readOnly = false,
  onMutated,
}: SalesClaimProcessViewProps) {
  const locale = useLocale() as DisplayLocale;
  const router = useRouter();
  const t = useTranslations("page.orderSalesClaim");
  const tCrud = useTranslations("crud");

  const beforeSend =
    detail.status === "pending" || detail.status === "acknowledged";
  const afterSend = detail.status === "waiting_supplier";
  const hasSupplier = detail.supplier_user_id != null;

  // Line verdict dialog covers both the pre-send reject (mock 5) and the post-send response (mock 8).
  const [lineTarget, setLineTarget] = useState<{
    item: SalesClaimItemDetail;
    verdict: "success" | "rejected";
    reject: boolean;
  } | null>(null);
  const [lineNote, setLineNote] = useState("");
  const [statusTarget, setStatusTarget] = useState<StoreClaimStatus | null>(
    null,
  );
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  /** The note carried into the confirm-send dialog, from the panel or the saved value. */
  const [pendingSendNote, setPendingSendNote] = useState(detail.note_supplier);
  const [productMeta, setProductMeta] = useState<Record<number, ProductMeta>>(
    {},
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const ids = detail.items
      .map((it) => it.product_item_id)
      .filter((id): id is number => typeof id === "number" && id > 0);
    if (ids.length === 0) return;
    let cancelled = false;
    void (async () => {
      try {
        const rows = await fetchOrderSalesFormItemsByIds(
          locale,
          "sales-claims",
          ids,
        );
        if (cancelled) return;
        const map: Record<number, ProductMeta> = {};
        for (const row of rows) {
          map[row.id] = { sku: row.sku, brand: row.brand_name };
        }
        setProductMeta(map);
      } catch {
        // The catalog lookup only enriches the row; the claim still renders without it.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detail.items, locale]);

  const timeline = salesClaimTimeline(detail.status, detail.items);
  const actions = salesClaimActions(detail.status, detail.items);

  const submitLine = async () => {
    if (!lineTarget) return;
    if (!lineNote.trim()) {
      toast.error(t("reviewNoteRequired"));
      return;
    }
    setSubmitting(true);
    try {
      await patchSalesClaimItem(locale, detail.id, lineTarget.item.id, {
        status: lineTarget.verdict,
        note: lineNote.trim(),
      });
      toast.success(t("reviewSaved"));
      setLineTarget(null);
      setLineNote("");
      onMutated();
    } catch (e) {
      toast.error(
        e instanceof OrderSalesClaimApiError ? e.message : t("statusFailed"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const submitStatus = async () => {
    if (!statusTarget) return;
    setSubmitting(true);
    try {
      await patchSalesClaimStatus(locale, detail.id, statusTarget);
      toast.success(t("statusSaved"));
      setStatusTarget(null);
      onMutated();
    } catch (e) {
      toast.error(
        e instanceof OrderSalesClaimApiError ? e.message : t("statusFailed"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const assignSupplier = async (supplier: SalesClaimSupplierOption) => {
    setSubmitting(true);
    try {
      await patchSalesClaim(locale, detail.id, { supplier_user_id: supplier.id });
      toast.success(t("supplierAssigned"));
      onMutated();
    } catch (e) {
      toast.error(
        e instanceof OrderSalesClaimApiError ? e.message : t("statusFailed"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const saveDraft = useCallback(
    async (note: string) => {
      setSubmitting(true);
      try {
        await patchSalesClaim(locale, detail.id, { note_supplier: note });
        toast.success(t("draftSaved"));
        onMutated();
      } catch (e) {
        toast.error(
          e instanceof OrderSalesClaimApiError ? e.message : t("statusFailed"),
        );
      } finally {
        setSubmitting(false);
      }
    },
    [locale, detail.id, onMutated, t],
  );

  const confirmSend = async () => {
    setSubmitting(true);
    try {
      await patchSalesClaim(locale, detail.id, {
        note_supplier: pendingSendNote,
      });
      await patchSalesClaimStatus(locale, detail.id, "waiting_supplier");
      toast.success(t("statusSaved"));
      setSendConfirmOpen(false);
      router.push("/admin/order/sales-claim");
    } catch (e) {
      toast.error(
        e instanceof OrderSalesClaimApiError ? e.message : t("statusFailed"),
      );
      setSubmitting(false);
    }
  };

  const claimedQty = detail.items.reduce((sum, it) => sum + it.amount, 0);
  const notes = detail.items.filter((it) => it.note.trim());
  const showSupplierPanel = !readOnly && beforeSend && hasSupplier;

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <ResizablePanelGroup className="min-h-[60vh] w-full">
        <ResizablePanel defaultSize={68} minSize={40} className="min-w-0">
          <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
            <div className="rounded-xl border bg-card p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-semibold tabular-nums">
                  {detail.sku?.trim() || t("emptyCell")}
                </span>
                <span className={storeClaimStatusPillClass(detail.status)}>
                  {t(`status.${detail.status}`)}
                </span>
                <span className="text-muted-foreground text-xs">
                  {t(`type.${detail.type}`)}
                </span>
              </div>

              <p className="text-muted-foreground mt-2 text-xs">
                {`${t("docCreatedAt")} ${formatDateTime(detail.created_at, locale)} · ${t(
                  "docUpdatedAt",
                )} ${formatDateTime(detail.updated_at, locale)}`}
              </p>

              <div className="mt-4 grid gap-4 border-t pt-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground text-xs">
                    {t("supplierLabel")}
                  </span>
                  {hasSupplier ? (
                    <>
                      <span className="font-medium">
                        {detail.supplier_name?.trim() || t("emptyCell")}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {detail.supplier_address?.trim() || t("emptyCell")}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground text-xs">
                      {t("supplierEmptyHint")}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground text-xs">
                    {t("referenceLabel")}
                  </span>
                  <span className="font-medium tabular-nums">
                    {detail.payment_sku?.trim() || t("emptyCell")}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {`${t("orderDateLabel")}: ${
                      detail.order_created_at
                        ? formatDate(detail.order_created_at, locale)
                        : t("emptyCell")
                    }`}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {`${t("deliveryDateLabel")}: ${
                      detail.delivery_at
                        ? formatDate(detail.delivery_at, locale)
                        : t("emptyCell")
                    }`}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground text-xs">
                    {t("claimedQtyLabel")}
                  </span>
                  <span className="font-bold tabular-nums">
                    {claimedQty.toLocaleString()}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 lg:text-right">
                  <span className="text-muted-foreground text-xs">
                    {t("claimedValueLabel")}
                  </span>
                  <span className="font-bold tabular-nums">
                    {money(detail.total_price, locale)} {t("currencySuffix")}
                  </span>
                </div>
              </div>

              {detail.other_reason.trim() ? (
                <div className="mt-4 border-t pt-4">
                  <p className="text-muted-foreground text-xs">
                    {t("otherReasonLabel")}
                  </p>
                  <p className="text-sm whitespace-pre-line">
                    {detail.other_reason}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border bg-card p-5">
              <h2 className="mb-3 text-base font-semibold">
                {t("itemsTitle")}
              </h2>
              <div className="rounded-md border bg-background">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">
                        {t("colProduct")}
                      </TableHead>
                      <TableHead className="text-center">
                        {t("colQty")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("colPricePerUnit")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("colDiscountPerUnit")}
                      </TableHead>
                      <TableHead>{t("colProblem")}</TableHead>
                      <TableHead className="text-center">
                        {t("colSupplierStatus")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.items.map((item) => {
                      const meta = item.product_item_id
                        ? productMeta[item.product_item_id]
                        : undefined;
                      const reviewed =
                        item.status === "success" ||
                        item.status === "rejected";
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <span className="flex min-w-0 flex-col gap-0.5">
                              <span className="truncate font-medium">
                                {item.detail?.trim() || t("emptyCell")}
                              </span>
                              <span className="text-muted-foreground text-xs tabular-nums">
                                {[meta?.sku, meta?.brand]
                                  .filter((v) => v && v.trim())
                                  .join(" · ") || t(`type.${item.type}`)}
                              </span>
                              {reviewed && item.note.trim() ? (
                                <span
                                  className={cn(
                                    "mt-1 flex items-center gap-1 rounded-md border px-2 py-1 text-xs",
                                    item.status === "success"
                                      ? "border-warehouse-success-border bg-warehouse-success-bg text-warehouse-success-fg"
                                      : "border-warehouse-error-border bg-warehouse-error-bg text-warehouse-error-fg",
                                  )}
                                >
                                  {`${t("supplierMessageLabel")}: ${item.note}`}
                                </span>
                              ) : null}
                            </span>
                          </TableCell>
                          <TableCell className="text-center tabular-nums">
                            {item.amount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {money(item.price_per_unit, locale)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {money(item.discount, locale)}
                          </TableCell>
                          <TableCell>
                            <span className="flex min-w-0 flex-col gap-0.5">
                              <span className="text-warehouse-error-fg flex items-center gap-1 text-xs font-medium">
                                <AlertTriangle
                                  className="size-3.5 shrink-0"
                                  aria-hidden
                                />
                                {item.reason_name?.trim() || t("emptyCell")}
                              </span>
                              {item.note.trim() && !reviewed ? (
                                <span className="text-muted-foreground text-xs">
                                  {item.note}
                                </span>
                              ) : null}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {item.status === "success" ? (
                              <CheckCircle2
                                className="text-warehouse-success-fg mx-auto size-5"
                                aria-label={t("reviewSuccess")}
                              />
                            ) : item.status === "rejected" ? (
                              <XCircle
                                className="text-warehouse-error-fg mx-auto size-5"
                                aria-label={t("reviewRejected")}
                              />
                            ) : readOnly ? (
                              <span className="text-muted-foreground text-xs">
                                {t("reviewPending")}
                              </span>
                            ) : beforeSend ? (
                              <span className="flex items-center justify-center gap-1">
                                <ButtonIcon
                                  aria-label={t("ariaAssignSupplier")}
                                  disabled={submitting}
                                  onClick={() => setSupplierDialogOpen(true)}
                                >
                                  <UserPlus className="size-4" />
                                </ButtonIcon>
                                <ButtonIcon
                                  tone="delete"
                                  aria-label={t("ariaReject")}
                                  disabled={submitting}
                                  onClick={() => {
                                    setLineNote(item.note);
                                    setLineTarget({
                                      item,
                                      verdict: "rejected",
                                      reject: true,
                                    });
                                  }}
                                >
                                  <X className="size-4" />
                                </ButtonIcon>
                              </span>
                            ) : afterSend ? (
                              <span className="flex items-center justify-center gap-1">
                                <ButtonIcon
                                  tone="add"
                                  aria-label={t("ariaApprove")}
                                  disabled={submitting}
                                  onClick={() => {
                                    setLineNote(item.note);
                                    setLineTarget({
                                      item,
                                      verdict: "success",
                                      reject: false,
                                    });
                                  }}
                                >
                                  <Check className="size-4" />
                                </ButtonIcon>
                                <ButtonIcon
                                  tone="delete"
                                  aria-label={t("ariaReject")}
                                  disabled={submitting}
                                  onClick={() => {
                                    setLineNote(item.note);
                                    setLineTarget({
                                      item,
                                      verdict: "rejected",
                                      reject: false,
                                    });
                                  }}
                                >
                                  <X className="size-4" />
                                </ButtonIcon>
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">
                                {t("reviewPending")}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle className="mx-2 w-1.5" />
        <ResizablePanel defaultSize={32} minSize={22} className="min-w-0">
          <div className="flex h-full flex-col gap-4 overflow-y-auto pl-1">
            {showSupplierPanel ? (
              <SalesClaimSupplierPanel
                key={detail.updated_at}
                detail={detail}
                supplier={{
                  name: detail.supplier_name ?? "",
                  address: detail.supplier_address,
                  tel: detail.supplier_tel,
                }}
                initialNote={detail.note_supplier}
                submitting={submitting}
                onCancel={() => router.push("/admin/order/sales-claim")}
                onSaveDraft={(note) => void saveDraft(note)}
                onSend={(note) => {
                  setPendingSendNote(note);
                  setSendConfirmOpen(true);
                }}
              />
            ) : (
              <>
                <div className="rounded-xl border bg-card p-5">
                  <div className="mb-2 flex items-center gap-2">
                    <Pencil
                      className="text-muted-foreground size-4 shrink-0"
                      aria-hidden
                    />
                    <h2 className="text-base font-semibold">{t("noteTitle")}</h2>
                  </div>
                  {detail.note_supplier.trim() ? (
                    <p className="mb-3 text-sm whitespace-pre-line">
                      {detail.note_supplier}
                    </p>
                  ) : null}
                  {notes.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      {detail.note_supplier.trim() ? "" : t("emptyCell")}
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-2 text-sm">
                      {notes.map((item) => (
                        <li key={item.id} className="flex flex-col gap-0.5">
                          <span className="text-muted-foreground text-xs">
                            {item.detail?.trim() || t("emptyCell")}
                          </span>
                          <span className="whitespace-pre-line">
                            {item.note}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-xl border bg-card p-5">
                  <h2 className="mb-4 text-base font-semibold">
                    {t("timelineTitle")}
                  </h2>
                  <ol className="flex flex-col gap-3">
                    {SALES_CLAIM_STEPS.map((step, index) => {
                      const done = index < timeline.done;
                      const current = index === timeline.current;
                      return (
                        <li key={step} className="flex items-start gap-3">
                          <span
                            className={cn(
                              "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px]",
                              done
                                ? "border-warehouse-success-border bg-warehouse-success-bg text-warehouse-success-fg"
                                : current
                                  ? "border-primary bg-primary/15 text-primary"
                                  : "border-border bg-muted text-muted-foreground",
                            )}
                            aria-hidden
                          >
                            {done ? <Check className="size-3" /> : index + 1}
                          </span>
                          <span
                            className={cn(
                              "text-sm",
                              current
                                ? "text-foreground font-semibold"
                                : "text-muted-foreground",
                            )}
                          >
                            {t(`steps.${step}`)}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                </div>

                {readOnly ? null : (
                  <div className="rounded-xl border bg-card p-5">
                    <h2 className="mb-3 text-base font-semibold">
                      {t("actionsTitle")}
                    </h2>
                    {actions.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        {t("actionNone")}
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {actions.map((action) => (
                          <Button
                            key={action.status}
                            type="button"
                            variant={
                              action.status === "cancelled" ||
                              action.status === "rejected"
                                ? "outline"
                                : "default"
                            }
                            disabled={submitting || action.blocked}
                            onClick={() => {
                              if (action.status === "waiting_supplier") {
                                setPendingSendNote(detail.note_supplier);
                                setSendConfirmOpen(true);
                              } else {
                                setStatusTarget(action.status);
                              }
                            }}
                          >
                            {t(ACTION_LABEL[action.status])}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <SalesClaimSupplierDialog
        open={supplierDialogOpen}
        onOpenChange={setSupplierDialogOpen}
        onSelect={(supplier) => void assignSupplier(supplier)}
      />

      <Dialog
        open={lineTarget != null}
        onOpenChange={(open) => {
          if (!open) setLineTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {lineTarget?.reject
                ? t("rejectModalTitle")
                : t("supplierReviewModalTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="sales-claim-review-note">
              {t("reviewNoteLabel")}
            </Label>
            <Textarea
              id="sales-claim-review-note"
              rows={5}
              value={lineNote}
              onChange={(e) => setLineNote(e.target.value)}
              placeholder={t("reviewNotePlaceholder")}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLineTarget(null)}
              disabled={submitting}
            >
              {tCrud("btn.cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => void submitLine()}
              disabled={submitting || !lineNote.trim()}
            >
              {tCrud("btn.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={sendConfirmOpen}
        onOpenChange={(open) => {
          if (!open) setSendConfirmOpen(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full border border-warehouse-warning-border bg-warehouse-warning-bg">
              <AlertTriangle
                className="text-warehouse-warning-fg size-6"
                aria-hidden
              />
            </div>
            <DialogTitle className="text-center">
              {t("sendConfirmTitle")}
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-center text-sm">
            {t("sendConfirmBody")}
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSendConfirmOpen(false)}
              disabled={submitting}
            >
              {tCrud("btn.cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => void confirmSend()}
              disabled={submitting}
            >
              {tCrud("btn.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={statusTarget != null}
        onOpenChange={(open) => {
          if (!open) setStatusTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("confirmStatusTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            {t("confirmStatusBody", {
              status: statusTarget ? t(`status.${statusTarget}`) : "",
            })}
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setStatusTarget(null)}
              disabled={submitting}
            >
              {tCrud("btn.cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => void submitStatus()}
              disabled={submitting}
            >
              {tCrud("btn.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
