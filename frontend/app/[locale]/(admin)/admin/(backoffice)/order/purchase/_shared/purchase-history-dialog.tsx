"use client";

import { useLocale, useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type DisplayLocale, formatDateTime } from "@/lib/format-datetime";
import type { TicketHistoryEntry } from "@/lib/order-ticket-api";

export type PurchaseHistoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: TicketHistoryEntry[];
};

/** purchase_history feed, shared by the PO detail/approve/payment screens. */
export function PurchaseHistoryDialog({
  open,
  onOpenChange,
  entries,
}: PurchaseHistoryDialogProps) {
  const locale = useLocale() as DisplayLocale;
  const tDetail = useTranslations("page.orderPurchase.detail");
  const tError = useTranslations("error");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{tDetail("historyTitle")}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-3 overflow-y-auto">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">{tError("noData")}</p>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="rounded-md border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{entry.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(entry.created_at, locale)}
                  </p>
                </div>
                {entry.description ? (
                  <p className="mt-1 text-muted-foreground">
                    {entry.description}
                  </p>
                ) : null}
                {entry.created_by_name ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {entry.created_by_name}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
