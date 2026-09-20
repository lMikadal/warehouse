"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export type DeliveryType = "store" | "parking" | "delivery";

export type ShippingDraft = {
  type: DeliveryType;
  date: string;
  time: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: ShippingDraft;
  onDraftChange: (next: ShippingDraft) => void;
  onConfirm: () => void;
};

export function StoreShippingDialog({
  open,
  onOpenChange,
  draft,
  onDraftChange,
  onConfirm,
}: Props) {
  const tPage = useTranslations("page.orderStore.form");
  const tCrud = useTranslations("crud");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{tPage("shippingEdit")}</DialogTitle>
        </DialogHeader>
        <RadioGroup
          value={draft.type}
          onValueChange={(v) =>
            onDraftChange({ ...draft, type: v as DeliveryType })
          }
          className="gap-3"
        >
          {(
            [
              ["store", "shippingStore"],
              ["parking", "shippingParking"],
              ["delivery", "shippingDelivery"],
            ] as const
          ).map(([value, labelKey]) => (
            <div key={value} className="flex items-center gap-2">
              <RadioGroupItem value={value} id={`ship-${value}`} />
              <Label htmlFor={`ship-${value}`}>{tPage(labelKey)}</Label>
            </div>
          ))}
        </RadioGroup>
        {draft.type === "delivery" ? (
          <div className="grid gap-3">
            <div className="grid gap-1">
              <Label htmlFor="ship-date">{tPage("shippingDate")}</Label>
              <Input
                id="ship-date"
                type="date"
                value={draft.date}
                onChange={(e) =>
                  onDraftChange({ ...draft, date: e.target.value })
                }
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="ship-time">{tPage("shippingTime")}</Label>
              <Input
                id="ship-time"
                type="time"
                value={draft.time}
                onChange={(e) =>
                  onDraftChange({ ...draft, time: e.target.value })
                }
              />
            </div>
          </div>
        ) : null}
        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {tCrud("btn.cancel")}
          </Button>
          <Button type="button" onClick={onConfirm}>
            {tCrud("btn.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
