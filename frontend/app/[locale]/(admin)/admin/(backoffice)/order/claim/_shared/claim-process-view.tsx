"use client";

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  FilePlus2,
  Pencil,
  RotateCcw,
  ShoppingCart,
  X,
  XCircle,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ButtonIcon } from "@/components/ui/button-icon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { type DisplayLocale, formatDateTime } from "@/lib/format-datetime";
import {
  CLAIM_WRITE_OFF,
  OrderClaimApiError,
  updateClaim,
  type ClaimDetail,
  type ClaimListItem,
} from "@/lib/order-claim-api";
import type { ReceiveRejectResolution } from "@/lib/order-receive-api";
import { cn } from "@/lib/utils";

import {
  CLAIM_TIMELINE_STEPS,
  claimActions,
  claimTimeline,
} from "../_lib/claim-workflow";
import { ClaimDocumentPanel } from "./claim-document-panel";
import { claimNetIncVat, claimStatusPillClass } from "./claim-status-styles";
import { ClaimTypePickerDialog } from "./claim-type-picker-dialog";

function money(n: number, locale: string): string {
  return n.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export type ClaimProcessViewProps = {
  detail: ClaimDetail;
  /** Detail route takes controls away; process route keeps them when the actor can update. */
  readOnly?: boolean;
  onMutated: () => void;
};

/**
 * Same layout shell as sales-claim: document + items on the left; right rail swaps between the
 * pending claim/return draft panel and note / timeline / actions after send.
 */
export function ClaimProcessView({
  detail,
  readOnly = false,
  onMutated,
}: ClaimProcessViewProps) {
  const locale = useLocale() as DisplayLocale;
  const router = useRouter();
  const t = useTranslations("page.orderClaim.edit.process");
  const tClaim = useTranslations("page.orderClaim");
  const tEdit = useTranslations("page.orderClaim.edit");
  const tCrud = useTranslations("crud");

  const [panelResolution, setPanelResolution] = useState<"claim" | "return" | null>(
    () =>
      detail.resolution === "return" || detail.resolution === "claim"
        ? detail.resolution
        : null
  );
  const [noteProcess, setNoteProcess] = useState(detail.note_process);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [writeOffOpen, setWriteOffOpen] = useState(false);
  const [returnConfirmOpen, setReturnConfirmOpen] = useState(false);
  const [writeOffReason, setWriteOffReason] = useState("");
  const [reviewTarget, setReviewTarget] = useState<{
    row: ClaimListItem;
    approve: boolean;
  } | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setNoteProcess(detail.note_process);
    setPanelResolution(
      detail.resolution === "return" || detail.resolution === "claim"
        ? detail.resolution
        : null
    );
  }, [detail.id, detail.note_process, detail.resolution, detail.status]);

  const isReturn =
    panelResolution === "return" || detail.resolution === "return";
  const steps = isReturn ? "stepsReturn" : "stepsClaim";
  const timeline = claimTimeline(detail.status);
  const actions = claimActions(detail.status);
  const showDocumentPanel =
    !readOnly && detail.status === "pending" && panelResolution != null;
  const showPickResolution =
    !readOnly && detail.status === "pending" && panelResolution == null;

  const rows = useMemo(
    () => [
      detail as ClaimListItem,
      ...detail.siblings.filter((s) =>
        panelResolution
          ? s.resolution === panelResolution
          : s.resolution === detail.resolution
      ),
    ],
    [detail, panelResolution]
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

  const save = async (
    body: Parameters<typeof updateClaim>[2],
    successMessage: string,
    thenBackToList = false
  ) => {
    setSubmitting(true);
    try {
      await updateClaim(locale, detail.id, body);
      toast.success(successMessage);
      if (thenBackToList) {
        router.push("/admin/order/claim");
        return;
      }
      onMutated();
    } catch (e) {
      toast.error(
        e instanceof OrderClaimApiError ? e.message : tEdit("updateFailed")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const pickResolution = (resolution: ReceiveRejectResolution) => {
    setPickerOpen(false);
    if (resolution === CLAIM_WRITE_OFF) {
      setWriteOffReason(detail.note_resolution ?? "");
      setWriteOffOpen(true);
      return;
    }
    setPanelResolution(resolution === "return" ? "return" : "claim");
  };

  const confirmDocument = () => {
    if (panelResolution === "return") {
      setReturnConfirmOpen(true);
      return;
    }
    void save(
      {
        resolution: panelResolution ?? "claim",
        status: "in_progress",
        note_process: noteProcess,
      },
      tEdit("confirmSuccess")
    );
  };

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
                  {detail.purchase_claim_sku?.trim() ||
                    detail.sku ||
                    tClaim("emptyCell")}
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

              <div className="mt-4 grid gap-4 border-t pt-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
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
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">
                    {isReturn
                      ? t("quantityReturnLabel")
                      : t("quantityClaimLabel")}
                  </span>
                  <span className="font-medium tabular-nums">
                    {totals.qty.toLocaleString()}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 sm:text-right">
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
                      <TableHead className="min-w-[200px]">
                        {t("colItem")}
                      </TableHead>
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
                                    ? t("partnerApproved", {
                                        note: row.note_process,
                                      })
                                    : t("partnerRejected", {
                                        note: row.note_process,
                                      })}
                                </span>
                              ) : null}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {writtenOff &&
                            row.status === "cancelled" &&
                            !readOnly ? (
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
            {showDocumentPanel && panelResolution ? (
              <ClaimDocumentPanel
                key={`${detail.id}-${detail.status}-${panelResolution}-${detail.note_process}`}
                detail={detail}
                resolution={panelResolution}
                noteProcess={noteProcess}
                onNoteProcessChange={setNoteProcess}
                submitting={submitting}
                onCancel={() => setPanelResolution(null)}
                onSaveDraft={() =>
                  void save(
                    { resolution: panelResolution, note_process: noteProcess },
                    tEdit("draftSaved")
                  )
                }
                onConfirm={confirmDocument}
              />
            ) : showPickResolution ? (
              <div className="flex h-full min-h-40 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card p-5 text-center">
                <h2 className="text-base font-semibold">
                  {tEdit("rightPanelTitle")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {tEdit("rightPanelEmpty")}
                </p>
                <Button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  disabled={submitting}
                >
                  <FilePlus2 className="size-4" />
                  {tEdit("typePicker.title")}
                </Button>
              </div>
            ) : (
              <>
                <div className="rounded-xl border bg-card p-5">
                  <div className="mb-2 flex items-center gap-2">
                    <Pencil
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
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
                  <h2 className="mb-4 text-base font-semibold">
                    {t("timelineTitle")}
                  </h2>
                  <ol className="flex flex-col gap-3">
                    {CLAIM_TIMELINE_STEPS.map((step, index) => {
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
                              current
                                ? "font-semibold text-foreground"
                                : "text-muted-foreground"
                            )}
                          >
                            {t(`${steps}.${step}`)}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                </div>

                {readOnly || actions.length === 0 ? null : (
                  <div className="rounded-xl border bg-card p-5">
                    <h2 className="mb-3 text-base font-semibold">
                      {t("actionsTitle")}
                    </h2>
                    <div className="flex flex-col gap-2">
                      {actions.map((action) => (
                        <Button
                          key={action.status}
                          type="button"
                          variant="outline"
                          disabled={submitting}
                          onClick={() => {
                            if (action.status === "cancelled") {
                              setWriteOffReason(detail.note_resolution ?? "");
                              setWriteOffOpen(true);
                            }
                          }}
                        >
                          {t("actionCancel")}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <ClaimTypePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        activeResolution={
          detail.resolution === CLAIM_WRITE_OFF ? null : detail.resolution
        }
        onSelect={pickResolution}
      />

      <Dialog open={writeOffOpen} onOpenChange={setWriteOffOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tEdit("rejectModal.title")}</DialogTitle>
            <DialogDescription>{tEdit("rejectModal.subtitle")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="claim-write-off-reason">
              {tEdit("rejectModal.reasonLabel")}
            </Label>
            <Textarea
              id="claim-write-off-reason"
              rows={4}
              value={writeOffReason}
              onChange={(e) => setWriteOffReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setWriteOffOpen(false)}
              disabled={submitting}
            >
              {tCrud("btn.cancel")}
            </Button>
            <Button
              type="button"
              disabled={submitting}
              onClick={() => {
                if (!writeOffReason.trim()) {
                  toast.error(tEdit("rejectReasonRequired"));
                  return;
                }
                setWriteOffOpen(false);
                void save(
                  {
                    resolution: CLAIM_WRITE_OFF,
                    status: "cancelled",
                    note_resolution: writeOffReason.trim(),
                  },
                  tEdit("rejectSuccess"),
                  true
                );
              }}
            >
              {tCrud("btn.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={returnConfirmOpen} onOpenChange={setReturnConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex flex-col items-center gap-3 text-center">
              <span
                className="flex size-12 items-center justify-center rounded-full bg-warehouse-warning-bg text-warehouse-warning-fg"
                aria-hidden
              >
                <AlertTriangle className="size-6" />
              </span>
              <DialogTitle>{tEdit("returnConfirmModal.title")}</DialogTitle>
              <DialogDescription>
                {tEdit("returnConfirmModal.subtitle")}
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setReturnConfirmOpen(false)}
              disabled={submitting}
            >
              {tCrud("btn.cancel")}
            </Button>
            <Button
              type="button"
              disabled={submitting}
              onClick={() => {
                setReturnConfirmOpen(false);
                void save(
                  {
                    resolution: "return",
                    status: "in_progress",
                    note_process: noteProcess,
                  },
                  tEdit("confirmSuccess")
                );
              }}
            >
              {tCrud("btn.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
