"use client";

import { MapPin, Package, Store, Truck, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

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

const SHIPPING_OPTIONS: {
  value: DeliveryType;
  labelKey: "shippingStore" | "shippingParking" | "shippingDelivery";
  descKey: "shippingStoreDesc" | "shippingParkingDesc" | "shippingDeliveryDesc";
  Icon: LucideIcon;
}[] = [
  {
    value: "store",
    labelKey: "shippingStore",
    descKey: "shippingStoreDesc",
    Icon: Store,
  },
  {
    value: "parking",
    labelKey: "shippingParking",
    descKey: "shippingParkingDesc",
    Icon: Truck,
  },
  {
    value: "delivery",
    labelKey: "shippingDelivery",
    descKey: "shippingDeliveryDesc",
    Icon: MapPin,
  },
];

export function StoreShippingDialog({
  open,
  onOpenChange,
  draft,
  onDraftChange,
  onConfirm,
}: Props) {
  const tForm = useTranslations("page.orderStore.form");
  const tPage = useTranslations("page.orderStore");
  const tCrud = useTranslations("crud");
  const tField = useTranslations("form");

  const handleConfirm = () => {
    if (!draft.date.trim()) return;
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-4">
        <DialogHeader className="gap-3 sm:text-left">
          <div className="flex items-start gap-3">
            <div className="min-w-0 space-y-1">
              <DialogTitle>{tForm("shippingEdit")}</DialogTitle>
              <DialogDescription>{tForm("shippingEditHint")}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <RadioGroup
          value={draft.type}
          onValueChange={(v) =>
            onDraftChange({ ...draft, type: v as DeliveryType })
          }
          className="gap-2"
        >
          {SHIPPING_OPTIONS.map(({ value, labelKey, descKey, Icon }) => {
            const id = `ship-${value}`;
            const selected = draft.type === value;
            return (
              <label
                key={value}
                htmlFor={id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors",
                  selected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/40",
                )}
              >
                <RadioGroupItem
                  value={value}
                  id={id}
                  className="shrink-0"
                  aria-labelledby={`${id}-title`}
                  aria-describedby={`${id}-desc`}
                />
                <span
                  className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg"
                  aria-hidden
                >
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p id={`${id}-title`} className="font-medium leading-snug">
                    {tForm(labelKey)}
                  </p>
                  <p
                    id={`${id}-desc`}
                    className="text-muted-foreground text-sm leading-snug"
                  >
                    {tForm(descKey)}
                  </p>
                </div>
              </label>
            );
          })}
        </RadioGroup>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <Label htmlFor="ship-date">{tForm("shippingDate")}</Label>
            <Input
              id="ship-date"
              type="date"
              required
              value={draft.date}
              placeholder={tField("placeholder.input", {
                label: tForm("shippingDate"),
              })}
              onChange={(e) =>
                onDraftChange({ ...draft, date: e.target.value })
              }
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="ship-time">{tForm("shippingTime")}</Label>
            <Input
              id="ship-time"
              type="time"
              value={draft.time}
              placeholder={tField("placeholder.input", {
                label: tForm("shippingTime"),
              })}
              onChange={(e) =>
                onDraftChange({ ...draft, time: e.target.value })
              }
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {tCrud("btn.cancel")}
          </Button>
          <Button
            type="button"
            disabled={!draft.date.trim()}
            onClick={handleConfirm}
          >
            {tPage("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
