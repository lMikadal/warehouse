"use client";

import { Check, History, Split, Undo2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { CrudPageHeader } from "@/components/molecules/crud-page-header";
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
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useRouter } from "@/i18n/navigation";
import { useResourcePermissions } from "@/lib/admin-backoffice-actor-context";
import { type DisplayLocale } from "@/lib/format-datetime";
import {
  fetchPurchaseDetail,
  fetchPurchaseHistory,
  OrderPurchaseApiError,
  patchPurchaseItemStatus,
  patchPurchaseStatus,
  revertPurchaseItemUnit,
  type PurchaseDetail,
  type PurchaseItemDetail,
  type PurchaseStatus,
} from "@/lib/order-purchase-api";
import type { TicketHistoryEntry } from "@/lib/order-ticket-api";

import { TicketDetailPage } from "../../../sales/ticket/_shared/ticket-detail-page";
import { PurchaseConvertUnitDialog } from "./purchase-convert-unit-dialog";
import { PurchaseHistoryDialog } from "./purchase-history-dialog";
import { PurchaseItemsTable } from "./purchase-items-table";
import { PurchasePageFooter } from "./purchase-page-footer";
import { PurchaseSummaryCard } from "./purchase-summary-card";

/** v1 stepper on the approve screen; the PO's own status decides how far it has come. */
const APPROVAL_STEPS = [
  { key: "draft", labelKey: "stepDraft" },
  { key: "pending", labelKey: "stepPending" },
  { key: "pay", labelKey: "stepPay" },
  { key: "done", labelKey: "stepDone" },
] as const;

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

/** v1 approve screen: decide each line, then hand the whole PO to the payment step. */
export function PurchaseApprovePage({ purchaseId }: { purchaseId: number }) {
  const locale = useLocale() as DisplayLocale;
  const router = useRouter();
  const tPage = useTranslations("page.orderPurchase");
  const tApprove = useTranslations("page.orderPurchase.approve");
  const tDetail = useTranslations("page.orderPurchase.detail");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");
  const perms = useResourcePermissions("order", "order_purchase");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [detail, setDetail] = useState<PurchaseDetail | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<TicketHistoryEntry[]>([]);
  /** "revision" sends the PO back to the buyer; "cancel" kills it. Both need a reason. */
  const [reasonMode, setReasonMode] = useState<"revision" | "cancel" | null>(null);
  const [reason, setReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [convertTarget, setConvertTarget] = useState<PurchaseItemDetail | null>(null);

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

  const setItemStatus = async (
    itemId: number,
    status: "approved" | "rejected"
  ) => {
    setSubmitting(true);
    try {
      await patchPurchaseItemStatus(locale, purchaseId, itemId, status);
      await load();
    } catch (e) {
      toast.error(
        e instanceof OrderPurchaseApiError ? e.message : tError("saveFailed")
      );
    } finally {
      setSubmitting(false);
    }
  };

  /** Undo a split: the child line is removed and its quantity goes back onto the parent. */
  const revertConvert = async (itemId: number) => {
    setSubmitting(true);
    try {
      await revertPurchaseItemUnit(locale, purchaseId, itemId);
      toast.success(tApprove("revertConvertUnitSuccess"));
      await load();
    } catch (e) {
      toast.error(
        e instanceof OrderPurchaseApiError ? e.message : tError("saveFailed")
      );
    } finally {
      setSubmitting(false);
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
      await patchPurchaseStatus(locale, purchaseId, "paying", remarks.trim() || undefined);
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

  // Once the PO leaves pending the decisions are locked; the screen stays readable as a record.
  const locked = detail.status !== "pending";
  const currentStep = approvalStepIndex(detail.status);
  const allRejected =
    detail.items.length > 0 &&
    detail.items.every((item) => item.status === "rejected");

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 pb-20">
      <CrudPageHeader
        title={tApprove("pageTitle")}
        description={detail.sku?.trim() || detail.sku_draft?.trim() || ""}
      />

      {allRejected ? (
        <p className="rounded-md border border-warehouse-error-border bg-warehouse-error-bg p-3 text-sm text-warehouse-error-fg">
          {tApprove("allLinesRejected")}
        </p>
      ) : null}

      <Card className="shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {tApprove("approvalStepsTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
            {APPROVAL_STEPS.map((step, index) => {
              const reached = index <= currentStep;
              const current = index === currentStep;
              return (
                <li key={step.key} className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums",
                      reached
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-muted text-muted-foreground"
                    )}
                    aria-hidden
                  >
                    {index + 1}
                  </span>
                  <span
                    className={cn(
                      "text-sm",
                      reached ? "font-medium text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {tApprove(step.labelKey)}
                  </span>
                  {current ? (
                    <Badge variant="secondary" className="text-xs">
                      {tApprove("stepCurrentBadge")}
                    </Badge>
                  ) : null}
                  {index < APPROVAL_STEPS.length - 1 ? (
                    <span className="mx-1 h-px w-6 bg-border" aria-hidden />
                  ) : null}
                </li>
              );
            })}
          </ol>
          {locked ? (
            <p className="text-sm text-muted-foreground">
              {tApprove("approveLockedHint")}
            </p>
          ) : (
            <div className="grid gap-1">
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

      <div className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">
          {tDetail("itemsHeading", { count: detail.items.length })}
        </h2>
        <PurchaseItemsTable
          items={detail.items}
          actionsHeader={tApprove("colAction")}
          renderActions={(item) =>
            locked ? (
              <span className="text-muted-foreground">
                {tPage(`itemStatus.${item.status}`)}
              </span>
            ) : (
              <>
                <ButtonIcon
                  type="button"
                  variant="outline"
                  tone="add"
                  size="sm"
                  disabled={submitting || item.status === "approved"}
                  aria-label={tApprove("ariaApproveItem")}
                  onClick={() => void setItemStatus(item.id, "approved")}
                >
                  <Check className="text-current" />
                </ButtonIcon>
                <ButtonIcon
                  type="button"
                  variant="outline"
                  tone="delete"
                  size="sm"
                  disabled={submitting || item.status === "rejected"}
                  aria-label={tApprove("ariaRejectItem")}
                  onClick={() => void setItemStatus(item.id, "rejected")}
                >
                  <X className="text-current" />
                </ButtonIcon>
                {item.parent_id == null ? (
                  <ButtonIcon
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={submitting || item.qty < 1}
                    aria-label={tApprove("convertUnitTitle")}
                    onClick={() => setConvertTarget(item)}
                  >
                    <Split className="text-current" />
                  </ButtonIcon>
                ) : (
                  <ButtonIcon
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={submitting}
                    aria-label={tApprove("revertConvertUnit")}
                    onClick={() => void revertConvert(item.id)}
                  >
                    <Undo2 className="text-current" />
                  </ButtonIcon>
                )}
              </>
            )
          }
        />
      </div>
        </TabsContent>

        {detail.purchase_request_id ? (
          <TabsContent value="request">
            <TicketDetailPage ticketId={detail.purchase_request_id} embedded />
          </TabsContent>
        ) : (
          <p className="text-sm text-muted-foreground">
            {tApprove("noLinkedRequest")}
          </p>
        )}
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

      <PurchaseConvertUnitDialog
        purchaseId={purchaseId}
        item={convertTarget}
        onOpenChange={(open) => !open && setConvertTarget(null)}
        onConverted={() => void load()}
      />

      <PurchaseHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        entries={history}
      />

      <PurchasePageFooter>
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
            <Button
              type="button"
              disabled={submitting || allRejected}
              onClick={() => void approveOrder()}
            >
              {tApprove("confirmButton")}
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
      </PurchasePageFooter>
    </div>
  );
}
