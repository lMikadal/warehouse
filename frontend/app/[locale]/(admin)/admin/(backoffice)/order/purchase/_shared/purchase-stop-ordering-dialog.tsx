"use client";

import { CircleX } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  createTicketItemReject,
  OrderTicketApiError,
  type TicketItemDetail,
} from "@/lib/order-ticket-api";
import { patchProductItemStopped } from "@/lib/product-list-api";

export type PurchaseStopOrderingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: number;
  lineItem: TicketItemDetail | null;
  onSuccess?: () => void;
};

export function PurchaseStopOrderingDialog({
  open,
  onOpenChange,
  ticketId,
  lineItem,
  onSuccess,
}: PurchaseStopOrderingDialogProps) {
  const locale = useLocale();
  const t = useTranslations("page.orderPurchase.receive");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");

  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setReason("");
      setSubmitting(false);
    }
  }, [open]);

  async function handleSubmit() {
    const trimmed = reason.trim();
    if (!trimmed) {
      toast.error(t("stopOrderingModal.reasonRequired"));
      return;
    }
    const productItemId = lineItem?.product_item_id;
    if (!lineItem || !productItemId) {
      toast.error(t("stopOrderingModal.missingProductItem"));
      return;
    }
    setSubmitting(true);
    try {
      await createTicketItemReject(locale, ticketId, lineItem.id, {
        type: "stop",
        note: trimmed,
      });
      await patchProductItemStopped(productItemId, true);
      toast.success(t("stopOrderingModal.success"));
      onOpenChange(false);
      onSuccess?.();
    } catch (e) {
      toast.error(
        e instanceof OrderTicketApiError ? e.message : tError("saveFailed")
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="flex gap-3 border-b border-border px-6 pt-6 pb-4 pr-14">
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-md bg-sky-100 dark:bg-sky-950/60"
            aria-hidden
          >
            <CircleX className="size-5 text-sky-600 dark:text-sky-400" />
          </div>
          <DialogHeader className="flex-1 gap-1 space-y-0 text-left">
            <DialogTitle className="text-base font-semibold">
              {t("considerModal.topics.stop_ordering.title")}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {t("considerModal.topics.stop_ordering.description")}
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="space-y-2 px-6 py-4">
          <label
            htmlFor="purchase-stop-ordering-reason"
            className="text-sm font-medium"
          >
            {t("stopOrderingModal.reasonLabel")}
          </label>
          <Textarea
            id="purchase-stop-ordering-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("stopOrderingModal.reasonPlaceholder")}
            disabled={submitting}
            rows={4}
            className="min-h-28 resize-y"
          />
        </div>
        <DialogFooter className="border-t border-border px-6 py-4 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
          >
            {tCrud("btn.cancel")}
          </Button>
          <Button type="button" disabled={submitting} onClick={handleSubmit}>
            {t("stopOrderingModal.submitRequest")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
