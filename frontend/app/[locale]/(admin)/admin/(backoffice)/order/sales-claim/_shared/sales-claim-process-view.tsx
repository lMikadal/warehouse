"use client";

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Pencil,
  X,
  XCircle,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
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
import { formatDateTime, type DisplayLocale } from "@/lib/format-datetime";
import {
  OrderSalesClaimApiError,
  patchSalesClaimItem,
  patchSalesClaimStatus,
  type SalesClaimDetail,
  type SalesClaimItemDetail,
} from "@/lib/order-sales-claim-api";
import type { StoreClaimStatus } from "@/lib/order-store-claim-api";
import { cn } from "@/lib/utils";

import { storeClaimStatusPillClass } from "../../../sales/store-claim-list/_shared/store-claim-status-styles";
import {
  SALES_CLAIM_STEPS,
  salesClaimActions,
  salesClaimReviewOpen,
  salesClaimTimeline,
} from "../_lib/sales-claim-workflow";

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

export type SalesClaimProcessViewProps = {
  detail: SalesClaimDetail;
  /** The detail route shows the same screen with every control taken away. */
  readOnly?: boolean;
  onMutated: () => void;
};

/**
 * Purchasing's view of a claim the shop filed: the document on the left, the note, the timeline and
 * the workflow buttons on the right — the same split Phase 5 uses for supplier claims.
 */
export function SalesClaimProcessView({
  detail,
  readOnly = false,
  onMutated,
}: SalesClaimProcessViewProps) {
  const locale = useLocale() as DisplayLocale;
  const t = useTranslations("page.orderSalesClaim");
  const tCrud = useTranslations("crud");

  const [reviewTarget, setReviewTarget] = useState<{
    item: SalesClaimItemDetail;
    approve: boolean;
  } | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [statusTarget, setStatusTarget] = useState<StoreClaimStatus | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);

  const timeline = salesClaimTimeline(detail.status);
  const actions = salesClaimActions(detail.status, detail.items);
  const reviewOpen = !readOnly && salesClaimReviewOpen(detail.status);

  const submitReview = async () => {
    if (!reviewTarget) return;
    if (!reviewNote.trim()) {
      toast.error(t("reviewNoteRequired"));
      return;
    }
    setSubmitting(true);
    try {
      await patchSalesClaimItem(locale, detail.id, reviewTarget.item.id, {
        status: reviewTarget.approve ? "success" : "rejected",
        note: reviewNote.trim(),
      });
      toast.success(t("reviewSaved"));
      setReviewTarget(null);
      setReviewNote("");
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

  const notes = detail.items.filter((it) => it.note.trim());

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

              <div className="mt-4 grid gap-4 border-t pt-4 text-sm sm:grid-cols-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground text-xs">
                    {t("customerLabel")}
                  </span>
                  <span className="font-medium">
                    {detail.member_name?.trim() || t("emptyCell")}
                  </span>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {detail.member_tel?.trim() || t("emptyCell")}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground text-xs">
                    {t("receiptLabel")}
                  </span>
                  <span className="font-medium tabular-nums">
                    {detail.payment_sku?.trim() || t("emptyCell")}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {`${t("orderLabel")}: ${detail.order_sku?.trim() || t("emptyCell")}`}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {`${t("requesterLabel")}: ${
                      detail.created_by_name?.trim() || t("emptyCell")
                    }`}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 sm:text-right">
                  <span className="text-muted-foreground text-xs">
                    {t("refundMethodLabel")}
                  </span>
                  <span className="font-medium">
                    {t(`paymentType.${detail.payment_type}`)}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {t("refundAmountLabel")}
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
                      <TableHead>{t("colReason")}</TableHead>
                      <TableHead className="text-right">
                        {t("colPricePerUnit")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("colPaidTotal")}
                      </TableHead>
                      <TableHead className="text-center">
                        {t("colReview")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="truncate font-medium">
                              {item.detail?.trim() || t("emptyCell")}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {t(`type.${item.type}`)}
                            </span>
                          </span>
                        </TableCell>
                        <TableCell className="text-center tabular-nums">
                          {`${item.amount.toLocaleString()} / ${item.paid_amount.toLocaleString()}`}
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
                            {item.note.trim() ? (
                              <span className="text-muted-foreground text-xs">
                                {item.note}
                              </span>
                            ) : null}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {money(item.price_per_unit, locale)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {money(item.paid_total_price, locale)}
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
                          ) : reviewOpen ? (
                            <span className="flex items-center justify-center gap-1">
                              <ButtonIcon
                                tone="add"
                                aria-label={t("ariaApprove")}
                                disabled={submitting}
                                onClick={() => {
                                  setReviewNote(item.note);
                                  setReviewTarget({ item, approve: true });
                                }}
                              >
                                <Check className="size-4" />
                              </ButtonIcon>
                              <ButtonIcon
                                tone="delete"
                                aria-label={t("ariaReject")}
                                disabled={submitting}
                                onClick={() => {
                                  setReviewNote(item.note);
                                  setReviewTarget({ item, approve: false });
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
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle className="mx-2 w-1.5" />
        <ResizablePanel defaultSize={32} minSize={22} className="min-w-0">
          <div className="flex h-full flex-col gap-4 overflow-y-auto pl-1">
            <div className="rounded-xl border bg-card p-5">
              <div className="mb-2 flex items-center gap-2">
                <Pencil
                  className="text-muted-foreground size-4 shrink-0"
                  aria-hidden
                />
                <h2 className="text-base font-semibold">{t("noteTitle")}</h2>
              </div>
              {notes.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {t("emptyCell")}
                </p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {notes.map((item) => (
                    <li key={item.id} className="flex flex-col gap-0.5">
                      <span className="text-muted-foreground text-xs">
                        {item.detail?.trim() || t("emptyCell")}
                      </span>
                      <span className="whitespace-pre-line">{item.note}</span>
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
                        onClick={() => setStatusTarget(action.status)}
                      >
                        {t(ACTION_LABEL[action.status])}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <Dialog
        open={reviewTarget != null}
        onOpenChange={(open) => {
          if (!open) setReviewTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("reviewModalTitle")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="sales-claim-review-note">
              {t("reviewNoteLabel")}
            </Label>
            <Textarea
              id="sales-claim-review-note"
              rows={5}
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder={t("reviewNotePlaceholder")}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setReviewTarget(null)}
              disabled={submitting}
            >
              {tCrud("btn.cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => void submitReview()}
              disabled={submitting || !reviewNote.trim()}
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
