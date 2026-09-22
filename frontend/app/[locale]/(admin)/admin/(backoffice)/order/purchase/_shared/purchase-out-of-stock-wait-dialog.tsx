"use client";

import { Box } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createTicketItemReject,
  OrderTicketApiError,
  type TicketItemDetail,
} from "@/lib/order-ticket-api";

export type PurchaseOutOfStockWaitDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: number;
  lineItem: TicketItemDetail | null;
  onSuccess?: () => void;
};

export function PurchaseOutOfStockWaitDialog({
  open,
  onOpenChange,
  ticketId,
  lineItem,
  onSuccess,
}: PurchaseOutOfStockWaitDialogProps) {
  const locale = useLocale();
  const t = useTranslations("page.orderPurchase.receive");
  const tCrud = useTranslations("crud");
  const tError = useTranslations("error");

  const [followUpDate, setFollowUpDate] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setFollowUpDate("");
      setNote("");
      setSubmitting(false);
    }
  }, [open]);

  async function handleSubmit() {
    if (!followUpDate.trim()) {
      toast.error(t("outOfStockWaitModal.dateRequired"));
      return;
    }
    if (!lineItem) {
      toast.error(t("outOfStockWaitModal.loadError"));
      return;
    }
    setSubmitting(true);
    try {
      await createTicketItemReject(locale, ticketId, lineItem.id, {
        type: "wait",
        note: note.trim() || followUpDate,
        date: followUpDate,
      });
      toast.success(t("outOfStockWaitModal.saveSuccess"));
      onOpenChange(false);
      onSuccess?.();
    } catch (e) {
      toast.error(
        e instanceof OrderTicketApiError
          ? e.message
          : t("outOfStockWaitModal.saveFailed")
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
            className="flex size-11 shrink-0 items-center justify-center rounded-md bg-orange-100 dark:bg-orange-950/50"
            aria-hidden
          >
            <Box className="size-5 text-orange-600 dark:text-orange-400" />
          </div>
          <DialogHeader className="flex-1 gap-1 space-y-0 text-left">
            <DialogTitle className="text-base font-semibold">
              {t("considerModal.topics.out_of_stock_wait.title")}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {t("considerModal.topics.out_of_stock_wait.description")}
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="space-y-3 px-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="purchase-oos-followup">
              {t("outOfStockWaitModal.followUpDateLabel")}
            </Label>
            <Input
              id="purchase-oos-followup"
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              disabled={submitting}
              placeholder={t("outOfStockWaitModal.pickDate")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="purchase-oos-note">
              {t("outOfStockWaitModal.noteLabel")}
            </Label>
            <Textarea
              id="purchase-oos-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("outOfStockWaitModal.notePlaceholder")}
              disabled={submitting}
              rows={3}
            />
          </div>
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
