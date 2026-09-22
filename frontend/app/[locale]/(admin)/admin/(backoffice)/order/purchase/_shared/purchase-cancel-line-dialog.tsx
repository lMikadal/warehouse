"use client";

import { Trash2 } from "lucide-react";
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
  OrderTicketApiError,
  patchTicketItemStatus,
  type TicketItemDetail,
} from "@/lib/order-ticket-api";

export type PurchaseCancelLineDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: number;
  lineItem: TicketItemDetail | null;
  onSuccess?: () => void;
};

export function PurchaseCancelLineDialog({
  open,
  onOpenChange,
  ticketId,
  lineItem,
  onSuccess,
}: PurchaseCancelLineDialogProps) {
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
    if (!lineItem) {
      toast.error(t("stopOrderingModal.missingProductItem"));
      return;
    }
    setSubmitting(true);
    try {
      await patchTicketItemStatus(
        locale,
        ticketId,
        lineItem.id,
        "rejected",
        trimmed
      );
      toast.success(t("cancelLineModal.success"));
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
            className="flex size-11 shrink-0 items-center justify-center rounded-md bg-rose-100 dark:bg-rose-950/50"
            aria-hidden
          >
            <Trash2 className="size-5 text-red-600 dark:text-red-400" />
          </div>
          <DialogHeader className="flex-1 gap-1 space-y-0 text-left">
            <DialogTitle className="text-base font-semibold">
              {t("considerModal.topics.cancel_line.title")}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {t("considerModal.topics.cancel_line.description")}
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="space-y-2 px-6 py-4">
          <label
            htmlFor="purchase-cancel-line-reason"
            className="text-sm font-medium"
          >
            {t("stopOrderingModal.reasonLabel")}
          </label>
          <Textarea
            id="purchase-cancel-line-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("cancelLineModal.reasonPlaceholder")}
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
