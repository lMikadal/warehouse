"use client";

import {
  ArrowLeftRight,
  Box,
  ChevronRight,
  CircleX,
  Handshake,
  Info,
  Tag,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type PurchaseConsiderTopic =
  | "compare_prices"
  | "select_partner"
  | "change_brand"
  | "out_of_stock_wait"
  | "cancel_line"
  | "stop_ordering";

export type PurchaseConsiderTopicsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTopicSelect: (topic: PurchaseConsiderTopic) => void;
  visibleTopics?: PurchaseConsiderTopic[];
};

type TopicVisual = {
  topic: PurchaseConsiderTopic;
  icon: ReactNode;
  iconWrap: string;
};

const TOPIC_VISUALS: TopicVisual[] = [
  {
    topic: "compare_prices",
    icon: <Tag className="size-5 text-sky-600 dark:text-sky-400" />,
    iconWrap: "bg-sky-100 dark:bg-sky-950/60",
  },
  {
    topic: "select_partner",
    icon: <Handshake className="size-5 text-amber-700 dark:text-amber-400" />,
    iconWrap: "bg-amber-100 dark:bg-amber-950/50",
  },
  {
    topic: "change_brand",
    icon: (
      <ArrowLeftRight className="size-5 text-violet-600 dark:text-violet-400" />
    ),
    iconWrap: "bg-violet-100 dark:bg-violet-950/55",
  },
  {
    topic: "out_of_stock_wait",
    icon: <Box className="size-5 text-orange-600 dark:text-orange-400" />,
    iconWrap: "bg-orange-100 dark:bg-orange-950/50",
  },
  {
    topic: "cancel_line",
    icon: <Trash2 className="size-5 text-red-600 dark:text-red-400" />,
    iconWrap: "bg-red-100 dark:bg-red-950/50",
  },
  {
    topic: "stop_ordering",
    icon: <CircleX className="size-5 text-teal-600 dark:text-teal-400" />,
    iconWrap: "bg-teal-100 dark:bg-teal-950/55",
  },
];

export function PurchaseConsiderTopicsDialog({
  open,
  onOpenChange,
  onTopicSelect,
  visibleTopics,
}: PurchaseConsiderTopicsDialogProps) {
  const t = useTranslations("page.orderPurchase.receive.considerModal");

  const topicRows = useMemo(() => {
    if (visibleTopics?.length) {
      const out: TopicVisual[] = [];
      for (const topic of visibleTopics) {
        const row = TOPIC_VISUALS.find((v) => v.topic === topic);
        if (row) out.push(row);
      }
      return out;
    }
    return TOPIC_VISUALS;
  }, [visibleTopics]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <div className="space-y-1 border-b border-border px-6 pt-6 pb-4 pr-14">
          <DialogHeader className="gap-1.5 space-y-0 text-left">
            <DialogTitle className="text-base font-semibold">
              {t("title")}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {t("subtitle")}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="max-h-[min(60vh,22rem)] space-y-2 overflow-y-auto px-6 py-4">
          {topicRows.map(({ topic, icon, iconWrap }) => (
            <button
              key={topic}
              type="button"
              onClick={() => {
                onTopicSelect(topic);
                onOpenChange(false);
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border border-border bg-card px-3 py-3 text-left",
                "transition-colors hover:bg-muted/40",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
            >
              <div
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-md",
                  iconWrap
                )}
              >
                {icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {t(`topics.${topic}.title`)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t(`topics.${topic}.description`)}
                </p>
              </div>
              <ChevronRight
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-xs text-muted-foreground sm:max-w-[65%]">
            <Info
              className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
              aria-hidden
            />
            {t("footerNote")}
          </p>
          <Button
            type="button"
            variant="outline"
            className="shrink-0 sm:min-w-24"
            onClick={() => onOpenChange(false)}
          >
            {t("btnClose")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
