"use client";

import { ClipboardList, CircleHelp } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type QuotationAcceptPanelMode = "payment" | "credit";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (mode: QuotationAcceptPanelMode) => void;
};

/** Centered choose-format dialog only; payment/credit continue in the right panel. */
export function QuotationAcceptDialog({
  open,
  onOpenChange,
  onSelect,
}: Props) {
  const tAccept = useTranslations("page.orderQuotation.acceptModal");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader className="items-center text-center sm:text-center">
          <span
            className="bg-primary/15 text-primary relative mb-2 flex size-14 items-center justify-center rounded-full"
            aria-hidden
          >
            <ClipboardList className="size-7" />
            <span className="bg-primary text-primary-foreground absolute -right-0.5 -bottom-0.5 flex size-5 items-center justify-center rounded-full">
              <CircleHelp className="size-3" />
            </span>
          </span>
          <DialogTitle className="text-primary text-base">
            {tAccept("title")}
          </DialogTitle>
          <p className="text-muted-foreground text-sm">{tAccept("hint")}</p>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-center">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => onSelect("credit")}
          >
            {tAccept("credit")}
          </Button>
          <Button
            type="button"
            size="lg"
            onClick={() => onSelect("payment")}
          >
            {tAccept("payment")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
