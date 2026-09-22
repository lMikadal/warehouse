"use client";

import {
  ChevronRight,
  ClipboardCheck,
  ShieldAlert,
  XCircle,
  type LucideIcon,
} from "lucide-react";
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
import { CLAIM_WRITE_OFF } from "@/lib/order-claim-api";
import type { ReceiveRejectResolution } from "@/lib/order-receive-api";

const TOPIC_ICON: Record<
  ReceiveRejectResolution,
  { Icon: LucideIcon; iconBox: string }
> = {
  return: {
    Icon: ClipboardCheck,
    iconBox:
      "flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary",
  },
  claim: {
    Icon: ShieldAlert,
    iconBox:
      "flex size-10 shrink-0 items-center justify-center rounded-md bg-warehouse-warning-bg text-warehouse-warning-fg",
  },
  accept_loss: {
    Icon: XCircle,
    iconBox:
      "flex size-10 shrink-0 items-center justify-center rounded-md bg-warehouse-error-bg text-warehouse-error-fg",
  },
};

/** v1 order: return, claim, then writing the loss off. */
const TOPIC_ORDER: ReceiveRejectResolution[] = ["return", "claim", CLAIM_WRITE_OFF];

export function ClaimTypePickerDialog({
  open,
  onOpenChange,
  activeResolution,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Already chasing a claim? Then returning is off the table, and the other way round. */
  activeResolution?: ReceiveRejectResolution | null;
  onSelect: (resolution: ReceiveRejectResolution) => void;
}) {
  const t = useTranslations("page.orderClaim.edit.typePicker");
  const tCrud = useTranslations("crud");

  const topics = TOPIC_ORDER.filter((topic) => {
    if (topic === CLAIM_WRITE_OFF) return true;
    if (activeResolution === "claim") return topic !== "return";
    if (activeResolution === "return") return topic !== "claim";
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("subtitle")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {topics.map((topic) => {
            const { Icon, iconBox } = TOPIC_ICON[topic];
            return (
              <button
                key={topic}
                type="button"
                className="flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-muted/60"
                onClick={() => onSelect(topic)}
              >
                <div className={iconBox} aria-hidden>
                  <Icon className="size-5" strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{t(`topics.${topic}.title`)}</div>
                  <div className="text-sm text-muted-foreground">
                    {activeResolution && topic !== CLAIM_WRITE_OFF
                      ? t(`topics.${activeResolution}.title`)
                      : t(`topics.${topic}.description`)}
                  </div>
                </div>
                <ChevronRight
                  className="size-5 shrink-0 text-muted-foreground"
                  strokeWidth={1.5}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {tCrud("btn.cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
