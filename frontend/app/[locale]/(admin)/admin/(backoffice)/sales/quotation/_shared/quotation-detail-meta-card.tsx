"use client";

import { ClipboardList } from "lucide-react";
import { useTranslations } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  formatDate,
  type DisplayLocale,
} from "@/lib/format-datetime";
import { cn } from "@/lib/utils";

type Props = {
  locale: DisplayLocale;
  issueDate?: string | null;
  validUntil?: string | null;
  sellerName?: string | null;
  reserveStock: boolean;
  notes?: string | null;
  layout?: "stacked" | "split";
};

export function QuotationDetailMetaCard({
  locale,
  issueDate,
  validUntil,
  sellerName,
  reserveStock,
  notes,
  layout = "stacked",
}: Props) {
  const tPage = useTranslations("page.orderQuotation");
  const tForm = useTranslations("page.orderQuotation.form");
  const isSplit = layout === "split";

  const issueDisplay = issueDate?.trim()
    ? formatDate(issueDate, locale)
    : "—";
  const validDisplay = validUntil?.trim()
    ? formatDate(validUntil, locale)
    : "—";

  return (
    <Card
      className={cn(
        "flex w-full min-w-0 flex-col",
        isSplit &&
          "sticky top-4 z-10 max-h-[calc(100svh-3.5rem-1rem-1.5rem)] w-full min-w-[400px] self-start"
      )}
    >
      <CardHeader className="shrink-0">
        <CardTitle className="flex items-center gap-3 text-base">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-500/15 text-green-600 dark:text-green-400"
            aria-hidden
          >
            <ClipboardList className="size-5" aria-hidden />
          </span>
          {tPage("detail.metaTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <span className="text-muted-foreground text-sm">
              {tForm("issueDate")}
            </span>
            <span className="text-sm font-medium tabular-nums">{issueDisplay}</span>
          </div>
          <div className="grid gap-1">
            <span className="text-muted-foreground text-sm">
              {tForm("validUntil")}
            </span>
            <span className="text-sm font-medium tabular-nums">{validDisplay}</span>
          </div>
        </div>
        <div className="grid gap-1">
          <span className="text-primary text-sm font-medium">
            {tPage("detail.seller")}
          </span>
          <span className="text-muted-foreground text-sm">
            {sellerName?.trim() || "—"}
          </span>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={reserveStock} disabled />
          {tForm("reserveStock")}
        </label>
        {notes?.trim() ? (
          <div className="grid gap-1">
            <Label className="text-muted-foreground">{tForm("notes")}</Label>
            <p className="text-sm whitespace-pre-wrap">{notes.trim()}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
