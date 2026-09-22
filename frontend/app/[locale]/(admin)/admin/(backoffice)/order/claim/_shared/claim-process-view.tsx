"use client";

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Pencil,
  RotateCcw,
  ShoppingCart,
  X,
  XCircle,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
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
import { type DisplayLocale, formatDateTime } from "@/lib/format-datetime";
import {
  CLAIM_WRITE_OFF,
  OrderClaimApiError,
  updateClaim,
  type ClaimDetail,
  type ClaimListItem,
} from "@/lib/order-claim-api";
import { cn } from "@/lib/utils";

import { claimNetIncVat, claimStatusPillClass } from "./claim-status-styles";

const TIMELINE_STEPS = [
  "createDoc",
  "sendToPartner",
  "waitPartnerReview",
  "partnerReply",
  "confirmAll",
  "close",
] as const;

function money(n: number, locale: string): string {
  return n.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * v1's timeline: filing is always done, sending is what a waiting line is about to do, and once the
 * line has moved on the desk is waiting on the supplier. A settled or dead line lights everything.
 */
function timelineState(status: ClaimListItem["status"]): {
  done: number;
  current: number;
} {
  if (status === "completed" || status === "cancelled") {
    return { done: TIMELINE_STEPS.length, current: -1 };
  }
  if (status === "pending") return { done: 1, current: 1 };
  return { done: 2, current: 2 };
}

export type ClaimProcessViewProps = {
  detail: ClaimDetail;
  /** Read-only on the detail route; the edit route lets the desk record the supplier's answer. */
  readOnly?: boolean;
  onMutated: () => void;
};

/**
 * The claim/return process screen: the document on the left, the note and the timeline on the right.
 * v1 split its labels by `type_reject`, so a return reads "return" everywhere a claim reads "claim".
 */
export function ClaimProcessView({
  detail,
  readOnly = false,
  onMutated,
}: ClaimProcessViewProps) {
  const locale = useLocale() as DisplayLocale;
  const t = useTranslations("page.orderClaim.edit.process");
  const tClaim = useTranslations("page.orderClaim");
  const tEdit = useTranslations("page.orderClaim.edit");
  const tCrud = useTranslations("crud");

  const [reviewTarget, setReviewTarget] = useState<{
    row: ClaimListItem;
    approve: boolean;
  } | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const isReturn = detail.resolution === "return";
  const steps = isReturn ? "stepsReturn" : "stepsClaim";
  const timeline = timelineState(detail.status);

  // The document covers this line plus every sibling the desk is chasing under the same outcome.
  const rows = useMemo(
    () => [
      detail as ClaimListItem,
      ...detail.siblings.filter((s) => s.resolution === detail.resolution),
    ],
    [detail]
  );

  const itemById = useMemo(() => {
    const map = new Map<number, NonNullable<ClaimDetail["item"]>>();
    for (const item of detail.order?.items ?? []) map.set(item.id, item);
    return map;
  }, [detail.order]);

  const totals = useMemo(
    () => ({
      qty: rows.reduce((sum, r) => sum + r.qty, 0),
      value: rows.reduce((sum, r) => sum + claimNetIncVat(r), 0),
    }),
    [rows]
  );

  const submitReview = async () => {
    if (!reviewTarget) return;
    if (!reviewNote.trim()) {
      toast.error(t("partnerReviewModal.noteRequired"));
      return;
    }
    setSubmitting(true);
    try {
      await updateClaim(locale, reviewTarget.row.id, {
        status: reviewTarget.approve ? "completed" : "cancelled",
        note_process: reviewNote.trim(),
      });
      toast.success(t("reviewSuccess"));
      setReviewTarget(null);
      setReviewNote("");
      onMutated();
    } catch (e) {
      toast.error(
        e instanceof OrderClaimApiError ? e.message : tEdit("updateFailed")
      );
    } finally {
      setSubmitting(false);
    }
  };

  // v1 let a written-off line be picked back up as a claim or a return.
  const reroute = async (row: ClaimListItem, resolution: "claim" | "return") => {
    setSubmitting(true);
    try {
      await updateClaim(locale, row.id, { resolution, status: "pending" });
      toast.success(tEdit("draftSaved"));
      onMutated();
    } catch (e) {
      toast.error(
        e instanceof OrderClaimApiError ? e.message : tEdit("updateFailed")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const copyClaimNumber = async () => {
    const sku = detail.purchase_claim_sku?.trim() || detail.sku.trim();
    if (!sku) return;
    try {
      await navigator.clipboard.writeText(sku);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(tEdit("updateFailed"));
    }
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <ResizablePanelGroup className="min-h-[60vh] w-full">
        <ResizablePanel defaultSize={68} minSize={40} className="min-w-0">
          <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
            <div className="rounded-xl border bg-card p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-semibold tabular-nums">
                  {detail.purchase_claim_sku?.trim() || detail.sku || tClaim("emptyCell")}
                </span>
                <ButtonIcon
                  variant="outline"
                  size="sm"
                  aria-label={t("ariaCopyClaimNumber")}
                  onClick={copyClaimNumber}
                >
                  <Copy className="size-4" />
                </ButtonIcon>
                {copied ? (
                  <span className="text-xs text-muted-foreground">
                    {tCrud("btn.save")}
                  </span>
                ) : null}
                <span className={claimStatusPillClass(detail.status)}>
                  {tClaim(`status.${detail.status}`)}
                </span>
                {detail.purchase_claim_status ? (
                  <span className="text-xs text-muted-foreground">
                    {`${tClaim("claimDocLabel")}: ${tClaim(
                      `claimDocStatus.${detail.purchase_claim_status}`
                    )}`}
                  </span>
                ) : null}
              </div>

              <p className="mt-2 text-xs text-muted-foreground">
                {`${isReturn ? t("metaCreateReturn") : t("metaCreateClaim")} ${formatDateTime(
                  detail.created_at,
                  locale
                )}`}
              </p>

              <div className="mt-4 grid gap-4 border-t pt-4 text-sm sm:grid-cols-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">
                    {t("vendorLabel")}
                  </span>
                  <span className="font-medium">
                    {detail.supplier_name?.trim() || tClaim("emptyCell")}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">
                    {t("refPoLabel")}
                  </span>
                  <span className="font-medium tabular-nums">
                    {detail.purchase_order_sku?.trim() || tClaim("emptyCell")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {`${t("orderDateLabel")}: ${
                      detail.order
                        ? formatDateTime(detail.order.created_at, locale)
                        : tClaim("emptyCell")
                    }`}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 sm:text-right">
                  <span className="text-xs text-muted-foreground">
                    {isReturn ? t("quantityReturnLabel") : t("quantityClaimLabel")}
                  </span>
                  <span className="font-medium tabular-nums">
                    {totals.qty.toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {isReturn ? t("valueReturnLabel") : t("valueClaimLabel")}
                  </span>
                  <span className="font-bold tabular-nums">
                    {money(totals.value, locale)} {tClaim("currencySuffix")}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-5">
              <h2 className="mb-3 text-base font-semibold">
                {isReturn ? t("itemsTitleReturn") : t("itemsTitleClaim")}
              </h2>
              <div className="rounded-md border bg-background">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">{t("colItem")}</TableHead>
                      <TableHead className="text-center">{t("colQty")}</TableHead>
                      <TableHead className="text-center">{t("colUnit")}</TableHead>
                      <TableHead className="text-right tabular-nums">
                        {t("colUnitPrice")}
                      </TableHead>
                      <TableHead className="text-right tabular-nums">
                        {t("colDiscount")}
                      </TableHead>
                      <TableHead className="text-right tabular-nums">
                        {t("colTotal")}
                      </TableHead>
                      <TableHead>{t("colIssue")}</TableHead>
                      <TableHead className="text-center">
                        {t("colPartnerReview")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => {
                      const item = itemById.get(row.purchase_order_item_id);
                      const settled =
                        row.status === "completed" || row.status === "cancelled";
                      const writtenOff = row.resolution === CLAIM_WRITE_OFF;
                      return (
                        <TableRow key={row.id}>
                          <TableCell>
                            <span className="flex min-w-0 flex-col gap-0.5">
                              <span className="truncate font-medium">
                                {row.product_item_name?.trim() ||
                                  item?.name?.trim() ||
                                  tClaim("emptyCell")}
                              </span>
                              {row.product_item_sku?.trim() ? (
                                <span className="text-xs tabular-nums text-muted-foreground">
                                  {row.product_item_sku}
                                </span>
                              ) : null}
                            </span>
                          </TableCell>
                          <TableCell className="text-center tabular-nums">
                            {row.qty.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center">
                            {tClaim(`unit.${row.unit}`)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {money(row.price * (1 + row.vat_rate / 100), locale)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {money(item?.discount ?? 0, locale)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {money(claimNetIncVat(row), locale)}
                          </TableCell>
                          <TableCell>
                            <span className="flex min-w-0 flex-col gap-0.5">
                              <span className="flex items-center gap-1 text-xs font-medium text-warehouse-error-fg">
                                <AlertTriangle
                                  className="size-3.5 shrink-0"
                                  aria-hidden
                                />
                                {tClaim(`issue.${row.type}`)}
                              </span>
                              {row.note_resolution.trim() || row.note.trim() ? (
                                <span className="text-xs text-muted-foreground">
                                  {row.note_resolution.trim() || row.note.trim()}
                                </span>
                              ) : null}
                              {row.note_process.trim() ? (
                                <span className="text-xs text-muted-foreground">
                                  {row.status === "completed"
                                    ? t("partnerApproved", { note: row.note_process })
                                    : t("partnerRejected", {
                                        note: row.note_process,
                                      })}
                                </span>
                              ) : null}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {writtenOff && row.status === "cancelled" && !readOnly ? (
                              <span className="flex items-center justify-center gap-1">
                                <ButtonIcon
                                  aria-label={t("rerouteClaim")}
                                  disabled={submitting}
                                  onClick={() => void reroute(row, "claim")}
                                >
                                  <ShoppingCart className="size-4" />
                                </ButtonIcon>
                                <ButtonIcon
                                  aria-label={t("rerouteReturn")}
                                  disabled={submitting}
                                  onClick={() => void reroute(row, "return")}
                                >
                                  <RotateCcw className="size-4" />
                                </ButtonIcon>
                              </span>
                            ) : settled ? (
                              row.status === "completed" ? (
                                <CheckCircle2
                                  className="mx-auto size-5 text-warehouse-success-fg"
                                  aria-label={tClaim("status.completed")}
                                />
                              ) : (
                                <XCircle
                                  className="mx-auto size-5 text-warehouse-error-fg"
                                  aria-label={tClaim("status.cancelled")}
                                />
                              )
                            ) : row.status === "in_progress" && !readOnly ? (
                              <span className="flex items-center justify-center gap-1">
                                <ButtonIcon
                                  tone="add"
                                  aria-label={t("approveAria")}
                                  disabled={submitting}
                                  onClick={() => {
                                    setReviewNote("");
                                    setReviewTarget({ row, approve: true });
                                  }}
                                >
                                  <Check className="size-4" />
                                </ButtonIcon>
                                <ButtonIcon
                                  tone="delete"
                                  aria-label={t("rejectAria")}
                                  disabled={submitting}
                                  onClick={() => {
                                    setReviewNote("");
                                    setReviewTarget({ row, approve: false });
                                  }}
                                >
                                  <X className="size-4" />
                                </ButtonIcon>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                {tClaim("emptyCell")}
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
            <div className="rounded-xl border bg-card p-5">
              <div className="mb-2 flex items-center gap-2">
                <Pencil className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <h2 className="text-base font-semibold">{t("noteLabel")}</h2>
              </div>
              <p className="text-sm whitespace-pre-line text-muted-foreground">
                {detail.note_process.trim() ||
                  detail.note_resolution.trim() ||
                  detail.note.trim() ||
                  tClaim("emptyCell")}
              </p>
            </div>

            <div className="rounded-xl border bg-card p-5">
              <h2 className="mb-4 text-base font-semibold">{t("timelineTitle")}</h2>
              <ol className="flex flex-col gap-3">
                {TIMELINE_STEPS.map((step, index) => {
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
                              : "border-border bg-muted text-muted-foreground"
                        )}
                        aria-hidden
                      >
                        {done ? <Check className="size-3" /> : index + 1}
                      </span>
                      <span
                        className={cn(
                          "text-sm",
                          current ? "font-semibold text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {t(`${steps}.${step}`)}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
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
            <DialogTitle>{t("partnerReviewModal.title")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="claim-review-note">
              {t("partnerReviewModal.noteLabel")}
            </Label>
            <Textarea
              id="claim-review-note"
              rows={5}
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder={t("partnerReviewModal.notePlaceholder")}
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
    </div>
  );
}
