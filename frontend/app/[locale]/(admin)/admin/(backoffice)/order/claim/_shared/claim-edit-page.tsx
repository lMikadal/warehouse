"use client";

import { AlertTriangle, History, Package } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { CrudPageHeader } from "@/components/molecules/crud-page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "@/i18n/navigation";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import { type DisplayLocale, formatDateTime } from "@/lib/format-datetime";
import {
  CLAIM_WRITE_OFF,
  fetchClaimDetail,
  fetchClaimHistory,
  OrderClaimApiError,
  updateClaim,
  type ClaimDetail,
} from "@/lib/order-claim-api";
import type { ReceiveRejectResolution } from "@/lib/order-receive-api";
import type { TicketHistoryEntry } from "@/lib/order-ticket-api";

import { PurchaseHistoryDialog } from "../../purchase/_shared/purchase-history-dialog";
import { ClaimDocumentPanel } from "./claim-document-panel";
import { ClaimProcessView } from "./claim-process-view";
import { claimNetIncVat, claimStatusPillClass } from "./claim-status-styles";
import { ClaimTypePickerDialog } from "./claim-type-picker-dialog";

function money(n: number, locale: string): string {
  return n.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function ClaimEditPage({ claimId }: { claimId: number }) {
  const locale = useLocale() as DisplayLocale;
  const router = useRouter();
  const t = useTranslations("page.orderClaim.edit");
  const tClaim = useTranslations("page.orderClaim");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");
  const perms = useResourcePermissions("order", "order_claim");

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ClaimDetail | null>(null);
  const [panelResolution, setPanelResolution] = useState<"claim" | "return" | null>(
    null
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [writeOffOpen, setWriteOffOpen] = useState(false);
  const [returnConfirmOpen, setReturnConfirmOpen] = useState(false);
  const [writeOffReason, setWriteOffReason] = useState("");
  const [noteProcess, setNoteProcess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<TicketHistoryEntry[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchClaimDetail(claimId);
      setDetail(next);
      setNoteProcess(next.note_process);
      // A line already on its way to the supplier opens straight into the process screen, as in v1.
      setPanelResolution(
        next.resolution !== CLAIM_WRITE_OFF && next.status !== "pending"
          ? next.resolution === "return"
            ? "return"
            : "claim"
          : null
      );
    } catch (e) {
      toast.error(e instanceof OrderClaimApiError ? e.message : t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [claimId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const openHistory = async () => {
    setHistoryOpen(true);
    try {
      const res = await fetchClaimHistory(locale, claimId);
      setHistory(res.items);
    } catch {
      toast.error(tClaim("historyLoadError"));
    }
  };

  const save = async (
    body: Parameters<typeof updateClaim>[2],
    successMessage: string,
    thenBackToList = false
  ) => {
    setSubmitting(true);
    try {
      await updateClaim(locale, claimId, body);
      toast.success(successMessage);
      if (thenBackToList) {
        router.push("/admin/order/claim");
        return;
      }
      await load();
    } catch (e) {
      toast.error(e instanceof OrderClaimApiError ? e.message : t("updateFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const pickResolution = (resolution: ReceiveRejectResolution) => {
    setPickerOpen(false);
    if (resolution === CLAIM_WRITE_OFF) {
      setWriteOffReason(detail?.note_resolution ?? "");
      setWriteOffOpen(true);
      return;
    }
    setPanelResolution(resolution === "return" ? "return" : "claim");
  };

  const confirmDocument = () => {
    // v1 asked once more before a return, because that one leaves the building.
    if (panelResolution === "return") {
      setReturnConfirmOpen(true);
      return;
    }
    void save(
      { resolution: panelResolution ?? "claim", status: "in_progress", note_process: noteProcess },
      t("confirmSuccess")
    );
  };

  if (!perms.view) {
    return <p className="text-muted-foreground">{tError("forbidden")}</p>;
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!detail) {
    return <p className="text-muted-foreground">{t("notFound")}</p>;
  }

  const header = (
    <CrudPageHeader
      title={`${tClaim("colClaimNumber")} ${detail.sku || tClaim("emptyCell")}`}
      actions={
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={openHistory}>
            <History className="size-4" />
            {tClaim("historyModalTitle")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/order/claim")}
          >
            {t("backToList")}
          </Button>
        </div>
      }
    />
  );

  const dialogs = (
    <>
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
            <DialogTitle>{t("rejectModal.title")}</DialogTitle>
            <DialogDescription>{t("rejectModal.subtitle")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="claim-write-off-reason">
              {t("rejectModal.reasonLabel")}
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
                  toast.error(t("rejectReasonRequired"));
                  return;
                }
                setWriteOffOpen(false);
                void save(
                  {
                    resolution: CLAIM_WRITE_OFF,
                    status: "cancelled",
                    note_resolution: writeOffReason.trim(),
                  },
                  t("rejectSuccess"),
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
              <DialogTitle>{t("returnConfirmModal.title")}</DialogTitle>
              <DialogDescription>{t("returnConfirmModal.subtitle")}</DialogDescription>
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
                  t("confirmSuccess")
                );
              }}
            >
              {tCrud("btn.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PurchaseHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        entries={history}
      />
    </>
  );

  // Once the line is with the supplier there is nothing left to assemble — show the process screen.
  if (panelResolution && detail.status !== "pending") {
    return (
      <div className="flex w-full min-w-0 flex-col gap-4">
        {header}
        <ClaimProcessView
          detail={detail}
          readOnly={!perms.update}
          onMutated={() => void load()}
        />
        {dialogs}
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      {header}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,32%)]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="rounded-xl border bg-card p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold tabular-nums">
                {detail.purchase_order_sku?.trim() || tClaim("emptyCell")}
              </span>
              <span className={claimStatusPillClass(detail.status)}>
                {tClaim(`status.${detail.status}`)}
              </span>
            </div>
            <div className="mt-3 grid gap-2 border-t pt-3 text-sm sm:grid-cols-2">
              <span className="text-muted-foreground">{tClaim("colSupplier")}</span>
              <span className="sm:text-right">
                {detail.supplier_name?.trim() || tClaim("emptyCell")}
              </span>
              <span className="text-muted-foreground">{tClaim("colClaimDate")}</span>
              <span className="sm:text-right">
                {formatDateTime(detail.created_at, locale)}
              </span>
              <span className="text-muted-foreground">{tClaim("colRequester")}</span>
              <span className="sm:text-right">
                {detail.created_by_name?.trim() || tClaim("emptyCell")}
              </span>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <Package className="size-5 shrink-0 text-primary" aria-hidden />
              <h2 className="text-base font-semibold">{t("progressTitle")}</h2>
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">
                  {t("progressReceived")}
                </span>
                <span className="font-semibold tabular-nums">
                  {(detail.item?.qty ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">
                  {t("progressRemaining")}
                </span>
                <span className="font-semibold tabular-nums">
                  {detail.qty.toLocaleString()}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">
                  {t("progressReceivedValue")}
                </span>
                <span className="font-semibold tabular-nums">
                  {money(
                    (detail.item?.qty ?? 0) * (detail.item?.price_per_unit ?? 0),
                    locale
                  )}{" "}
                  {tClaim("currencySuffix")}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">
                  {t("progressTotalValue")}
                </span>
                <span className="font-bold tabular-nums">
                  {money(claimNetIncVat(detail), locale)} {tClaim("currencySuffix")}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <h2 className="mb-1 text-base font-semibold">{tClaim("itemsHeading")}</h2>
            <p className="mb-3 text-xs text-muted-foreground">{t("rowClickHint")}</p>
            <button
              type="button"
              className="flex w-full items-start gap-3 rounded-lg border bg-background p-3 text-left transition-colors hover:bg-muted/60"
              onClick={() => setPickerOpen(true)}
              disabled={!perms.update}
            >
              <AlertTriangle
                className="mt-0.5 size-4 shrink-0 text-warehouse-error-fg"
                aria-hidden
              />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate font-medium">
                  {detail.product_item_name?.trim() ||
                    detail.item?.name?.trim() ||
                    tClaim("emptyCell")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {`${tClaim(`issue.${detail.type}`)} · ${detail.qty.toLocaleString()} ${tClaim(
                    `unit.${detail.unit}`
                  )}`}
                </span>
                {detail.note.trim() ? (
                  <span className="text-xs text-muted-foreground">{detail.note}</span>
                ) : null}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {money(claimNetIncVat(detail), locale)}
              </span>
            </button>
          </div>
        </div>

        <div className="min-w-0">
          {panelResolution ? (
            <ClaimDocumentPanel
              detail={detail}
              resolution={panelResolution}
              noteProcess={noteProcess}
              onNoteProcessChange={setNoteProcess}
              submitting={submitting}
              onCancel={() => setPanelResolution(null)}
              onSaveDraft={() =>
                void save(
                  { resolution: panelResolution, note_process: noteProcess },
                  t("draftSaved")
                )
              }
              onConfirm={confirmDocument}
            />
          ) : (
            <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-card p-5 text-center">
              <h2 className="text-base font-semibold">{t("rightPanelTitle")}</h2>
              <p className="text-sm text-muted-foreground">{t("rightPanelEmpty")}</p>
            </div>
          )}
        </div>
      </div>

      {dialogs}
    </div>
  );
}
